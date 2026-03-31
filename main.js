const { app, BrowserWindow, BrowserView, ipcMain, session, components, shell, safeStorage } = require('electron');
const fs = require('fs');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
const path = require('path');
const { WebSocketServer } = require('ws');
const prism = require('prism-media');
const discordVoice = require('./discord-voice');

const PRELOAD = path.join(__dirname, 'preload.js');
const CAPTURE_PRELOAD = path.join(__dirname, 'capture-preload.js');
const CAPTURE_HTML = path.join(__dirname, 'capture', 'index.html');
const UI_HTML = path.join(__dirname, 'ui', 'index.html');
const ICON = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.ico')
  : path.join(__dirname, 'build', 'icon.ico');

let mainWindow = null;
let tabs = [];
let activeTabIndex = 0;
let captureWindow = null;
let wss = null;
let opusEncoder = null;
let resizeTid = null;
let captureGain = 1.0;

const TOOLBAR_HEIGHT = 56;
const TAB_BAR_HEIGHT = 36;
const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED = 48;
let panelWidth = SIDEBAR_WIDTH;
const SAMPLE_RATE = 48000;
const NUM_CHANNELS = 2;
const FRAME_SIZE = 960 * 2;

function getTokenPath() {
  return path.join(app.getPath('userData'), 'bot-token.enc');
}

function saveTokenSecure(token) {
  try {
    const p = getTokenPath();
    if (!token) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return;
    }
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(p, safeStorage.encryptString(token));
    } else {
      fs.writeFileSync(p, token, 'utf8');
    }
  } catch (e) {
    console.error('[token] save failed:', e);
  }
}

function loadTokenSecure() {
  try {
    const p = getTokenPath();
    if (!fs.existsSync(p)) return '';
    const data = fs.readFileSync(p);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data);
    }
    return data.toString('utf8');
  } catch {
    return '';
  }
}

function makeBrowserView(url) {
  const sharedSession = session.fromPartition('persist:terpsichora');
  const bv = new BrowserView({
    webPreferences: {
      session: sharedSession,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      plugins: true,
      sandbox: false,
    },
  });
  bv.webContents.setBackgroundThrottling(false);
  bv.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    const view = tabs[activeTabIndex]?.view;
    if (!view?.webContents || !openUrl || (!openUrl.startsWith('http://') && !openUrl.startsWith('https://'))) {
      return { action: 'deny' };
    }
    const loadUrl = openUrl.includes('open.spotify.com/embed/') ? openUrl.replace('/embed/', '/') : openUrl;
    view.webContents.loadURL(loadUrl);
    return { action: 'deny' };
  });
  bv.webContents.loadURL(url);

  const updateUrl = () => {
    const currentUrl = bv.webContents.getURL();
    const t = tabs.find((x) => x.view === bv);
    if (t) t.url = currentUrl;
    const idx = tabs.findIndex((x) => x.view === bv);
    if (mainWindow && idx >= 0) {
      mainWindow.webContents.send('browser:tab-url-changed', idx, currentUrl);
      if (idx === activeTabIndex) mainWindow.webContents.send('browser:url-changed', currentUrl);
    }
  };
  bv.webContents.on('did-navigate-in-page', updateUrl);
  bv.webContents.on('did-navigate', updateUrl);

  bv.webContents.on('did-finish-load', () => {
    const idx = tabs.findIndex((x) => x.view === bv);
    if (idx >= 0 && mainWindow) {
      bv.webContents.executeJavaScript(
        `(()=>{const l=document.querySelector("link[rel*='icon']");return l?l.href:''})()`
      ).then((favicon) => {
        if (mainWindow) mainWindow.webContents.send('browser:tab-favicon', idx, favicon);
      }).catch(() => {});
    }
  });

  return bv;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    title: 'Terpsichora v1.0.3',
    icon: ICON,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0a0a0a',
    show: false,
  });

  mainWindow.setMaxListeners(30);
  mainWindow.loadFile(UI_HTML);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    if (resizeTid) clearTimeout(resizeTid);
    resizeTid = null;
    mainWindow = null;
    tabs = [];
    destroyCaptureWindow();
  });

  createTabs();

  discordVoice.onStateChange((status) => {
    if (mainWindow) mainWindow.webContents.send('voice:state-changed', status);
  });
}

function createTabs() {
  if (!mainWindow) return;
  const sharedSession = session.fromPartition('persist:terpsichora');
  sharedSession.setUserAgent(sharedSession.getUserAgent().replace(/\s*Electron\/[\d.]+/gi, ''));

  const bv = makeBrowserView('https://www.youtube.com');
  tabs.push({ view: bv, url: 'https://www.youtube.com' });
  mainWindow.addBrowserView(bv);
  setTabsBounds();
  showTab(0);

  mainWindow.on('resize', () => {
    if (resizeTid) clearTimeout(resizeTid);
    resizeTid = setTimeout(() => {
      resizeTid = null;
      if (mainWindow && tabs.length) setTabsBounds();
    }, 16);
  });
}

function showTab(index) {
  activeTabIndex = index;
  tabs.forEach((t) => t.view.setBounds({ x: 0, y: 0, width: 0, height: 0 }));
  if (mainWindow && tabs.length) setTabsBounds();
}

function setTabsBounds() {
  if (!mainWindow || !tabs.length) return;
  const [contentW, contentH] = mainWindow.getContentSize();
  const y = TOOLBAR_HEIGHT + TAB_BAR_HEIGHT;
  const x = panelWidth;
  const w = Math.max(200, contentW - panelWidth);
  const h = Math.max(200, contentH - y);
  tabs.forEach((t, i) => {
    t.view.setBounds(i === activeTabIndex ? { x, y, width: w, height: h } : { x: 0, y: 0, width: 0, height: 0 });
  });
}

let wsClient = null;

function createCaptureWindow() {
  if (captureWindow) return;

  wss = new WebSocketServer({ port: 0, perMessageDeflate: false });

  captureWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: CAPTURE_PRELOAD,
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  captureWindow.webContents.loadFile(CAPTURE_HTML);

  wss.on('connection', (ws) => {
    ws.binaryType = 'nodebuffer';
    wsClient = ws;

    ws.on('message', (data) => {
      if (!opusEncoder) return;
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      opusEncoder.write(buf);
    });

    ws.on('close', () => { wsClient = null; });
  });
}

function destroyCaptureWindow() {
  wsClient = null;
  if (captureWindow) { captureWindow.close(); captureWindow = null; }
  if (wss) { wss.close(); wss = null; }
  if (opusEncoder) { opusEncoder.end(); opusEncoder = null; }
}

function startAudioCapture() {
  if (!tabs.length || !captureWindow) return;

  const mediaSourceIds = tabs
    .map((t) => t.view.webContents.getMediaSourceId(captureWindow.webContents))
    .filter(Boolean);

  if (mediaSourceIds.length === 0) return;

  opusEncoder = new prism.opus.Encoder({
    channels: NUM_CHANNELS,
    frameSize: FRAME_SIZE / NUM_CHANNELS,
    rate: SAMPLE_RATE,
  });

  opusEncoder.on('error', (err) => {
    console.error('[opus] encoder error:', err);
  });

  discordVoice.playOpusStream(opusEncoder);

  const wsAddress = wss.address();
  captureWindow.webContents.send('START_CAPTURE', {
    mediaSourceIds,
    wsPort: wsAddress.port,
    sampleRate: SAMPLE_RATE,
    channels: NUM_CHANNELS,
    frameSize: FRAME_SIZE,
    gain: captureGain,
  });
}

function stopAudioCapture() {
  if (captureWindow) captureWindow.webContents.send('STOP_CAPTURE');
  if (opusEncoder) { opusEncoder.end(); opusEncoder = null; }
}

function getActiveView() {
  return tabs[activeTabIndex]?.view;
}

ipcMain.handle('panel:toggle', (_, open) => {
  panelWidth = open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;
  if (mainWindow && tabs.length) setTabsBounds();
});

ipcMain.handle('browser:load', (_, url) => {
  const view = getActiveView();
  if (!view?.webContents) return;
  let u = url.trim();
  if (!u.startsWith('http')) u = 'https://' + u;
  view.webContents.loadURL(u);
  tabs[activeTabIndex].url = u;
});

ipcMain.handle('browser:go-back', () => {
  const view = getActiveView();
  if (view?.webContents?.canGoBack()) view.webContents.goBack();
});

ipcMain.handle('browser:go-forward', () => {
  const view = getActiveView();
  if (view?.webContents?.canGoForward()) view.webContents.goForward();
});

ipcMain.handle('browser:reload', () => {
  const view = getActiveView();
  if (view) view.webContents.reload();
});

ipcMain.handle('browser:switch-tab', (_, index) => {
  if (index >= 0 && index < tabs.length) {
    showTab(index);
  }
});

ipcMain.handle('browser:add-tab', async () => {
  if (!mainWindow) return -1;
  const bv = makeBrowserView('about:blank');
  const newIndex = tabs.length;
  tabs.push({ view: bv, url: 'about:blank' });
  mainWindow.addBrowserView(bv);
  showTab(newIndex);
  setTabsBounds();
  mainWindow.webContents.send('browser:tabs-updated', tabs.length, newIndex);
  if (discordVoice.isConnected() && captureWindow) {
    stopAudioCapture();
    startAudioCapture();
  }
  return newIndex;
});

ipcMain.handle('browser:remove-tab', (_, index) => {
  if (index < 0 || index >= tabs.length || tabs.length <= 1) return false;
  const [removed] = tabs.splice(index, 1);
  mainWindow.removeBrowserView(removed.view);
  removed.view.webContents.destroy();
  if (activeTabIndex === index) {
    activeTabIndex = Math.min(index, tabs.length - 1);
  } else if (activeTabIndex > index) {
    activeTabIndex--;
  }
  showTab(activeTabIndex);
  if (mainWindow && tabs.length) setTabsBounds();
  mainWindow.webContents.send('browser:tabs-updated', tabs.length, activeTabIndex);
  if (discordVoice.isConnected() && captureWindow) {
    stopAudioCapture();
    startAudioCapture();
  }
  return true;
});

ipcMain.handle('browser:tab-count', () => tabs.length);
ipcMain.handle('browser:get-tab-urls', () => tabs.map((t) => t.url));
ipcMain.handle('browser:active-tab-index', () => activeTabIndex);

ipcMain.handle('browser:active-url', () => {
  const t = tabs[activeTabIndex];
  return t?.view?.webContents?.getURL() || t?.url || '';
});

ipcMain.handle('bot:connect', async (_, token) => {
  await discordVoice.connectBot(token);
  return true;
});

ipcMain.handle('bot:disconnect', () => {
  stopAudioCapture();
  destroyCaptureWindow();
  discordVoice.disconnectBot();
});

ipcMain.handle('bot:guilds', async () => {
  return await discordVoice.fetchGuilds();
});

ipcMain.handle('bot:status', () => ({
  botReady: discordVoice.isBotReady(),
  voiceConnected: discordVoice.isConnected(),
}));

ipcMain.handle('voice:join', async (_, channelId) => {
  stopAudioCapture();
  const result = await discordVoice.joinChannel(channelId);

  createCaptureWindow();
  captureWindow.webContents.once('did-finish-load', () => startAudioCapture());

  if (mainWindow) mainWindow.webContents.send('voice:streaming', true);
  return result;
});

ipcMain.handle('voice:leave', () => {
  stopAudioCapture();
  destroyCaptureWindow();
  discordVoice.leaveChannel();
  if (mainWindow) mainWindow.webContents.send('voice:streaming', false);
});

ipcMain.handle('voice:reconnect', async () => {
  stopAudioCapture();
  destroyCaptureWindow();
  const result = await discordVoice.reconnectChannel();

  createCaptureWindow();
  captureWindow.webContents.once('did-finish-load', () => startAudioCapture());

  if (mainWindow) mainWindow.webContents.send('voice:streaming', true);
  return result;
});

ipcMain.handle('audio:set-gain', (_, gain) => {
  captureGain = Math.max(0, Math.min(2, gain));
  if (captureWindow) captureWindow.webContents.send('SET_GAIN', captureGain);
});

ipcMain.handle('token:save', (_, token) => {
  saveTokenSecure(token);
});

ipcMain.handle('token:load', () => {
  return loadTokenSecure();
});

ipcMain.handle('win:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('win:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.handle('win:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('util:open-external', (_, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

app.whenReady().then(async () => {
  if (components && typeof components.whenReady === 'function') {
    await components.whenReady();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  stopAudioCapture();
  destroyCaptureWindow();
  discordVoice.disconnectBot();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

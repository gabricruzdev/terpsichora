const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('decadance', {
  loadUrl: (url) => ipcRenderer.invoke('browser:load', url),
  goBack: () => ipcRenderer.invoke('browser:go-back'),
  goForward: () => ipcRenderer.invoke('browser:go-forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  switchTab: (index) => ipcRenderer.invoke('browser:switch-tab', index),
  addTab: () => ipcRenderer.invoke('browser:add-tab'),
  removeTab: (index) => ipcRenderer.invoke('browser:remove-tab', index),
  getTabCount: () => ipcRenderer.invoke('browser:tab-count'),
  getTabUrls: () => ipcRenderer.invoke('browser:get-tab-urls'),
  getActiveTabIndex: () => ipcRenderer.invoke('browser:active-tab-index'),
  getActiveUrl: () => ipcRenderer.invoke('browser:active-url'),
  onUrlChanged: (cb) => ipcRenderer.on('browser:url-changed', (_, url) => cb(url)),
  onTabsUpdated: (cb) => ipcRenderer.on('browser:tabs-updated', (_, count, activeIndex) => cb(count, activeIndex)),
  onTabUrlChanged: (cb) => ipcRenderer.on('browser:tab-url-changed', (_, index, url) => cb(index, url)),
  onTabFavicon: (cb) => ipcRenderer.on('browser:tab-favicon', (_, index, favicon) => cb(index, favicon)),

  connectBot: (token) => ipcRenderer.invoke('bot:connect', token),
  disconnectBot: () => ipcRenderer.invoke('bot:disconnect'),
  fetchGuilds: () => ipcRenderer.invoke('bot:guilds'),
  botStatus: () => ipcRenderer.invoke('bot:status'),

  joinVoice: (channelId) => ipcRenderer.invoke('voice:join', channelId),
  leaveVoice: () => ipcRenderer.invoke('voice:leave'),
  reconnectVoice: () => ipcRenderer.invoke('voice:reconnect'),
  onVoiceStateChanged: (cb) => ipcRenderer.on('voice:state-changed', (_, status) => cb(status)),
  onStreamingChanged: (cb) => ipcRenderer.on('voice:streaming', (_, streaming) => cb(streaming)),

  setGain: (gain) => ipcRenderer.invoke('audio:set-gain', gain),

  saveToken: (token) => ipcRenderer.invoke('token:save', token),
  loadToken: () => ipcRenderer.invoke('token:load'),

  togglePanel: (open) => ipcRenderer.invoke('panel:toggle', open),

  winMinimize: () => ipcRenderer.invoke('win:minimize'),
  winMaximize: () => ipcRenderer.invoke('win:maximize'),
  winClose: () => ipcRenderer.invoke('win:close'),

  openExternal: (url) => ipcRenderer.invoke('util:open-external', url),
});

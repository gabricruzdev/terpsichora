(function () {
  const urlInput = document.getElementById('url-input');
  const btnGo = document.getElementById('btn-go');
  const btnBack = document.getElementById('btn-back');
  const btnForward = document.getElementById('btn-forward');
  const btnReload = document.getElementById('btn-reload');
  const discordPanel = document.getElementById('discord-panel');
  const tabBar = document.getElementById('tab-bar');
  const btnDiscord = document.getElementById('btn-discord');

  const stepToken = document.getElementById('step-token');
  const tokenInput = document.getElementById('token-input');
  const btnConnect = document.getElementById('btn-connect');
  const tokenHint = document.getElementById('token-hint');

  const stepChannel = document.getElementById('step-channel');
  const guildSelect = document.getElementById('guild-select');
  const channelSelect = document.getElementById('channel-select');
  const btnJoin = document.getElementById('btn-join');
  const btnLeave = document.getElementById('btn-leave');
  const btnDisconnectBot = document.getElementById('btn-disconnect-bot');
  const voiceHint = document.getElementById('voice-hint');

  const streamingSection = document.getElementById('streaming-section');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  const btnReconnect = document.getElementById('btn-reconnect');

  const toast = document.getElementById('toast');

  let guildsData = [];
  let tabUrls = [];
  let tabFavicons = [];

  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast visible';
    if (type === 'error') toast.classList.add('error');
    if (type === 'success') toast.classList.add('success');
    clearTimeout(toast._tid);
    toast._tid = setTimeout(() => toast.classList.remove('visible'), 4000);
  }

  const PANEL_KEY = 'decadance_panel_open';
  const GUILD_KEY = 'decadance_last_guild';
  const CHANNEL_KEY = 'decadance_last_channel';
  const VOLUME_KEY = 'decadance_volume';

  function isPanelOpen() {
    try {
      const v = localStorage.getItem(PANEL_KEY);
      return v === null || v === 'true';
    } catch { return true; }
  }
  function setPanelOpen(open) {
    try { localStorage.setItem(PANEL_KEY, String(open)); } catch {}
  }
  function saveLastChannel(guildId, channelId) {
    try {
      localStorage.setItem(GUILD_KEY, guildId || '');
      localStorage.setItem(CHANNEL_KEY, channelId || '');
    } catch {}
  }
  function loadLastGuild() {
    try { return localStorage.getItem(GUILD_KEY) || ''; } catch { return ''; }
  }
  function loadLastChannel() {
    try { return localStorage.getItem(CHANNEL_KEY) || ''; } catch { return ''; }
  }
  function saveVolume(v) {
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch {}
  }
  function loadVolume() {
    try { return parseInt(localStorage.getItem(VOLUME_KEY)) || 100; } catch { return 100; }
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.ext-link');
    if (link) {
      e.preventDefault();
      const url = link.dataset.url;
      if (url) window.decadance.openExternal(url);
    }
  });

  function setPanelState(open) {
    discordPanel.classList.toggle('collapsed', !open);
    document.body.classList.toggle('panel-collapsed', !open);
    btnDiscord.title = open ? 'Ocultar painel' : 'Abrir painel';
    window.decadance.togglePanel(open);
    setPanelOpen(open);
  }

  btnDiscord.addEventListener('click', () => setPanelState(discordPanel.classList.contains('collapsed')));
  setPanelState(isPanelOpen());

  window.decadance.onUrlChanged((url) => {
    urlInput.value = url && url !== 'about:blank' ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  });

  document.getElementById('btn-win-min').addEventListener('click', () => window.decadance.winMinimize());
  document.getElementById('btn-win-max').addEventListener('click', () => window.decadance.winMaximize());
  document.getElementById('btn-win-close').addEventListener('click', () => window.decadance.winClose());

  btnGo.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) window.decadance.loadUrl(url);
  });
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnGo.click(); });
  btnBack.addEventListener('click', () => window.decadance.goBack());
  btnForward.addEventListener('click', () => window.decadance.goForward());
  btnReload.addEventListener('click', () => window.decadance.reload());

  function tabLabel(url) {
    if (!url || url === 'about:blank') return 'Nova aba';
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      if (host.includes('youtube')) return 'YouTube';
      if (host.includes('spotify')) return 'Spotify';
      return host.split('.')[0] || host;
    } catch { return 'Nova aba'; }
  }

  async function renderTabs() {
    const count = await window.decadance.getTabCount();
    tabUrls = await window.decadance.getTabUrls();
    const activeIdx = await window.decadance.getActiveTabIndex();

    tabBar.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn' + (i === activeIdx ? ' active' : '');
      btn.dataset.tab = String(i);
      btn.title = tabUrls[i] || 'Nova aba';

      if (tabFavicons[i]) {
        const img = document.createElement('img');
        img.src = tabFavicons[i];
        img.className = 'tab-favicon';
        img.alt = '';
        img.onerror = () => img.remove();
        btn.appendChild(img);
      }

      const span = document.createElement('span');
      span.textContent = tabLabel(tabUrls[i]);
      btn.appendChild(span);

      if (count > 1) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'tab-btn-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = 'Fechar aba';
        closeBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          window.decadance.removeTab(i);
        });
        btn.appendChild(closeBtn);
      }

      tabBar.appendChild(btn);
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tab-btn-add';
    addBtn.textContent = '+';
    addBtn.title = 'Nova aba (Ctrl+T)';
    addBtn.addEventListener('click', () => window.decadance.addTab());
    tabBar.appendChild(addBtn);
  }

  tabBar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn && !btn.classList.contains('tab-btn-add')) {
      tabBar.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      await window.decadance.switchTab(parseInt(btn.dataset.tab, 10));
      const url = await window.decadance.getActiveUrl();
      urlInput.value = url && url !== 'about:blank' ? url.replace(/^https?:\/\//, '') : '';
    }
  });

  window.decadance.onTabsUpdated(async () => {
    await renderTabs();
    const url = await window.decadance.getActiveUrl();
    urlInput.value = url && url !== 'about:blank' ? url.replace(/^https?:\/\//, '') : '';
  });

  window.decadance.onTabUrlChanged((index, url) => {
    tabUrls[index] = url;
    const btn = tabBar.querySelector(`.tab-btn[data-tab="${index}"]`);
    if (btn) {
      const span = btn.querySelector('span');
      if (span) span.textContent = tabLabel(url);
      btn.title = url || 'Nova aba';
    }
  });

  window.decadance.onTabFavicon((index, favicon) => {
    tabFavicons[index] = favicon;
    const btn = tabBar.querySelector(`.tab-btn[data-tab="${index}"]`);
    if (btn) {
      let img = btn.querySelector('.tab-favicon');
      if (favicon) {
        if (!img) {
          img = document.createElement('img');
          img.className = 'tab-favicon';
          img.alt = '';
          img.onerror = () => img.remove();
          btn.insertBefore(img, btn.firstChild);
        }
        img.src = favicon;
      } else if (img) {
        img.remove();
      }
    }
  });

  function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
    if (text) btn.textContent = text;
  }

  function setHint(el, msg, type) {
    el.textContent = msg;
    el.className = 'hint';
    if (type) el.classList.add(type);
  }

  function showStep(step) {
    stepToken.classList.toggle('hidden', step !== 'token');
    stepChannel.classList.toggle('hidden', step !== 'channel');
  }

  function setVoiceConnected(connected) {
    btnJoin.disabled = connected;
    btnJoin.classList.toggle('inactive', connected);
    btnLeave.classList.toggle('hidden', !connected);
    guildSelect.disabled = connected;
    channelSelect.disabled = connected;
  }

  function setStreamingUI(streaming) {
    streamingSection.classList.toggle('hidden', !streaming);
  }

  volumeSlider.addEventListener('input', () => {
    const v = parseInt(volumeSlider.value);
    volumeValue.textContent = v + '%';
    window.decadance.setGain(v / 100);
    saveVolume(v);
  });

  btnReconnect.addEventListener('click', async () => {
    btnReconnect.disabled = true;
    btnReconnect.textContent = 'Reconectando...';
    try {
      const info = await window.decadance.reconnectVoice();
      setHint(voiceHint, `Reconectado em #${info.channel} (${info.guild})`, 'success');
      showToast('Conexão reparada!', 'success');
    } catch (err) {
      setHint(voiceHint, err.message || 'Erro ao reconectar.', 'error');
      showToast('Erro ao reconectar.', 'error');
    } finally {
      btnReconnect.disabled = false;
      btnReconnect.innerHTML = '&#8635; Reparar conexão';
    }
  });

  window.decadance.onVoiceStateChanged((status) => {
    if (status === 'destroyed') {
      setVoiceConnected(false);
      setStreamingUI(false);
      setHint(voiceHint, 'Conexão de voz perdida.', 'error');
      showToast('Conexão de voz perdida.', 'error');
    }
  });

  window.decadance.onStreamingChanged((streaming) => {
    setStreamingUI(streaming);
  });

  btnConnect.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      setHint(tokenHint, 'Cole o token do bot primeiro.', 'error');
      return;
    }

    setLoading(btnConnect, true, 'Conectando...');
    setHint(tokenHint, '');

    try {
      await window.decadance.connectBot(token);
      window.decadance.saveToken(token);
      setHint(tokenHint, 'Bot conectado com sucesso!', 'success');
      showToast('Bot conectado!', 'success');

      await loadGuilds();
      showStep('channel');
    } catch (err) {
      setHint(tokenHint, err.message || 'Erro ao conectar. Verifique o token.', 'error');
      showToast('Falha ao conectar o bot.', 'error');
    } finally {
      setLoading(btnConnect, false, 'Conectar');
    }
  });

  btnDisconnectBot.addEventListener('click', async () => {
    try {
      await window.decadance.disconnectBot();
    } catch {}
    guildsData = [];
    guildSelect.innerHTML = '<option value="">Selecione...</option>';
    channelSelect.innerHTML = '<option value="">Selecione um servidor</option>';
    channelSelect.disabled = true;
    btnJoin.disabled = true;
    setVoiceConnected(false);
    setStreamingUI(false);
    showStep('token');
    setHint(tokenHint, '');
    showToast('Bot desconectado.', 'info');
  });

  async function loadGuilds() {
    try {
      guildsData = await window.decadance.fetchGuilds();
      const frag = document.createDocumentFragment();
      const def = document.createElement('option');
      def.value = '';
      def.textContent = 'Selecione...';
      frag.appendChild(def);
      guildsData.forEach((g) => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        frag.appendChild(opt);
      });
      guildSelect.innerHTML = '';
      guildSelect.appendChild(frag);

      const lastGuild = loadLastGuild();
      if (lastGuild && guildsData.find((g) => g.id === lastGuild)) {
        guildSelect.value = lastGuild;
        guildSelect.dispatchEvent(new Event('change'));
        setTimeout(() => {
          const lastCh = loadLastChannel();
          if (lastCh) {
            channelSelect.value = lastCh;
            channelSelect.dispatchEvent(new Event('change'));
          }
        }, 50);
      }
    } catch (err) {
      setHint(voiceHint, 'Erro ao carregar servidores.', 'error');
    }
  }

  guildSelect.addEventListener('change', () => {
    const guildId = guildSelect.value;
    channelSelect.disabled = true;
    btnJoin.disabled = true;
    setHint(voiceHint, '');

    const frag = document.createDocumentFragment();
    const def = document.createElement('option');
    def.value = '';
    def.textContent = guildId ? 'Selecione...' : 'Selecione um servidor';
    frag.appendChild(def);

    if (guildId) {
      const guild = guildsData.find((g) => g.id === guildId);
      if (guild && guild.voiceChannels.length > 0) {
        guild.voiceChannels.forEach((ch) => {
          const opt = document.createElement('option');
          opt.value = ch.id;
          opt.textContent = ch.name;
          frag.appendChild(opt);
        });
        channelSelect.disabled = false;
      } else if (guild) {
        def.textContent = 'Nenhum canal de voz';
      }
    }
    channelSelect.innerHTML = '';
    channelSelect.appendChild(frag);
  });

  channelSelect.addEventListener('change', () => {
    btnJoin.disabled = !channelSelect.value;
  });

  btnJoin.addEventListener('click', async () => {
    const channelId = channelSelect.value;
    if (!channelId) return;

    setLoading(btnJoin, true, 'Entrando...');
    setHint(voiceHint, '');

    let joined = false;
    try {
      const info = await window.decadance.joinVoice(channelId);
      setVoiceConnected(true);
      joined = true;
      saveLastChannel(guildSelect.value, channelId);
      setHint(voiceHint, `Conectado em #${info.channel} (${info.guild})`, 'success');
      showToast(`Transmitindo em #${info.channel}`, 'success');
    } catch (err) {
      setHint(voiceHint, err.message || 'Erro ao entrar no canal.', 'error');
      showToast('Erro ao entrar no canal.', 'error');
    } finally {
      setLoading(btnJoin, false, 'Entrar no canal');
      if (joined) {
        btnJoin.disabled = true;
        btnJoin.classList.add('inactive');
      }
    }
  });

  btnLeave.addEventListener('click', async () => {
    try {
      await window.decadance.leaveVoice();
      setVoiceConnected(false);
      setStreamingUI(false);
      setHint(voiceHint, 'Desconectado do canal.', '');
      showToast('Desconectado do canal de voz.', 'info');
    } catch (err) {
      showToast(err.message || 'Erro ao sair.', 'error');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && !e.shiftKey && e.key === 't') {
      e.preventDefault();
      window.decadance.addTab();
    }
    if (e.ctrlKey && !e.shiftKey && e.key === 'w') {
      e.preventDefault();
      window.decadance.getActiveTabIndex().then((idx) => {
        window.decadance.getTabCount().then((count) => {
          if (count > 1) window.decadance.removeTab(idx);
        });
      });
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      setPanelState(discordPanel.classList.contains('collapsed'));
    }
  });

  async function checkInitialState() {
    try {
      const { botReady, voiceConnected } = await window.decadance.botStatus();
      if (botReady) {
        await loadGuilds();
        showStep('channel');
        if (voiceConnected) {
          setVoiceConnected(true);
          setStreamingUI(true);
        }
        return;
      }
      const token = await window.decadance.loadToken();
      if (token) {
        tokenInput.value = token;
        setLoading(btnConnect, true, 'Conectando...');
        try {
          await window.decadance.connectBot(token);
          await loadGuilds();
          showStep('channel');
        } catch (err) {
          setHint(tokenHint, err.message || 'Token inválido ou expirado.', 'error');
          window.decadance.saveToken('');
        } finally {
          setLoading(btnConnect, false, 'Conectar');
        }
      }
    } catch {}
  }

  async function init() {
    const savedVol = loadVolume();
    volumeSlider.value = savedVol;
    volumeValue.textContent = savedVol + '%';
    window.decadance.setGain(savedVol / 100);

    await renderTabs();
    await checkInitialState();
    const url = await window.decadance.getActiveUrl();
    urlInput.value = url && url !== 'about:blank' ? url.replace(/^https?:\/\//, '') : '';
  }

  init();
})();

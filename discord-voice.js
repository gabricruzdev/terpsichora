const { Client } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  entersState,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
} = require('@discordjs/voice');

let client = null;
let connection = null;
let player = null;
let stateCallback = null;
let lastChannelId = null;

const INTENTS = [1, 128];

function onStateChange(cb) {
  stateCallback = cb;
}

function emitState(status) {
  if (stateCallback) stateCallback(status);
}

async function connectBot(token) {
  if (client) {
    client.destroy().catch(() => {});
    client = null;
  }

  client = new Client({ intents: INTENTS });

  await new Promise((resolve, reject) => {
    client.once('clientReady', resolve);
    client.on('error', reject);
    client.login(token).catch(reject);
  });

  return true;
}

function disconnectBot() {
  leaveChannel();
  if (client) {
    client.destroy().catch(() => {});
    client = null;
  }
}

async function fetchGuilds() {
  if (!client) throw new Error('Bot não conectado.');
  const rawGuilds = await client.guilds.fetch();
  const guilds = [];
  for (const [, baseGuild] of rawGuilds) {
    const guild = await baseGuild.fetch();
    const channels = await guild.channels.fetch();
    const voiceChannels = [];
    channels.forEach((ch) => {
      if (ch && ch.isVoiceBased()) {
        voiceChannels.push({ id: ch.id, name: ch.name, position: ch.rawPosition });
      }
    });
    voiceChannels.sort((a, b) => a.position - b.position);
    guilds.push({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 64 }) || null,
      voiceChannels,
    });
  }
  return guilds;
}

async function joinChannel(channelId) {
  if (!client) throw new Error('Bot não conectado.');

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isVoiceBased()) {
    throw new Error('Canal inválido ou não é de voz.');
  }

  if (connection) {
    connection.destroy();
    connection = null;
  }

  lastChannelId = channelId;

  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
      maxMissedFrames: 3000,
    },
  });

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false,
    daveEncryption: true,
  });

  connection.subscribe(player);

  connection.on('stateChange', (_oldState, newState) => {
    emitState(newState.status);
    if (newState.status === 'connecting' && newState.networking) {
      newState.networking.on('error', (err) => {
        console.error('[voice] network error:', err);
      });
    }
  });

  connection.on('error', (err) => {
    console.error('[voice] connection error:', err);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    emitState('disconnected');
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      if (connection) connection.destroy();
      connection = null;
      emitState('destroyed');
    }
  });

  return { guild: channel.guild.name, channel: channel.name };
}

function leaveChannel() {
  lastChannelId = null;
  if (player) {
    player.stop(true);
    player = null;
  }
  if (connection) {
    connection.destroy();
    connection = null;
  }
}

async function reconnectChannel() {
  if (!client || !lastChannelId) throw new Error('Sem conexão anterior para reconectar.');
  const chId = lastChannelId;

  if (connection) {
    connection.destroy();
    connection = null;
  }
  if (player) {
    player.stop(true);
    player = null;
  }

  await new Promise((r) => setTimeout(r, 1500));
  return joinChannel(chId);
}

function playOpusStream(opusStream) {
  if (!player) return;
  const resource = createAudioResource(opusStream, {
    inputType: StreamType.Opus,
    silencePaddingFrames: 10,
  });
  player.play(resource);
}

function isConnected() {
  return connection !== null && connection.state.status === VoiceConnectionStatus.Ready;
}

function isBotReady() {
  return client !== null && client.isReady();
}

module.exports = {
  connectBot,
  disconnectBot,
  fetchGuilds,
  joinChannel,
  leaveChannel,
  reconnectChannel,
  playOpusStream,
  isConnected,
  isBotReady,
  onStateChange,
};

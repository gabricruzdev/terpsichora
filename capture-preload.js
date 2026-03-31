const { ipcRenderer } = require('electron');

let audioContext = null;
let ws = null;
let mediaStream = null;
let masterGainNode = null;

const workletCode = `
class PCMStream extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = options.processorOptions || {};
    this._frameSize = opts.bufferSize || 3840;
    this._channels = opts.channels || 2;

    this._ringCapacity = this._frameSize * 15;
    this._ring = new Float32Array(this._ringCapacity);
    this._writePos = 0;
    this._readPos = 0;
    this._available = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const ch = input.length;
    const samples = input[0].length;
    const needed = samples * this._channels;

    for (let i = 0; i < samples; i++) {
      for (let c = 0; c < this._channels; c++) {
        this._ring[this._writePos] = (c < ch && input[c]) ? input[c][i] : 0;
        this._writePos = (this._writePos + 1) % this._ringCapacity;
      }
    }
    this._available += needed;

    while (this._available >= this._frameSize) {
      const pcm = new Int16Array(this._frameSize);
      for (let i = 0; i < this._frameSize; i++) {
        const s = this._ring[this._readPos];
        pcm[i] = s < 0 ? (s * 0x8000) | 0 : (s * 0x7FFF) | 0;
        this._readPos = (this._readPos + 1) % this._ringCapacity;
      }
      this._available -= this._frameSize;
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }

    return true;
  }
}

registerProcessor('pcm-stream', PCMStream);
`;

ipcRenderer.on('START_CAPTURE', async (_event, config) => {
  try {
    const { mediaSourceIds, wsPort, sampleRate, channels, frameSize, gain } = config;
    const ids = Array.isArray(mediaSourceIds) ? mediaSourceIds : [mediaSourceIds];

    const streams = [];
    for (const id of ids) {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: id,
          },
        },
        video: false,
      });
      streams.push(s);
    }
    mediaStream = streams.length === 1 ? streams[0] : streams;

    audioContext = new AudioContext({
      latencyHint: 'playback',
      sampleRate: sampleRate,
    });

    ws = new WebSocket('ws://127.0.0.1:' + wsPort);
    ws.binaryType = 'arraybuffer';

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const pcmNode = new AudioWorkletNode(audioContext, 'pcm-stream', {
      processorOptions: { bufferSize: frameSize, channels },
      outputChannelCount: [channels],
    });

    pcmNode.port.onmessage = (event) => {
      if (ws && ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 50000) {
        ws.send(event.data);
      }
    };

    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = typeof gain === 'number' ? gain : 1;

    const mixGain = streams.length > 1 ? 1 / Math.sqrt(streams.length) : 1;
    streams.forEach((s) => {
      const source = audioContext.createMediaStreamSource(s);
      const gn = audioContext.createGain();
      gn.gain.value = mixGain;
      source.connect(gn);
      gn.connect(masterGainNode);
    });
    masterGainNode.connect(pcmNode);
  } catch (err) {
    console.error('[capture] Failed to start audio capture:', err);
  }
});

ipcRenderer.on('STOP_CAPTURE', () => {
  masterGainNode = null;
  if (mediaStream) {
    const arr = Array.isArray(mediaStream) ? mediaStream : [mediaStream];
    arr.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
});

ipcRenderer.on('SET_GAIN', (_event, gain) => {
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(gain, masterGainNode.context.currentTime);
  }
});

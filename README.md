# Terpsichora

[![GitHub release](https://img.shields.io/github/v/release/gabricruzdev/terpsichora?label=version&logo=github)](https://github.com/gabricruzdev/terpsichora/releases)
[![License](https://img.shields.io/badge/license-MIT-22c55e)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[![Electron](https://img.shields.io/badge/Electron-Chromium-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![discord.js](https://img.shields.io/badge/discord.js-voice-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![ws](https://img.shields.io/badge/ws-WebSocket-4A90A4)](https://github.com/websockets/ws)
[![Opus](https://img.shields.io/badge/Opus-audio-9B59B6)](https://opus-codec.org/)

**Version 1.0.3**

**Just want the executable?** → [Download the latest release](https://github.com/gabricruzdev/terpsichora/releases) (portable or installer).

Stream browser audio to Discord voice channels. Play YouTube, Spotify, or any website directly in a voice channel — no VB-Cable, no FFmpeg, no external drivers needed.

**by gabricruzdev**

## Tech stack

| Area | Technologies |
|------|----------------|
| **Desktop shell** | [Electron](https://www.electronjs.org/) (CastLabs build with Widevine for Spotify), [Node.js](https://nodejs.org/) 18+ |
| **Discord** | [discord.js](https://discord.js.org/), [@discordjs/voice](https://github.com/discordjs/voice), [@snazzah/davey](https://github.com/snazzah/davey) (voice encryption) |
| **Audio pipeline** | Tab capture in renderer ([`getDisplayMedia`](https://developer.mozilla.org/docs/Web/API/MediaDevices/getDisplayMedia) + **AudioWorklet**), [WebSocket](https://github.com/websockets/ws) to main process, [prism-media](https://github.com/discordjs/prism-media) + [opusscript](https://github.com/abalabahaha/opusscript) for Opus, [libsodium-wrappers](https://github.com/jedisct1/libsodium.js) |
| **UI** | HTML, CSS, vanilla JavaScript (`ui/`) |
| **Packaging** | [electron-builder](https://www.electron.build/) (portable + NSIS), [sharp](https://sharp.pixelplumbing.com/) / [to-ico](https://www.npmjs.com/package/to-ico) for icons |

## Features

- Embedded Chromium browser with tab management
- Direct tab audio capture via `chromeMediaSource: "tab"`
- PCM encoding through AudioWorklet with ring buffer, streamed to Opus
- Volume control, streaming indicator, and voice reconnect
- Encrypted token storage via Electron safeStorage
- Frameless window with custom controls
- Keyboard shortcuts: `Ctrl+T` (new tab), `Ctrl+W` (close tab), `Ctrl+Shift+D` (toggle panel)

## Prerequisites

- **Node.js** 18+
- **Discord Bot** with **Connect** and **Speak** permissions

## Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application, go to **Bot** and copy the **Token**
3. Go to **OAuth2 > URL Generator**, check **bot**, then select permissions **Connect** and **Speak**
4. Use the generated link to invite the bot to your server

## Running locally

1. Install dependencies and start the app:

```bash
npm install
npm start
```

YouTube and other sites work like this. For **Spotify** to not stop after ~10 seconds, you must sign Electron with CastLabs (once):

2. **(Optional) Spotify working locally:** install Python, then:

```bash
pip install castlabs-evs
python -m castlabs_evs.account signup
npm run sign:electron
```

On Windows, if `pip` or `python` are not recognized, use: `py -3 -m pip install castlabs-evs` and `py -3 -m castlabs_evs.account signup`.

3. Run `npm start` again — Spotify should play normally.

## Usage

1. Open any site (YouTube, Spotify, etc.) in the URL bar
2. Click the Discord icon and paste your bot token
3. Select the server and voice channel
4. Click **Entrar no canal**
5. Play audio — the bot streams it to Discord

## Project Structure

```
main.js              Electron main process, BrowserView management, audio capture, IPC
discord-voice.js     Discord bot connection and Opus stream playback
capture-preload.js   Tab audio capture via AudioWorklet + WebSocket
preload.js           IPC bridge between main and renderer
ui/                  Interface (HTML, CSS, JS)
scripts/             Build and signing utilities
```

## License

MIT

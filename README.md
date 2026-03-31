# Terpsichora

**Version 1.0.3**

**Just want the executable?** → [Download the latest release](https://github.com/gabricruzdev/terpsichora/releases) (portable or installer).

Stream browser audio to Discord voice channels. Play YouTube, Spotify, or any website directly in a voice channel — no VB-Cable, no FFmpeg, no external drivers needed.

**by gabricruzdev**

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

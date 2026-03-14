# Video Call App

A minimal peer-to-peer video and voice call app that runs in the browser. Start a call, share a link, and connect instantly — no account or app install needed.

Built with WebRTC (browser-native P2P video), React + Vite (frontend), and Node.js + Socket.IO (signaling server). Media flows directly between browsers after the initial handshake.

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- npm v7 or later (comes with Node)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) for exposing the app publicly (free, no account needed)

Install cloudflared on macOS:

```bash
brew install cloudflare/cloudflare/cloudflared
```

---

## Setup

Install all dependencies (runs once):

```bash
make install
```

---

## Running the app

### With a quick tunnel (no account, URL changes each time)

```bash
make start
```

Starts the app and a temporary Cloudflare tunnel. The public URL is printed in the terminal — share it with the person you want to call.

### With a named tunnel (permanent URL, requires a Cloudflare account)

```bash
make start-named TUNNEL_TOKEN=your_token_here
```

Uses a pre-configured named tunnel so the URL never changes between sessions. To set up a named tunnel, see the [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/).

### Stop all services

```bash
make stop
```

### Run services individually

```bash
make dev      # app only (no tunnel), available at http://localhost:5173
make tunnel   # quick tunnel only
```

---

## How it works

1. You open the app and click **Start a Call** — this creates a room with a unique ID and shows your camera while waiting.
2. Click **Copy Link** to copy the room URL, then share it.
3. When the other person opens the link, the WebRTC handshake triggers automatically.
4. You hear a chime and get a browser notification when they join.
5. After a brief "Connecting…" phase, both sides see and hear each other. Video/audio flows peer-to-peer — your server is no longer in the loop.

### Call controls

| Button | Action |
|---|---|
| Mute / Unmute | Toggle your microphone |
| Cam Off / Cam On | Toggle your camera |
| End | Hang up and return to home |

---

## Project structure

```
video-app/
├── Makefile                  # start, stop, dev, tunnel targets
├── package.json              # Root — npm workspaces + concurrently
├── server/
│   └── index.js              # Signaling server (Express + Socket.IO)
└── client/
    ├── vite.config.js        # Proxies /socket.io to port 3001
    └── src/
        ├── hooks/
        │   └── useWebRTC.js  # All WebRTC + signaling logic
        └── pages/
            ├── Home.jsx      # "Start a Call" screen
            └── Room.jsx      # Active call screen + join notifications
```

---

## Technical notes

- **HTTPS is required** for camera/microphone access in browsers. The Cloudflare tunnel provides this automatically.
- **STUN servers** (Google's free public servers) handle NAT traversal for most home networks.
- **TURN servers** are not included. Calls may fail on strict corporate/university networks. For personal use between home connections this is rarely an issue.
- The signaling server only relays connection metadata (SDP offers/answers and ICE candidates). It never touches your audio or video.
- Audio and video are end-to-end encrypted via DTLS-SRTP (mandatory in the WebRTC spec).
- Maximum room size is 2 participants.

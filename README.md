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
npm install
```

---

## Running the app

**Step 1 — Start the dev servers:**

```bash
npm run dev
```

This starts two processes in parallel:
- Signaling server on `http://localhost:3001`
- React app (Vite) on `http://localhost:5173`

Open `http://localhost:5173` in your browser to use the app locally.

**Step 2 — Expose it publicly (so others can join your call):**

In a separate terminal:

```bash
cloudflared tunnel --url http://localhost:5173
```

Cloudflare will print a public HTTPS URL like:

```
https://some-words-here.trycloudflare.com
```

Share this URL with the person you want to call. They open it in any browser (including mobile) and the call starts automatically.

> The URL changes every time you restart the tunnel. Keep the terminal open for the duration of your call.

---

## How it works

1. You open the app and click **Start a Call** — this creates a room with a unique ID and shows your camera while waiting.
2. Click **Copy Link** to copy the room URL, then share it.
3. When the other person opens the link, the WebRTC handshake triggers automatically.
4. After a brief "Connecting…" phase, both sides see and hear each other. Video/audio flows peer-to-peer — your server is no longer in the loop.

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
├── package.json              # Root — npm workspaces, runs both servers
├── server/
│   └── index.js              # Signaling server (Express + Socket.IO)
└── client/
    ├── vite.config.js        # Vite config — proxies /socket.io to port 3001
    └── src/
        ├── hooks/
        │   └── useWebRTC.js  # All WebRTC + signaling logic
        └── pages/
            ├── Home.jsx      # "Start a Call" screen
            └── Room.jsx      # Active call screen
```

---

## Technical notes

- **HTTPS is required** for camera/microphone access in browsers. The Cloudflare tunnel provides this automatically.
- **STUN servers** (Google's free public servers) handle NAT traversal for most home networks.
- **TURN servers** are not included. Calls may fail on strict corporate/university networks. For personal use between home connections this is rarely an issue.
- The signaling server only relays connection metadata (SDP offers/answers and ICE candidates). It never touches your audio or video.
- Maximum room size is 2 participants.

# Pulse Quiz

Pulse Quiz is a polished cross-device multiplayer web quiz app built with a React + TypeScript frontend and a Node + Socket.IO realtime backend. It is designed for true internet play, not same-browser multiplayer. Quizzes are authored and stored locally in browser `localStorage`, while live sessions are relayed through a single in-memory backend instance.

## Features

- Host a quiz from one device and let many players join from other devices using a 6-character code.
- No login, no database, no AI features.
- Canonical join route is always `/join/:code`.
- Host view is optimized for projector/desktop use; player view is touch-friendly.
- Author quizzes with images, autosaved drafts, preview, duplicate, import, and export.
- Persist authored quizzes, host results, player history, settings, and reconnect helpers in browser `localStorage`.
- Persist complete hosted-session final results on the host device, including all players, rankings, and per-question outcomes.
- Reconnect support for hosts and players using a reconnect token stored locally.
- In-memory Socket.IO backend is authoritative for timers, roster, answer acceptance, scoring, and leaderboard order.

## Stack

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS, Framer Motion, Zustand
- Backend: Node.js, TypeScript, Express, Socket.IO
- Shared package: Zod schemas, DTOs, storage envelopes, score helpers
- Testing: Vitest in all packages

## Repo layout

- `apps/web`: frontend app
- `apps/server`: Express + Socket.IO server
- `packages/shared`: shared types, schemas, and helpers

## Local development

### 1. Install

```bash
npm install
```

### 2. Configure env vars

Copy the example files and adjust values if needed:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
```

Recommended local values:

- `apps/web/.env`
  - `VITE_PUBLIC_APP_URL=http://localhost:5173`
  - `VITE_SERVER_URL=http://localhost:3001`
- `apps/server/.env`
  - `PORT=3001`
  - `CLIENT_ORIGIN=http://localhost:5173`
  - `PUBLIC_SERVER_URL=http://localhost:3001`

### 3. Run the app

```bash
npm run dev
```

This starts:

- shared package build watch
- Socket.IO server on `http://localhost:3001`
- web app on `http://localhost:5173`

## Validation commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run build:all
```

`npm run build` builds the shared package and the production web bundle. Use `npm run build:all` if you also want to build the backend locally.

## Production deployment

Pulse Quiz is built for public HTTPS/WSS deployment.

### Required production topology

- Deploy the web app to a publicly reachable HTTPS URL, for example `https://quiz.example.com`
- Deploy the server to a publicly reachable HTTPS/WSS-capable URL, for example `https://api.quiz.example.com`
- Set `CLIENT_ORIGIN` on the server to the exact public web origin
- Set `VITE_PUBLIC_APP_URL` on the web app to the exact public web origin
- Set `VITE_SERVER_URL` on the web app to the exact public backend origin
- This repo resolves the git top-level automatically during the Vercel web build, so the frontend build can still run even if the Vercel project root is not the repository root
- The Vercel config pins the framework preset to `Other`, so the generated frontend bundle is treated as static output instead of a Node entrypoint
- If the web app is hosted on Vercel, the realtime backend still needs to run on a separate public server URL. The frontend must not rely on `:3001` on the Vercel domain itself.

### V1 deployment target

V1 targets a **single-instance deployment**:

- one web deployment
- one backend instance
- one in-memory session map

There is no shared session store, sticky-session layer, Redis adapter, or database. Horizontal scaling is intentionally out of scope for v1.

### Environment variables

#### Web

- `VITE_PUBLIC_APP_URL`
  - Public web URL used to generate the canonical join URL
- `VITE_SERVER_URL`
  - Public backend URL used by `socket.io-client`
  - On Vercel, set this in Project Settings so the built frontend points to your public realtime backend instead of guessing one

#### Server

- `PORT`
  - Port the Node server listens on
- `CLIENT_ORIGIN`
  - Allowed browser origin for CORS and join URL generation
- `PUBLIC_SERVER_URL`
  - Public server URL shown by `/healthz` and logs

## Realtime architecture

### Frontend localStorage

The web app stores only device-local data:

- `quizapp_v1_quizzes`
  - authored quizzes and the autosaved draft
- `quizapp_v1_host_results`
  - complete hosted-session final results on the host device
- `quizapp_v1_player_history`
  - personal player result snapshots on each player device
- `quizapp_v1_settings`
  - motion, sound, and display preferences
- `quizapp_v1_reconnect`
  - reconnect helper token, role, and session code

All of these are versioned envelopes validated with Zod on read. Corrupt values are dropped and surfaced in the UI.

### Backend in-memory authority

The backend keeps only active and recently ended session state in memory:

- sessions
- quiz snapshots for active sessions
- player roster and connection state
- current question phase and timer timestamps
- accepted answers
- scores and leaderboard
- cleanup timers and disconnect grace timers

### Socket.IO event flow

Client to server:

- `session:probe`
- `session:create`
- `session:reconnect`
- `session:join`
- `session:start`
- `session:openQuestion`
- `answer:submit`
- `session:closeQuestion`
- `session:revealAnswer`
- `session:showLeaderboard`
- `player:kick`
- `session:end`

Server to client:

- `session:probeResult`
- `session:created`
- `session:joined`
- `session:update`
- `question:opened`
- `answer:accepted`
- `answer:rejected`
- `question:closed`
- `answer:revealed`
- `leaderboard:shown`
- `player:kicked`
- `session:ended`
- `session:error`
- `reconnect:accepted`

## No-database tradeoffs

There is intentionally **no database** in v1.

That means:

- authored quizzes are local to the creator’s browser storage
- saved host results are local to the host device’s browser storage
- player history is local to each player device’s browser storage
- active live sessions are stored only in backend memory
- if the backend restarts, active sessions are lost
- there is no cross-device account sync or global archive

This is a deliberate tradeoff to keep the architecture simple and lightweight.

## Abuse resilience

The backend includes simple in-memory abuse guards:

- Socket.IO payload ceiling via `maxHttpBufferSize`
- server-side quiz snapshot size validation
- join/probe throttling per IP and per code
- answer deduplication by player and question
- host disconnect grace handling
- idle lobby expiry
- socket cleanup and room cleanup when sessions end

## Practical capacity

There is **no hardcoded player cap** in the codebase.

Real capacity depends on:

- backend CPU
- backend memory
- available bandwidth
- websocket stability
- browser rendering performance for the host and players

The host and player UIs use virtualization or compact list rendering where practical, but large sessions are still deployment-dependent.

## Public production smoke test

This is the final smoke test to run after deploying the web app and server to public HTTPS/WSS URLs.

### Preconditions

- Web app deployed to public HTTPS
- Server deployed to public HTTPS/WSS
- `CLIENT_ORIGIN`, `VITE_PUBLIC_APP_URL`, and `VITE_SERVER_URL` point to the public deployment
- Use at least 2 real devices on different networks if possible

### Manual smoke test checklist

1. Open the deployed host URL on a desktop or laptop.
2. Open the deployed player URL on at least two separate real devices.
3. From the host device, start a session from a saved quiz with at least one image.
4. Confirm the host screen shows:
   - 6-character join code
   - canonical join URL in the form `/join/:code`
   - optional QR code
5. On each player device:
   - open the public join URL or type the code manually
   - enter a display name
   - join the waiting room
6. Start the game from the host device and confirm:
   - countdown appears
   - question image renders on all player devices
   - timer matches across host and players
7. Submit answers from both player devices and confirm:
   - first valid answer locks
   - duplicate taps do not change the answer
   - reveal state shows the correct answer
   - leaderboard order is stable and identical on all devices
8. Refresh one player device during a live question and confirm reconnect restores the active session when still allowed.
9. Refresh the host device during the lobby or live session and confirm reconnect restores the host view within the 30-second grace window.
10. End the session and confirm:
   - host device stores complete final results locally
   - each player device stores only its own personal result locally
   - the session is no longer joinable after ending

### Expected v1 limitation

If the backend process restarts during the test, the live session is expected to be lost. This is correct for v1.

## Future upgrade path

If you want durable sessions and cross-device history later, the clean upgrade path is:

- add a database for authored quizzes and archived results
- move active session state into Redis or another shared store
- use the Socket.IO Redis adapter for multi-instance fanout
- add authentication only if account-linked persistence becomes necessary

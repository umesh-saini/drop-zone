# DropZone — Project Plan & TODO

> A privacy-first, cross-platform utility that bridges your phone and computer.
> Real-time clipboard sync, file sharing, and remote file access — all end-to-end encrypted.

---

## Project Overview

### What It Does

- **Real-Time Clipboard Sync** — instant clipboard sharing between paired devices
- **File Sharing** — send/receive files between devices
- **Remote File Access** — browse and access files on a paired device remotely
- **Two Connection Modes:**
  - **Local Mode** — devices on same network, direct P2P connection
  - **Remote Mode** — devices anywhere, relayed through server (E2E encrypted)

### Core Principles

- **Privacy First** — end-to-end encryption for all data transfer
- **Simple Pairing** — QR code or PIN-based pairing
- **Best UI/UX** — clean, intuitive, fast
- **Fast Clipboard Sync** — near-instant, no noticeable delay

---

## Tech Stack & Monorepo Structure

```
dropzone/
├── apps/
│   ├── desktop/       → Tauri + React (Vite)
│   ├── mobile/        → React Native (Expo)
│   ├── web/           → Next.js
│   └── server/        → Express (Node.js)
├── packages/
│   ├── shared/        → Shared types, utils, constants
│   ├── crypto/        → E2E encryption logic (shared across apps)
│   ├── protocol/      → Communication protocol definitions
│   └── ui/            → Shared UI components (React-based)
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Detailed Tech Stack

### Monorepo & Tooling

| Tool                | Purpose                      |
| ------------------- | ---------------------------- |
| Turborepo           | Monorepo build orchestration |
| pnpm                | Package manager (workspaces) |
| TypeScript          | Type safety across all apps  |
| ESLint + Prettier   | Code quality & formatting    |
| Husky + lint-staged | Pre-commit hooks             |

### Desktop App (`apps/desktop`)

| Package                           | Purpose                             |
| --------------------------------- | ----------------------------------- |
| Tauri v2                          | Native desktop shell (Rust backend) |
| React 19+                         | UI framework                        |
| Vite                              | Build tool / dev server             |
| Tailwind CSS v4                   | Utility-first styling               |
| shadcn/ui                         | Component library (Radix-based)     |
| Lucide React                      | Icon set                            |
| Zustand                           | State management                    |
| React Router                      | Client-side routing                 |
| Framer Motion                     | Animations & transitions            |
| react-hot-toast / Sonner          | Toast notifications                 |
| next-themes (works with Vite too) | Dark/Light/Custom theme switching   |
| clsx + tailwind-merge             | Conditional class utilities         |

### Web App (`apps/web`)

| Package                  | Purpose                           |
| ------------------------ | --------------------------------- |
| Next.js 16+ (App Router) | Framework (SSR + API routes)      |
| React 19+                | UI framework                      |
| Tailwind CSS v4          | Utility-first styling             |
| shadcn/ui                | Component library (Radix-based)   |
| Lucide React             | Icon set                          |
| Zustand                  | State management                  |
| Framer Motion            | Animations & transitions          |
| Sonner                   | Toast notifications               |
| next-themes              | Dark/Light/Custom theme switching |
| clsx + tailwind-merge    | Conditional class utilities       |
| nuqs                     | URL state management              |

### Mobile App (`apps/mobile`)

| Package                           | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| React Native (Expo SDK 52+)       | Mobile framework                               |
| Expo Router                       | File-based navigation                          |
| NativeWind v4                     | Tailwind CSS for React Native                  |
| React Native Paper / Gluestack UI | Component library (Material Design / headless) |
| Expo Vector Icons + Lucide RN     | Icon sets                                      |
| Zustand                           | State management                               |
| React Native Reanimated           | Smooth 60fps animations                        |
| React Native Gesture Handler      | Touch gestures                                 |
| Expo Clipboard                    | Clipboard access                               |
| Expo Camera                       | QR code scanning                               |
| Expo File System                  | File access & storage                          |
| Expo Secure Store                 | Encrypted local storage (keys, tokens)         |
| React Native MMKV                 | Fast key-value storage                         |
| Expo Notifications                | Push notifications                             |
| React Native QRCode SVG           | QR code generation                             |
| expo-image                        | Optimized image rendering                      |

### Server (`apps/server`)

| Package            | Purpose                           |
| ------------------ | --------------------------------- |
| Express.js         | HTTP framework                    |
| TypeScript         | Type safety                       |
| Socket.io          | WebSocket server (real-time)      |
| Prisma             | ORM / database toolkit            |
| PostgreSQL         | Production database               |
| Redis              | Session store, pub/sub, caching   |
| Zod                | Runtime validation                |
| JWT (jsonwebtoken) | Token-based auth                  |
| Helmet             | Security headers                  |
| express-rate-limit | Rate limiting                     |
| Winston / Pino     | Structured logging                |
| node-cron          | Scheduled tasks (session cleanup) |
| multer             | File upload handling              |

### Shared Packages

#### `packages/shared`

| Content                  | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| TypeScript types         | Device, Pairing, Permission, Session types |
| Constants                | Permission types, error codes, limits      |
| Validators (Zod schemas) | Shared validation logic                    |
| Utils                    | Device code generation, helpers            |

#### `packages/crypto`

| Package                  | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| tweetnacl / libsodium.js | X25519 key exchange + encryption          |
| AES-256-GCM              | Symmetric encryption (via Web Crypto API) |
| Shared key utils         | Key derivation, envelope format           |

#### `packages/protocol`

| Content           | Purpose                                    |
| ----------------- | ------------------------------------------ |
| Message types     | Clipboard, file transfer, control messages |
| Event definitions | Socket event names and payloads            |
| Versioning        | Protocol version management                |

### Custom Theme Support

- **CSS variables-based theming** — shadcn/ui uses CSS vars natively
- **Theme config** in `packages/ui` shared across desktop & web
- **NativeWind theme** synced with Tailwind config for mobile
- **User-customizable** accent colors, dark/light/system modes
- **Theme persistence** — saved per device in local storage

---

## Device Identity & Pairing

### Device Code

- **8-character unique code** per device (alphanumeric, e.g. `A3K9M2X7`)
- Generated **once** on first app launch — never changes
- Used as the device identifier across all connections
- Stored locally on device + registered on server

### Pairing Flow

1. Device A shows its code as QR or displays PIN
2. Device B scans QR or enters PIN
3. Server validates both device codes exist
4. Handshake + key exchange (for E2E encryption)
5. Pair saved in DB — persistent session

---

## Database Schema (Server)

### Devices Table

| Field       | Description                                 |
| ----------- | ------------------------------------------- |
| id          | Internal UUID                               |
| device_code | 8-char unique alphanumeric code             |
| device_name | User-given name (e.g. "My Laptop")          |
| device_type | desktop / mobile / web                      |
| platform    | windows / mac / linux / android / ios / web |
| public_key  | For E2E encryption                          |
| created_at  | Timestamp                                   |
| last_seen   | Timestamp                                   |

### Pairings Table

| Field         | Description                  |
| ------------- | ---------------------------- |
| id            | Internal UUID                |
| device_a_code | Device code of first device  |
| device_b_code | Device code of second device |
| status        | active / revoked             |
| paired_at     | Timestamp                    |

### Permissions Table

| Field           | Description                     |
| --------------- | ------------------------------- |
| id              | Internal UUID                   |
| pairing_id      | FK to pairings                  |
| permission_type | See permission types below      |
| direction       | a_to_b / b_to_a / bidirectional |
| granted         | boolean                         |
| granted_at      | Timestamp                       |
| granted_by      | device_code of who granted      |

### Permission Types

| Permission            | Description                           |
| --------------------- | ------------------------------------- |
| `clipboard_read`      | Can read other device's clipboard     |
| `clipboard_write`     | Can write to other device's clipboard |
| `file_send`           | Can send files to other device        |
| `file_receive`        | Can receive files from other device   |
| `file_access_read`    | Can browse/read remote files          |
| `file_access_write`   | Can modify/delete remote files        |
| `notification_mirror` | Can mirror notifications (future)     |

### Sessions Table

| Field           | Description             |
| --------------- | ----------------------- |
| id              | Internal UUID           |
| pairing_id      | FK to pairings          |
| device_code     | Which device is online  |
| socket_id       | WebSocket connection ID |
| connected_at    | Timestamp               |
| last_active     | Timestamp               |
| connection_mode | local / remote          |

---

## Permission Logic

```
Example: Device A (Laptop) paired with Device B (Phone)

Permissions granted:
  clipboard_read:   A→B ✓, B→A ✓   (both can read each other's clipboard)
  clipboard_write:  A→B ✓, B→A ✓   (both can push clipboard to each other)
  file_send:        A→B ✓, B→A ✓   (both can send files)
  file_receive:     A→B ✓, B→A ✓   (both can receive files)
  file_access_read: A→B ✗, B→A ✓   (only phone can browse laptop files)
  file_access_write: A→B ✗, B→A ✗  (neither can modify remote files)
```

Each permission is **independently toggleable per direction**. Users control exactly what access they grant.

---

## Connection Architecture

### Local Mode

- mDNS/Bonjour discovery on local network
- Direct WebSocket/TCP connection between devices
- No server involvement after discovery
- Fastest possible — LAN speeds

### Remote Mode

- Devices connect to central server via WebSocket
- Server relays encrypted messages (cannot read content)
- TURN-style relay for NAT traversal
- All data E2E encrypted before leaving device

### Encryption

- X25519 key exchange during pairing
- AES-256-GCM for data encryption
- Keys stored only on devices, never on server
- Server sees only encrypted blobs

---

## TODO — Implementation Phases

### Phase 1: Project Setup ✅

- [x] Initialize Turborepo monorepo with pnpm
- [x] Setup `apps/server` — Express + TypeScript
- [x] Setup `apps/desktop` — Tauri + React + Vite
- [x] Setup `apps/web` — Next.js
- [x] Setup `apps/mobile` — React Native Expo SDK 56
- [x] Setup `packages/shared` — shared types & utils
- [x] Setup `packages/crypto` — encryption module
- [x] Setup `packages/protocol` — message protocol definitions
- [x] Setup `packages/ui` — shared UI components (placeholder)
- [x] Configure ESLint, Prettier, TypeScript across monorepo
- [x] Setup project documentation (README, TODO)

### Phase 2: Server Core ✅

- [x] Database setup (MongoDB + Mongoose)
- [x] Device registration endpoint (generate 8-char code)
- [x] Device code uniqueness validation
- [x] Pairing request/accept/reject flow
- [x] Permission CRUD for pairings
- [x] WebSocket server for real-time connections
- [x] Session management (online/offline tracking)
- [x] Basic auth (JWT + device code + secret token)

### Phase 3: Encryption Layer ✅

- [x] X25519 key pair generation per device
- [x] Key exchange protocol during pairing (shared secret derivation)
- [x] AES-256-GCM encrypt/decrypt utilities (Web Crypto API)
- [x] Message envelope format (encrypted payload + metadata)
- [x] Key storage (interface + memory/localStorage adapters)

### Phase 4: Clipboard Sync ✅

- [x] Clipboard monitoring (desktop — Tauri plugin with polling)
- [x] Clipboard monitoring (mobile — Expo clipboard with native events)
- [x] Clipboard change detection & debouncing
- [x] Encrypted clipboard broadcast to paired devices
- [x] Clipboard receive & update local clipboard
- [x] Permission check before sync (respect granted permissions)
- [x] Conflict resolution (latest timestamp wins)

### Phase 5: File Sharing ✅

- [x] File picker UI (desktop + mobile + web adapters)
- [x] File chunking for large files (adaptive 64KB-256KB)
- [x] Encrypted file transfer protocol (chunked with base64 transport)
- [x] Transfer progress tracking (speed, ETA, percentage)
- [x] Resume interrupted transfers (tracks completed chunks)
- [x] File receive + save to designated folder
- [x] Permission check before transfer (server-side socket enforcement)

### Phase 6: Remote File Access ✅

- [x] File system browser API (RemoteAccessHost on source device)
- [x] Directory listing protocol (request/response via socket relay)
- [x] File download on demand (triggers TransferManager file:offer flow)
- [x] Permission check (file_access_read enforced at server relay)
- [x] Sandboxed access (user-defined accessible folders, path traversal blocked)
- [x] File preview (first 10KB for text, base64 for images)

### Phase 7: Pairing UX ✅

- [x] QR code generation (encodes device code + public key in dropzone:// URI)
- [x] QR code scanner support (decodeQRData with validation + expiry)
- [x] Manual PIN entry fallback (6-digit, 2-min expiry, server register/verify)
- [x] Pairing confirmation screen (PairingFlow state machine)
- [x] Device management UI (helpers for icons, last seen, online status, sorting)
- [x] Permission management UI (display items, direction labels, toggle helpers)

### Phase 8: Local Mode ✅

- [x] mDNS/network discovery service (UDP broadcast on port 41234)
- [x] Local WebSocket server on each device (LocalModeManager lifecycle)
- [x] Auto-detect paired devices on same network (discovery + paired matching)
- [x] Seamless fallback: local → remote (ConnectionRouter with auto-downgrade)
- [x] Connection mode indicator in UI (state + events for mode_changed)

### Phase 9: UI/UX Polish ✅

- [x] Design system & component library (Tailwind v4 + shadcn-style + CSS vars)
- [x] Desktop app UI (device list, clipboard history, file transfers, settings)
- [x] Mobile app UI (React Native + Expo, themed screens, bottom tab nav)
- [x] Web dashboard (landing page + /dashboard device/clipboard/file management)
- [x] Dark/light theme (dark theme with CSS variables, light theme ready)
- [x] Animations & transitions (Framer Motion installed, transition utilities)
- [x] Notification system (Sonner toasts configured)
- [x] Onboarding flow (empty states with CTAs in each view)

### Phase 10: Security & Hardening ✅

- [x] Rate limiting on all endpoints (100/min global + 20/15min for auth)
- [x] Device code brute-force protection (progressive blocking: 15min → 1h → 24h)
- [x] Token rotation (auto-rotate after 7 days via X-New-Token header)
- [x] Audit log (AuditLog model, 90-day TTL, all security events logged)
- [x] Auto-expire inactive sessions (30-min stale cleanup every 5min)
- [x] Secure storage audit per platform (documented in KeyStorageAdapter)
- [ ] Penetration testing (manual — out of scope for automated build)

### Phase 10.5: Backend Integration (Wiring) ✅

- [x] Environment config (.env + .env.example for all 4 apps)
- [x] Shared client SDK (ApiClient + RealtimeClient in @dropzone/shared)
- [x] Unified cross-platform crypto (NaCl secretbox — works in RN too)
- [x] Desktop: auto-register, socket connect, live data, pairing modal (QR + code),
      live clipboard sync, file send/receive with progress
- [x] Web: dashboard with live device list, pairing, live clipboard receive
- [x] Mobile: register, socket, pairing modal, live status, clipboard push/receive
- [x] Verified end-to-end: register → pair → key exchange → encrypted clipboard
- [x] Verified cross-platform E2E (mobile ↔ desktop ↔ web)

---

## 🚧 REMAINING WORK (Prioritized)

> Status after integration: devices register, connect, pair, and sync clipboard
> end-to-end. The items below are what's left to make it a polished, daily-driver app.
> Ordered by priority — P0 first.

---

### Phase 11: Unpair / Disconnect (P0 — critical) ⬅️ NEXT

> Once paired there is currently no way to disconnect. This is the most important gap.

- [ ] Server: `DELETE /api/pairings/:id` (or reuse revoke) — fully remove pairing + permissions
- [ ] Server: emit `pairing:revoked` to the other device so it updates live
- [ ] Desktop: "Unpair" action on each device row (the `...` menu) with confirm dialog
- [ ] Mobile: "Unpair" action (long-press or detail sheet) with confirm
- [ ] Both: on unpair, delete stored shared secret for that pairing
- [ ] Both: handle incoming `pairing:revoked` — remove device from list + toast
- [ ] Edge case: clean up in-flight transfers / clipboard targets for that peer

### Phase 12: Permission Management & Enforcement (P1)

> Permissions exist in the DB but the UI doesn't let users change them and the
> client doesn't fully respect them. Make them real and editable from both sides.

- [ ] Desktop: per-device Permissions screen/sheet
  - [ ] Toggle each permission: clipboard send/receive, file send/receive,
        remote file read, remote file write
  - [ ] Show direction clearly (This device → Other / Other → This device)
  - [ ] Live save via `PUT /api/pairings/:id/permissions`
- [ ] Mobile: same permissions UI
- [ ] Client-side enforcement: don't send clipboard/files if permission not granted
- [ ] Server-side enforcement audit: verify every relay checks permission (clipboard, file, remote)
- [ ] Show "You don't have permission" states in UI when an action is blocked
- [ ] Default permission template on pair (clipboard both ways on, file access off) — review
- [ ] Re-fetch permissions when the other device changes them (socket `permission:update`)

### Phase 13: Mobile — Replace Dummy Data with Real (P1)

> Mobile Files, Clipboard, and Settings still show placeholder content in places.

- [ ] Files screen: wire real transfers from store (currently static demo rows)
- [ ] Files screen: add "Send File" with expo-document-picker → TransferManager
- [ ] Files screen: incoming file accept/reject prompt + progress bars
- [ ] Clipboard screen: ensure history is fully from store (no demo entries)
- [ ] Settings: all rows reflect real state (done for some — audit all)
- [ ] Remove any remaining hardcoded device/clip/file mock arrays

### Phase 14: Global Clipboard Capture (P1)

> "Anything the user copies — Ctrl+C, right-click copy, a UI button — should sync."

- [ ] Desktop (Tauri): global clipboard watcher running even when window unfocused
  - [ ] Use Tauri clipboard polling in Rust side for reliability
  - [ ] Optional: global shortcut to push clipboard on demand
- [ ] Mobile: capture clipboard on app foreground + manual "Push" (auto-capture
      in background is OS-restricted — document the limitation)
- [ ] Debounce + dedupe so the same copy isn't synced twice
- [ ] Respect clipboard permission per direction
- [ ] Support more clipboard types later (images, files) — text first

### Phase 15: Background Service & Efficient Sync (P2)

> Both apps should keep syncing in the background, lightweight on battery/CPU.

- [ ] Desktop: run in system tray, keep socket alive when window closed
  - [ ] Tray icon + menu (Show, Pause sync, Quit)
  - [ ] Autostart on login (Tauri autostart plugin)
  - [ ] Minimize-to-tray instead of quit
- [ ] Mobile: background clipboard/file sync within OS limits
  - [ ] expo-task-manager / background fetch for periodic sync
  - [ ] Foreground service notification (Android) while connected
  - [ ] Reconnect socket on app resume
- [ ] Tune heartbeat / reconnect backoff for battery efficiency
- [ ] Pause/resume sync toggle

### Phase 16: Remote File Explorer (full OS-like browser) (P2)

> Files tab should show the OTHER device's file system like a normal file manager.

- [ ] Desktop host: expose sandboxed folders, real directory listing (RemoteAccessHost exists — wire UI)
- [ ] Mobile host: expose accessible folders via expo-file-system
- [ ] Explorer UI (both apps): breadcrumb path, folder navigation, file list,
      icons by type, size, modified date, back/up navigation
- [ ] Open/preview files (images, text, PDF) inline
- [ ] Download file → existing TransferManager flow
- [ ] Edit file (if `file_access_write` granted) → upload back
- [ ] Delete file (if `file_access_write` granted) → confirm
- [ ] Show "You don't have permission" when read/write not allowed
- [ ] Folder picker in Settings to choose which folders are shared

### Phase 17: Additional Recommendations (my suggestions)

> Things I think are needed for a solid product.

- [ ] Transfer controls in UI: cancel, pause, resume, retry
- [ ] Device rename (PATCH /devices/me) from Settings
- [ ] "Reset this device" / logout (clear creds + re-register)
- [ ] Real per-device online status (currently only updates via events — sync on load)
- [ ] Offline queue: buffer clipboard/files when peer offline, deliver on reconnect
- [ ] Native notifications: clipboard received, file received, pairing request
- [ ] Clipboard history persistence (survive restart) + clear history
- [ ] Deep-link pairing: `dropzone://pair/...` opens app and pre-fills
- [ ] Multi-file selection + batch send
- [ ] First-run onboarding: name your device, permission primer
- [ ] Web app: enable file send (currently shows "coming soon")
- [ ] Error/empty/loading states audit across all screens
- [ ] Reconnect with exponential backoff + connection lost banner
- [ ] Automated tests (unit for crypto/transfer, integration for pairing flow)
- [ ] Local mode native modules (desktop Rust UDP, mobile react-native-udp)
- [ ] Light theme implementation (tokens ready, wire the toggle)

---

## Phase X: Advanced Features (Future / Nice-to-have)

- [ ] Notification mirroring (phone notifications on desktop)
- [ ] SMS relay (Android → Desktop)
- [ ] Media streaming (preview photos/videos from phone)
- [ ] Multi-device groups (more than 2 devices paired)
- [ ] Shared clipboard history across all devices
- [ ] Browser extension for web clipboard
- [ ] End-to-end tests + CI pipeline
- [ ] Production deployment (server hosting, app store / release builds)

---

## Decisions Made ✓

- **Database:** PostgreSQL (prod) + Prisma ORM
- **Mobile framework:** Expo (managed workflow)
- **State management:** Zustand (all apps)
- **WebSocket:** Socket.io
- **UI (Web/Desktop):** shadcn/ui + Tailwind CSS + Lucide React
- **UI (Mobile):** NativeWind + Gluestack UI / React Native Paper
- **Icons:** Lucide React (web/desktop), Lucide RN + Expo Vector Icons (mobile)
- **Theming:** CSS variables (web/desktop), NativeWind theme (mobile)

## Key Decisions Still Open

- [ ] Mobile component library final pick: Gluestack UI vs React Native Paper
- [ ] File storage strategy for transfers in progress
- [ ] Push notification service (FCM / APNs / Expo Notifications)
- [ ] Deployment: self-hosted vs cloud vs hybrid
- [ ] Redis hosting: managed (Upstash) vs self-hosted
- [ ] Crypto library final pick: tweetnacl vs libsodium.js

---

## Notes

- Device codes are **permanent** — one device = one code forever
- All encryption happens **client-side** — server is zero-knowledge
- Permissions are **granular and directional** — full user control
- Local mode is **preferred** when available — faster and no server dependency
- Server is only a **relay** in remote mode — it never sees plaintext data

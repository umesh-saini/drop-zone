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

### Phase 9: UI/UX Polish

- [ ] Design system & component library
- [ ] Desktop app UI (device list, clipboard history, file transfers)
- [ ] Mobile app UI (same features, mobile-optimized)
- [ ] Web dashboard (manage devices, view history, settings)
- [ ] Dark/light theme
- [ ] Animations & transitions
- [ ] Notification system (new file received, clipboard updated)
- [ ] Onboarding flow (first launch experience)

### Phase 10: Security & Hardening

- [ ] Rate limiting on all endpoints
- [ ] Device code brute-force protection
- [ ] Token rotation
- [ ] Audit log (who accessed what, when)
- [ ] Auto-expire inactive sessions
- [ ] Secure storage audit per platform
- [ ] Penetration testing

### Phase 11: Advanced Features (Future)

- [ ] Notification mirroring
- [ ] SMS relay (Android → Desktop)
- [ ] Media streaming (preview photos/videos from phone)
- [ ] Multi-device groups (more than 2 devices paired)
- [ ] Shared clipboard history
- [ ] Browser extension for web clipboard

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

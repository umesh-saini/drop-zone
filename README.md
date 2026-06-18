# DropZone

> A privacy-first, cross-platform utility that bridges your phone and computer.

## Features

- 🔄 **Real-Time Clipboard Sync** — instant clipboard sharing between paired devices
- 📁 **File Sharing** — send/receive files between devices
- 🌐 **Remote File Access** — browse and access files on a paired device remotely
- 🔒 **Privacy First** — end-to-end encryption for all data transfer
- 🤝 **Simple Pairing** — QR code or PIN-based pairing
- ⚡ **Fast** — near-instant clipboard sync

## Project Structure

```
dropzone/
├── apps/
│   ├── desktop/       → Tauri + React (Vite)
│   ├── mobile/        → React Native (Expo)
│   ├── web/           → Next.js
│   └── server/        → Express (Node.js)
├── packages/
│   ├── shared/        → Shared types, utils, constants
│   ├── crypto/        → E2E encryption logic
│   ├── protocol/      → Communication protocol definitions
│   └── ui/            → Shared UI components
```

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 8
- Rust (for Tauri desktop app)

### Getting Started

```bash
# Install dependencies
pnpm install

# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter @dropzone/web dev
pnpm --filter @dropzone/server dev
pnpm --filter @dropzone/desktop dev

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Format all files
pnpm format
```

### Building

```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter @dropzone/web build
```

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Desktop:** Tauri v2 + React + Vite + shadcn/ui + Tailwind
- **Web:** Next.js 14+ + shadcn/ui + Tailwind
- **Mobile:** React Native (Expo) + NativeWind
- **Server:** Express + Socket.io + TypeScript
- **Database:** PostgreSQL + Prisma (coming soon)
- **State:** Zustand
- **Encryption:** TweetNaCl (X25519 + AES-256-GCM)

## License

MIT

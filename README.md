# Roam

Roam is a cross-platform audiobook reader for people who want stories in their ears instead of text on a screen. It is built for commuting, working, or any moment when reading on a phone feels tiring but listening still works.

## What It Does

- Upload books from TXT and EPUB files

- Listen with text-to-speech playback

- Keep progress in sync with the text

- Detect language and split content into readable chunks

- Share code across web, native, server, and shared packages

## Workspace

- `packages/web` - Vite + React web app

- `packages/native` - Expo React Native app

- `packages/server` - Node.js API and processing services

- `packages/shared` - shared types, constants, and helpers

## Getting Started

Requirements:

- Node.js 20+

- pnpm

Install dependencies:

```bash

pnpm install

```

Start everything:

```bash

pnpm dev

```

Run a single package:

```bash

pnpm dev:web

pnpm dev:native

pnpm dev:server

```

Build all packages:

```bash

pnpm build

```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server with Turbopack at http://localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Vitest test suite
npm run db:reset     # Force reset Prisma database
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Architecture

UIGen is an AI-powered React component generator. Users describe a component in a chat panel; Claude generates it using virtual filesystem tools; the result renders live in a sandboxed iframe.

### Three-panel UI
- **Chat (35%)** — `src/components/chat/` — user/AI conversation via streaming
- **Preview/Code (65%)** — `src/components/preview/` and `src/components/editor/` — iframe preview and Monaco editor

### Data flow
1. User sends message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Claude responds with tool calls (`str_replace_editor`, `file_manager`) targeting the virtual filesystem
3. Virtual filesystem state updates in `FileSystemContext`
4. Preview iframe re-renders the component tree via Babel-transpiled JSX

### Virtual filesystem (`src/lib/file-system.ts`)
All generated code lives in memory — nothing is written to disk. The filesystem serializes to JSON and is stored in the `Project.data` column in SQLite. `/App.jsx` is always the entry point.

### AI integration (`src/lib/provider.ts`, `src/app/api/chat/route.ts`)
- Uses `@ai-sdk/anthropic` (Vercel AI SDK) with Claude Haiku 4.5
- Falls back to `MockLanguageModel` when `ANTHROPIC_API_KEY` is absent
- Tools are defined in `src/lib/tools/`
- System prompt is in `src/lib/prompts/`

### State management
Two core React contexts:
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — chat messages, AI streaming, tool-call dispatch
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — virtual FS state, file CRUD, refresh triggers

### Authentication (`src/lib/auth.ts`, `src/actions/index.ts`)
JWT in httpOnly cookies (7-day expiry), bcrypt password hashing. Anonymous users are fully supported; projects are tied to a user only when signed in.

### Database
Prisma with SQLite (`prisma/dev.db`). Two models:
- `User` — email + hashed password
- `Project` — `messages` (JSON chat history) + `data` (serialized virtual FS)

### JSX transformation (`src/lib/transform/`)
Babel Standalone transpiles generated JSX in-browser for the preview iframe, with an import map for module resolution.

## Environment

Set `ANTHROPIC_API_KEY` in `.env` to use real Claude. Without it, a mock provider is used automatically.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

Database migrations are managed by Drizzle Kit and live in `./migrations/`. Run migrations by applying the SQL files directly against Neon or via `npx drizzle-kit migrate`.

## Environment Variables

Requires `.env.local` with:
- `OPENAI_API_KEY` — used for embeddings (`text-embedding-3-small`) and chat (`gpt-4o-mini`)
- `NEON_DATABASE_URL` — Neon PostgreSQL connection string (must have `pgvector` extension enabled)

## Debug Agents

Two reusable agents live at `~/dev-tools/debug-agents/`. Run them in separate terminals alongside `npm run dev`.

**Server log agent** — spawns the dev server, monitors stdout/stderr, auto-fixes errors:
```bash
npx tsx ~/dev-tools/debug-agents/server-log-agent.ts \
  --cmd "npm run dev" \
  --ready "Ready in" \
  --cwd .
```

**Browser console agent** — opens Chromium via Playwright, monitors console errors and exceptions, auto-fixes errors:
```bash
npx tsx ~/dev-tools/debug-agents/browser-console-agent.ts \
  --url http://localhost:3000 \
  --cwd .
```

Install dependencies and Playwright browser (first time only):
```bash
cd ~/dev-tools/debug-agents && npm install && npx playwright install chromium
```

## Architecture

This is a RAG (Retrieval-Augmented Generation) chatbot built with Next.js App Router.

### Two main user flows:

**1. Document Ingestion (`/upload`)**
- User uploads a PDF via `app/upload/page.tsx`
- `app/upload/actions.ts` (Server Action) handles the pipeline:
  - Parse PDF → `pdf-parse`
  - Chunk text → `chunking.ts` (RecursiveCharacterTextSplitter, 150 chars, 20 overlap)
  - Generate embeddings → `embeddings.ts` (OpenAI `text-embedding-3-small`, 1536 dims)
  - Store chunks + embeddings in Neon `documents` table

**2. Chat (`/chat` + `/api/chat`)**
- `app/chat/page.tsx` uses `useChat` from `@ai-sdk/react`
- `app/api/chat/route.ts` receives messages, calls OpenAI with a `searchKnowledgeBase` tool
- When the tool is invoked, `search.ts` generates an embedding for the query and runs cosine similarity search against the `documents` table
- Response is streamed back via AI SDK's UI message stream

### Key source files (root-level, not in `app/`):

| File | Purpose |
|------|---------|
| `db-config.ts` | Neon serverless client + Drizzle ORM instance |
| `db-schema.ts` | `documents` table schema with `vector(1536)` column and HNSW index |
| `drizzle.config.ts` | Drizzle Kit config pointing to Neon |
| `embeddings.ts` | `generateEmbedding()` / `generateEmbeddings()` via OpenAI |
| `chunking.ts` | `chunkContent()` using LangChain text splitter |
| `search.ts` | `searchSimilarDocuments()` — embed query → cosine search |

### Database schema

```sql
-- pgvector extension required
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536)
);
-- HNSW index for cosine similarity
CREATE INDEX "embeddingIndex" ON documents USING hnsw (embedding vector_cosine_ops);
```

### UI components

Custom AI chat components live in `components/ai-elements/` (conversation, message, prompt-input, toolbar). Generic UI primitives are in `components/ui/` (shadcn/ui). The `lib/utils.ts` exports the standard `cn()` helper.

### Path alias

`@/*` maps to the project root (not `src/`). Import from `@/components/...`, `@/lib/...`, etc.

### Deep dive

Refer to the detailed architecture elements in [architecture.md](architecture.md) if needed. Use it only for detailed deep dives and comparisons of patterns (e.g. chunking strategies, RAG variants, technology alternatives, tuning knobs, adapting ingestion to a local folder).

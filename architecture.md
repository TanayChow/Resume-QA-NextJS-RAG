# RAG Chatbot — Architecture Reference

This document describes the architecture, patterns, and design decisions used in this project. It is written to serve as a reusable reference when building new RAG (Retrieval-Augmented Generation) applications on similar patterns.

---

## Core Concept: What is RAG?

RAG augments an LLM's responses with context retrieved from a private knowledge base. Instead of relying solely on the model's training data, the system:

1. Stores documents as vector embeddings in a database
2. At query time, converts the user's question into an embedding
3. Finds the most semantically similar chunks from the database
4. Injects those chunks into the LLM prompt as grounding context

This gives the model access to private, up-to-date, or domain-specific knowledge without fine-tuning.

---

## System Overview

```
User PDF
   │
   ▼
[Parse] → pdf-parse extracts raw text
   │
   ▼
[Chunk] → LangChain RecursiveCharacterTextSplitter splits into overlapping segments
   │
   ▼
[Embed] → OpenAI text-embedding-3-small converts each chunk to a 1536-dim vector
   │
   ▼
[Store] → Neon PostgreSQL (pgvector) stores content + embedding rows
   │
   ▼
[Index] → HNSW index on the embedding column enables fast ANN search


User Question
   │
   ▼
[Embed query] → same embedding model as ingestion
   │
   ▼
[Cosine search] → find top-N most similar chunks from documents table
   │
   ▼
[Inject as tool result] → LLM receives retrieved chunks as tool output
   │
   ▼
[Stream response] → AI SDK streams answer back to the browser
```

---

## Two-Phase Architecture

### Phase 1: Ingestion Pipeline

**Entry point:** `app/upload/actions.ts` (Next.js Server Action)

The ingestion pipeline is a linear, sequential transformation:

```
File (PDF) → Buffer → Raw Text → Chunks[] → Embeddings[] → DB rows
```

**Key decisions:**
- Runs as a Server Action (`"use server"`) so the heavy work (PDF parsing, API calls, DB writes) never runs in the browser
- `generateEmbeddings()` calls `embedMany()` — batches all chunks in one API call rather than N individual calls
- Records are inserted in a single `db.insert().values(records)` call for efficiency
- No deduplication: re-uploading the same PDF appends duplicate rows. This is a known tradeoff; production systems would hash chunks and upsert

**Chunking parameters** (`chunking.ts`):
- `chunkSize: 150` characters — very small, optimized for tight semantic focus per chunk
- `chunkOverlap: 20` — provides continuity across chunk boundaries
- `separators: [" "]` — splits only on spaces, not paragraph breaks, to preserve sentence flow

> **When adapting:** chunk size should be tuned to document type. Technical documents with dense information may need larger chunks (512–1024 tokens). Small chunks improve precision; large chunks improve recall.

---

### Phase 2: Query & Retrieval Pipeline

**Entry point:** `app/api/chat/route.ts` (Next.js API Route)

The retrieval is implemented as an **AI SDK tool** — not pre-retrieval injection. The LLM decides when to call `searchKnowledgeBase`, which makes it agentic: it can reason about whether a search is needed before doing it.

```
User message → streamText() with tools → LLM decides to call searchKnowledgeBase
   → execute() runs cosine search → top-N chunks returned as tool result
   → LLM generates answer grounded in retrieved context → streamed to UI
```

**Key decisions:**
- `stopWhen: stepCountIs(4)` limits the agent to at most 4 LLM steps (tool call → observation → tool call → answer), preventing runaway loops
- The tool returns plain text (numbered chunks) not JSON, which is easier for the LLM to integrate inline
- Similarity threshold (`0.5`) is currently commented out in `search.ts` — all results are returned ordered by similarity. Re-enabling provides a quality floor but risks returning zero results for novel queries
- `limit: 3` in the API call — only 3 chunks injected per search to keep context concise

---

## Key Modules

### `embeddings.ts`

Thin wrappers over Vercel AI SDK's `embed` and `embedMany`:

```ts
generateEmbedding(text: string): Promise<number[]>   // single query
generateEmbeddings(texts: string[]): Promise<number[][]>  // batch ingestion
```

Both normalize newlines (`replaceAll("\n", " ")`) before embedding — important because embedding models treat newline-heavy text differently from prose. **This pre-processing step should be consistent between ingestion and query time.**

### `chunking.ts`

Exports both the configured splitter instance and a convenience wrapper:

```ts
chunkContent(content: string): Promise<string[]>
```

The `RecursiveCharacterTextSplitter` tries separators in order, falling back to the next if a chunk would still exceed `chunkSize`. With `separators: [" "]`, it only splits on spaces.

### `search.ts`

```ts
searchSimilarDocuments(query, limit?, threshold?): Promise<SimilarDoc[]>
```

Uses Drizzle ORM's `cosineDistance` helper to compute `1 - cosine_distance` as the similarity score. The HNSW index on the embedding column means this runs as approximate nearest-neighbour (ANN) search — fast at scale, with a small accuracy tradeoff vs. exact search.

### `db-schema.ts`

```ts
vector("embedding", { dimensions: 1536 })
index("embeddingIndex").using("hnsw", table.embedding.op("vector_cosine_ops"))
```

The dimension (1536) is tied to the embedding model. Changing models requires a schema migration and re-embedding all content. The `vector_cosine_ops` operator class pairs with cosine distance queries — must match the distance function used in searches.

### `db-config.ts`

Uses Neon's **serverless HTTP client** (`neon()`) wrapped with Drizzle. The HTTP transport works in edge/serverless environments where persistent TCP connections aren't available. For traditional Node.js servers, the WebSocket-based `@neondatabase/serverless` client would be used instead.

---

## RAG Patterns Used

### Tool-Calling RAG (used here)
The LLM invokes retrieval via a tool. Gives the model agency over *when* to search.
- Pro: model can skip search for greetings/off-topic queries; can chain multiple searches
- Con: adds one LLM step latency per search; requires tool-capable models

### Pre-retrieval RAG (alternative)
Retrieve context before calling the LLM, inject into system prompt.
- Pro: simpler, one fewer LLM step
- Con: always retrieves even when not needed; context always occupies token budget

### Hybrid Search (not used here)
Combine vector similarity with keyword (BM25) search, merge results.
- Useful when documents contain unique identifiers, names, or codes that embeddings handle poorly

---

## Technology Choices and Alternatives

| Concern | This project | Common alternatives |
|---------|-------------|---------------------|
| Vector DB | Neon + pgvector | Pinecone, Weaviate, Qdrant, Supabase |
| Embedding model | OpenAI text-embedding-3-small (1536d) | text-embedding-3-large (3072d), Cohere, local (nomic-embed) |
| Chat model | OpenAI gpt-4o-mini | Claude, Gemini, Mistral, local (Ollama) |
| AI SDK | Vercel AI SDK v4 | LangChain, LlamaIndex, direct API |
| Chunking | LangChain RecursiveCharacterTextSplitter | Fixed-size, sentence-aware (spaCy/nltk), semantic chunking |
| ORM | Drizzle | Prisma, Kysely, raw SQL |
| Document input | PDF upload via browser | File system folder watch, S3 bucket sync, URL scraping |

---

## Adapting This Pattern to a Local Document Folder

To ingest from a local folder instead of browser PDF uploads:

1. **Replace the Server Action** with a Node.js ingestion script (can be a `scripts/ingest.ts` run with `tsx`)
2. **Swap `pdf-parse`** for `fs.readdir` + per-file parsing; add format handlers (`.txt`, `.md`, `.docx`) as needed
3. **Track ingested files** — add a `source_file` column to the schema and upsert by filename hash to avoid duplicates on re-runs
4. **Run ingestion on a schedule** or as a pre-deploy step rather than on user action
5. The `chunking.ts`, `embeddings.ts`, `search.ts`, and `db-config.ts` modules are **unchanged** — they are document-source agnostic

Example shape of an ingestion script:

```ts
const files = fs.readdirSync("./documents");
for (const file of files) {
  const content = parseFile(file);              // format-specific
  const chunks = await chunkContent(content);
  const embeddings = await generateEmbeddings(chunks);
  await db.insert(documents).values(chunks.map((c, i) => ({
    content: c,
    embedding: embeddings[i],
    source: file,
  })));
}
```

---

## Tuning Knobs

| Parameter | Location | Effect |
|-----------|----------|--------|
| `chunkSize` | `chunking.ts` | Smaller = more precise retrieval, more rows; larger = more context per chunk |
| `chunkOverlap` | `chunking.ts` | Higher overlap = better boundary continuity, more storage |
| `limit` | `route.ts` → `searchSimilarDocuments(query, 3)` | More results = more context, higher token usage |
| `threshold` | `search.ts` (commented out) | Re-enable to filter low-quality matches; tune based on similarity score distribution |
| `stopWhen` | `route.ts` | Increase for complex multi-hop queries; decrease to reduce latency |
| Embedding model | `embeddings.ts` | Larger model = better quality, higher cost and latency; must match DB dimension |

---

## Data Flow Summary

```
INGESTION
FormData (PDF)
  └─ processPDFFile()          app/upload/actions.ts
       ├─ pdf-parse             → raw text
       ├─ chunkContent()        chunking.ts         → string[]
       ├─ generateEmbeddings()  embeddings.ts       → number[][]
       └─ db.insert()           db-config.ts        → documents table

QUERY
POST /api/chat
  └─ streamText() with tools   app/api/chat/route.ts
       └─ searchKnowledgeBase tool
            └─ searchSimilarDocuments()  search.ts
                 ├─ generateEmbedding()  embeddings.ts   → query vector
                 └─ cosine search        db-config.ts    → top-N chunks
```

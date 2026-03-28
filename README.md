This is a project to demostrate a simple pdf upload, parse, verctorize and store with susequent querying based on the embeddings. The frontend interface is based on React using ai-elements to create the conversation UX.  

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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

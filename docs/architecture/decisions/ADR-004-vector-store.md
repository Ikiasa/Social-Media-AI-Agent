# ADR-004: Vector Store Strategy for Brand Knowledge Engine

## Context
The AI Social Media Agent requires vector search functionality to perform semantic retrieval over tenant and brand knowledge documents (PDFs, DOCX, Web articles, YouTube transcripts, Audio text). The vector store must enforce strict multi-tenant isolation (`workspaceId` and `brandId`) to prevent cross-workspace data leaks.

## Options Considered

1. **Option A: PostgreSQL + pgvector**
   - *Pros*: Production standard, ACID compliance, robust filtering via `pgvector` indexes (`HNSW` / `IVFFlat`).
   - *Cons*: Requires migrating the application database away from MongoDB during MVP development.
2. **Option B: Dedicated SaaS Vector DB (Pinecone / Qdrant / Weaviate)**
   - *Pros*: Managed infrastructure, fast ANN search.
   - *Cons*: External network latency, additional subscription cost, cloud dependency.
3. **Option C: Mongoose Vector & In-Memory Hybrid Store (Selected)**
   - *Pros*: Zero external infrastructure dependency, leverages existing MongoDB models, instant development velocity, native `workspaceId` and `brandId` filter boundaries, seamless migration path to pgvector in Phase 8.
   - *Cons*: High memory footprint for millions of vectors (not an issue for MVP scope).

## Decision
We select **Option C (Mongoose Vector & In-Memory Hybrid Store)** for Phase 4 MVP.

## Rationale
1. **Development Simplicity**: Keeps MongoDB as the single database for Phase 4 without introducing additional infrastructure services.
2. **Security & Filtering**: Workspace boundaries are enforced directly in the database query layer (`{ workspaceId, brandId }`).
3. **Clean Abstraction**: The domain code interacts strictly with the `VectorStore` interface, ensuring that transitioning to PostgreSQL + `pgvector` in Phase 8 requires zero changes to Application Services or Controllers.

## Migration Path
When PostgreSQL + `pgvector` migration occurs in Phase 8, the `MongooseVectorStore` implementation will be swapped for `PgVectorStore` implementing the exact same `VectorStore` interface.

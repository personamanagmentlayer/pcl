# RAG Expert — Vector Stores

Reference material for the `rag-expert` skill. See [SKILL.md](../SKILL.md).

The store is rarely the reason a RAG system is good or bad — chunking and hybrid
retrieval matter more. Choose for operational fit, not benchmark position.

## Selection

| Store                          | Choose it when                                                                                    | Cost of choosing it                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **pgvector**                   | Your data is already in Postgres; you need transactional consistency and joins to business tables | Scales to tens of millions of vectors, not billions; tuning is manual |
| **Qdrant**                     | You need rich payload filtering at scale and want to self-host                                    | Another stateful system to run and back up                            |
| **Elasticsearch / OpenSearch** | You already run it and need strong lexical plus dense                                             | Heavier to operate; vector features trail dedicated stores            |
| **Chroma**                     | Prototyping, local development, single-process apps                                               | Not intended for multi-tenant production scale                        |
| **Pinecone**                   | You want no operational burden and accept managed-only                                            | Vendor lock-in; egress and per-namespace costs                        |
| **Redis**                      | You already run it, corpus fits in memory, latency is critical                                    | Memory-bound; persistence needs deliberate configuration              |

The default that regrets least: **pgvector**, until measurement shows it is the
bottleneck. One system, one backup story, one access-control model.

## Index Types

| Index              | Recall | Build | Memory | Use                                       |
| ------------------ | ------ | ----- | ------ | ----------------------------------------- |
| Flat / brute force | Exact  | None  | Low    | < ~50k vectors, or a correctness baseline |
| IVFFlat            | Good   | Fast  | Low    | Large corpora, memory-constrained         |
| HNSW               | Best   | Slow  | High   | The usual production choice               |

HNSW parameters, and what they trade:

- `m` — connections per node. Higher gives better recall and more memory.
  16 is a sound default; 32–64 for high-dimensional embeddings.
- `ef_construction` — effort at build time. Higher gives a better graph and a
  slower build. 64–200.
- `ef_search` — effort at query time. The runtime recall/latency dial; raise it
  when recall is short, without rebuilding.

```sql
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

SET hnsw.ef_search = 100;    -- per session or per transaction
```

Always measure recall against a brute-force baseline on your own data. Published
recall figures are for public datasets whose distribution is not yours.

```sql
-- Ground truth for a sample of queries
SET enable_indexscan = off;
SELECT id FROM chunks ORDER BY embedding <=> $1 LIMIT 10;
```

## Distance Metrics

Match the metric to how the embedding model was trained; mismatching it degrades
quality silently.

| Metric        | pgvector operator | Use with                                  |
| ------------- | ----------------- | ----------------------------------------- |
| Cosine        | `<=>`             | Most text embedding models                |
| Inner product | `<#>`             | Models producing normalised vectors       |
| L2            | `<->`             | Image embeddings, some specialised models |

For normalised vectors, cosine and inner product rank identically; inner product
is cheaper. Normalise once at write time rather than per query.

## Filtering

Filtering interacts badly with approximate indexes. Pre-filtering scans too much;
post-filtering can return nothing because the filtered rows were never in the
approximate candidate set.

```sql
-- Post-filter risk: the 10 nearest may all belong to another tenant
SELECT * FROM (
    SELECT id, content FROM chunks ORDER BY embedding <=> $1 LIMIT 10
) t WHERE tenant_id = $2;                       -- may return 0 rows

-- Correct: filter inside the search, with a partial index or RLS
SELECT id, content
FROM chunks
WHERE tenant_id = $2                            -- planner uses the tenant index
ORDER BY embedding <=> $1
LIMIT 10;
```

For high-cardinality tenancy, partition or use a namespace per tenant rather than
relying on a filter — it keeps each search small and makes isolation structural.

Qdrant and Pinecone implement filtered search natively inside the index, which is
their main advantage over pgvector at scale with selective filters.

## Multi-Tenancy

Three options, in increasing isolation and cost:

1. **Filter column** — simplest, cheapest, weakest. Requires row-level security
   so a forgotten `WHERE` cannot leak. Suitable for many small tenants.
2. **Namespace or collection per tenant** — clean isolation, per-tenant index
   tuning, more objects to manage. Suitable for hundreds of tenants.
3. **Database per tenant** — strongest isolation and the usual answer to
   regulatory requirements. Expensive below a few dozen large tenants.

Whichever you choose, write a test that asserts a query as tenant A can never
return a chunk of tenant B. Vector search failures are silent; nothing in the
result tells you it came from the wrong customer.

## Operations

**Re-indexing on model change.** Embeddings from different models are not
comparable. Migrate with a parallel column:

```sql
ALTER TABLE chunks ADD COLUMN embedding_v2 vector(1024);
-- backfill in batches, then build the index, then switch reads, then drop v1
```

Never mix generations in one index — retrieval degrades in a way that looks like
a chunking problem.

**Deletion.** Define propagation before launch. A chunk of a deleted document
that remains searchable is a data-protection failure, not a cache-staleness
inconvenience. Cascade from the document table and verify with a test.

**Backups.** The index is derivable; the chunks, offsets and permissions are not.
Back up the source of truth, and be able to rebuild the index from it. Time that
rebuild — it is your recovery objective.

**Cost.** Storage is dimension × 4 bytes × count, plus index overhead of roughly
20–50 % for HNSW. A million 1024-dimension vectors is around 4 GB before the
index. Halving dimensions where the model supports it (Matryoshka embeddings)
saves more than any other lever, at a small recall cost worth measuring.

## Embedding Model Choice

- **Dimensions**: 768–1024 is the practical sweet spot. Above that, storage and
  latency grow faster than quality.
- **Context length**: must exceed your chunk size, or content is silently
  truncated at embedding time. Verify rather than assume.
- **Domain fit**: general-purpose models underperform on legal, medical and code
  corpora. Test two or three on your own retrieval set before committing.
- **Hosting**: a self-hosted model removes per-token cost and data egress but
  adds GPU capacity to operate.
- **Stability**: pin the version. A provider silently updating an embedding model
  splits your index into two incomparable halves.

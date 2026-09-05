# RAG Expert — Advanced Retrieval

Reference material for the `rag-expert` skill. See [SKILL.md](../SKILL.md).

Reach for these only after hybrid retrieval, sensible chunking and a reranker are
in place and measured. Each adds latency, cost or complexity, and each should be
justified by a recall number rather than by novelty.

## Query Rewriting

User queries are short, ambiguous and full of pronouns. Documents are none of
those. Rewriting closes the gap.

```python
REWRITE = """Rewrite the user's question as a standalone search query.

- Resolve pronouns and references using the conversation.
- Expand abbreviations and acronyms.
- Keep domain terms, identifiers and error codes exactly as written.
- Return only the query.

Conversation:
{history}

Question: {question}"""
```

The decisive rule is the third: rewriting `ERR_4021` into "error four thousand
twenty-one" destroys the lexical match that would have found it.

For conversational systems this is not optional. "What about for enterprise?"
retrieves nothing on its own.

## Multi-Query Retrieval

One query embedding samples one point in semantic space. Several phrasings cover
more of it.

```python
def multi_query(question: str, k: int = 3) -> list[Chunk]:
    variants = generate_variants(question, n=k)      # different phrasings
    rankings = [hybrid_search(v, limit=30) for v in [question, *variants]]
    return reciprocal_rank_fusion(rankings)
```

Costs k+1 retrievals and one extra model call. Worth it when questions are
phrased very differently from the corpus — support tickets against formal
documentation, for instance.

## HyDE

Generate a hypothetical answer, embed that, and search with it. A fabricated
answer sits closer in embedding space to a real answer than a question does.

```python
def hyde_search(question: str) -> list[Chunk]:
    hypothetical = call_model(
        "Write a short passage that would answer this question. "
        "Invent plausible specifics; accuracy does not matter.",
        question,
    )
    return dense_search(embed(hypothetical), limit=30)
```

Effective on corpora of expository prose, and actively harmful when precision on
identifiers matters — the fabrication introduces terms that are not in your
corpus. Always fuse with the direct query rather than replacing it.

## Parent-Document Retrieval

Small chunks embed precisely; large chunks read better. Do both: index the small
one, return its parent.

```python
def parent_retrieval(query: str, keep: int = 5) -> list[str]:
    children = hybrid_search(query, limit=40)         # ~300 chars each
    parent_ids, seen = [], set()
    for child in rerank(query, children, keep=keep):
        if child.parent_id not in seen:
            seen.add(child.parent_id)
            parent_ids.append(child.parent_id)
    return [load_parent(pid) for pid in parent_ids]   # ~2000 chars each
```

This is usually the single highest-value refinement after hybrid search: it
removes the trade-off between findability and readability. Deduplicate parents —
several children of the same parent will match.

## Contextual Retrieval

Prepend a generated description of how each chunk fits its document, before
embedding.

```python
CONTEXT = """<document>{document}</document>
<chunk>{chunk}</chunk>

In two sentences, situate this chunk within the document, for search. Answer only."""

def contextualise(document: str, chunk: str) -> str:
    return call_model(CONTEXT.format(document=document, chunk=chunk)) + "\n\n" + chunk
```

Substantially improves retrieval on documents where meaning depends on position —
contracts, manuals, regulations. The cost is one model call per chunk at ingest,
which prompt caching over the shared document makes affordable.

Cheap approximation with most of the benefit: prepend the document title and
heading path, as the main skill describes. Try that first.

## Metadata Filtering and Routing

The best retrieval is often a filter, not a search.

```python
def route(question: str) -> dict:
    """Extract hard constraints so search runs over the right subset."""
    return call_model(EXTRACT_FILTERS, question, response_schema=Filters.schema())
    # -> {"year": 2025, "doc_type": "policy", "region": "EU"}
```

"What was the 2025 refund policy in the EU?" should filter on year, type and
region, then search within that. Semantic search over the whole corpus will
happily return the 2023 US policy, which is fluent, plausible and wrong.

Extract filters conservatively: a wrong filter returns nothing, which is worse
than a broad search.

## Graph Retrieval

When answers require joining facts across documents — "which suppliers are
affected by the recall of component X?" — vector search retrieves passages, not
relationships.

Build an entity graph at ingest, retrieve a subgraph at query time, and pass both
the subgraph and the source passages to the model.

```cypher
MATCH (c:Component {id: $component})<-[:USES]-(p:Product)<-[:SUPPLIES]-(s:Supplier)
RETURN s.name, p.name, c.id
```

The cost is real: entity extraction quality, graph maintenance, and a second
store. Justify it with questions that genuinely cannot be answered by passage
retrieval — most cannot be, and are better served by better chunking.

## Retrieval Feedback Loops

Log what was retrieved, what was cited, and what the user did next.

```python
logger.info("rag.retrieval", extra={
    "query_hash": sha256(query),
    "retrieved_ids": [c.id for c in candidates],
    "sent_ids": [c.id for c in reranked],
    "cited_ids": cited,
    "refused": refused,
    "top_score": scores[0] if scores else None,
})
```

The signals that pay:

- **Chunks retrieved but never cited** — noise; check chunking or the reranker floor.
- **Chunks never retrieved at all** — unfindable; usually missing context in the
  chunk text.
- **Refusal rate by topic** — a coverage gap in the corpus, not a model problem.
- **Low top scores** — the query is outside the corpus; route it elsewhere rather
  than answering.

## Choosing What to Add

Add in this order, measuring recall@k at each step, and stop when the metric
stops moving:

1. Hybrid retrieval (dense + lexical)
2. Reranking
3. Context-prefixed chunks
4. Parent-document retrieval
5. Query rewriting, if conversational
6. Metadata routing, if the corpus has strong dimensions
7. Anything else

Systems that skip to step 7 typically have a step 1 problem.

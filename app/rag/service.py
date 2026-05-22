from app.rag.retriever import retrieve
from app.rag.reranker import reranker
from app.rag.generator import generate_answer_stream


def stream_answer(question: str):
    """
    Full RAG pipeline:
      1. Retrieve top-k chunks from Qdrant
      2. Rerank with BGE Reranker — keeps top_k_reranked best chunks
      3. Stream the LLM answer token by token
      4. Append source citations at the end
    """
    # ── 1. Retrieve ──────────────────────────────────────────────
    raw_chunks = retrieve(question)

    if not raw_chunks:
        yield "No relevant documents found in the knowledge base.\n\nSources:\n"
        return

    # ── 2. Rerank ────────────────────────────────────────────────
    reranked_chunks = reranker.rerank(question, raw_chunks)

    if not reranked_chunks:
        reranked_chunks = raw_chunks[:5]   # graceful fallback

    # ── 3. Stream answer ─────────────────────────────────────────
    for token in generate_answer_stream(question, reranked_chunks):
        yield token

    # ── 4. Append sources ────────────────────────────────────────
    yield "\n\nSources:\n"

    seen: set[tuple] = set()
    for item in reranked_chunks:
        key = (item["filename"], item["chunk_index"])
        if key in seen:
            continue
        seen.add(key)
        yield f"• {item['filename']} (chunk {item['chunk_index']})\n"

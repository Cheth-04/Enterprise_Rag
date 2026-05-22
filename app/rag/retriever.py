from qdrant_client import QdrantClient
from app.config import settings
from app.rag.embedder import embedder


client = QdrantClient(url=settings.qdrant_url)


def retrieve(question: str, limit: int | None = None) -> list[dict]:
    """
    Embeds the question and returns the top-k matching chunks
    from Qdrant as a list of dicts:
      { text, filename, chunk_index, score }
    """
    if limit is None:
        limit = settings.top_k_retrieval

    query_vector = embedder.embed_query(question)

    results = client.query_points(
        collection_name=settings.qdrant_collection,
        query=query_vector,
        limit=limit,
        with_payload=True,
    ).points

    chunks = []
    for hit in results:
        if not hit.payload or "text" not in hit.payload:
            continue
        chunks.append(
            {
                "text": hit.payload["text"],
                "filename": hit.payload.get("filename", "unknown"),
                "chunk_index": hit.payload.get("chunk_index", 0),
                "score": hit.score,
            }
        )

    return chunks

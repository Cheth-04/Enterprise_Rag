from qdrant_client import QdrantClient
from app.config import settings
from app.rag.embedder import embedder

client = QdrantClient(url=settings.qdrant_url)

def retrieve(question: str, limit: int = 5):

    query_vector = embedder.embed_query(question)

    results = client.query_points(
        collection_name=settings.qdrant_collection,
        query=query_vector,
        limit=limit
    ).points

    chunks = []

    for hit in results:
        if hit.payload and "text" in hit.payload:
            chunks.append(hit.payload["text"])

    return chunks

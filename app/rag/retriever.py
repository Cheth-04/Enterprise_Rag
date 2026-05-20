from qdrant_client import QdrantClient

from app.config import settings

from app.rag.embedder import embedder


client = QdrantClient(url=settings.qdrant_url)


def retrieve_chunks(question: str) -> list[dict]:

    query_vector = embedder.embed_query(question)


    results = client.search(

        collection_name=settings.qdrant_collection,

        query_vector=query_vector,

        limit=settings.top_k_retrieval

    )


    retrieved = []


    for result in results:

        retrieved.append({

            "filename": result.payload.get("filename"),

            "chunk_index": result.payload.get("chunk_index"),

            "text": result.payload.get("text"),

            "vector_score": result.score

        })


    return retrieved

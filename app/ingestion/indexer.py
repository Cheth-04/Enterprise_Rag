import uuid

from qdrant_client import QdrantClient

from qdrant_client.models import Distance, VectorParams, PointStruct


from app.config import settings

from app.rag.embedder import embedder


client = QdrantClient(url=settings.qdrant_url)


def ensure_collection_exists():

    existing = client.get_collections().collections

    existing_names = {collection.name for collection in existing}


    if settings.qdrant_collection not in existing_names:

        client.create_collection(

            collection_name=settings.qdrant_collection,

            vectors_config=VectorParams(

                size=1024,

                distance=Distance.COSINE

            )

        )


def index_chunks(filename: str, chunks: list[str]) -> int:

    ensure_collection_exists()


    vectors = embedder.embed_documents(chunks)


    points = []


    for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):

        points.append(

            PointStruct(

                id=str(uuid.uuid4()),

                vector=vector,

                payload={

                    "filename": filename,

                    "chunk_index": idx,

                    "text": chunk

                }

            )

        )


    client.upsert(

        collection_name=settings.qdrant_collection,

        points=points

    )


    return len(points)

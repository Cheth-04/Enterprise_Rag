import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from app.config import settings
from app.rag.embedder import embedder
from app.job_store import update_job

client = QdrantClient(url=settings.qdrant_url)

EMBED_BATCH_SIZE = 64   # increased from 32 — more throughput per GPU/CPU call


def ensure_collection_exists():
    existing_names = {c.name for c in client.get_collections().collections}
    if settings.qdrant_collection not in existing_names:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
        )


def index_chunks(filename: str, chunks: list[str], job_id: str | None = None) -> int:
    ensure_collection_exists()

    # Cap chunks to prevent runaway processing on huge files
    if len(chunks) > settings.max_chunks_per_file:
        if job_id:
            update_job(job_id, status="indexing",
                       message=f"Large file: capping at {settings.max_chunks_per_file} chunks "
                               f"(document has {len(chunks)} chunks). "
                               f"Increase max_chunks_per_file in config if needed.")
        chunks = chunks[: settings.max_chunks_per_file]

    total   = len(chunks)
    indexed = 0

    for batch_start in range(0, total, EMBED_BATCH_SIZE):
        batch_chunks = chunks[batch_start : batch_start + EMBED_BATCH_SIZE]
        vectors      = embedder.embed_documents(batch_chunks)

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "filename":    filename,
                    "chunk_index": batch_start + i,
                    "text":        chunk,
                },
            )
            for i, (chunk, vector) in enumerate(zip(batch_chunks, vectors))
        ]

        client.upsert(
            collection_name=settings.qdrant_collection,
            points=points,
        )
        indexed += len(points)

        if job_id:
            pct = int(indexed / total * 100)
            update_job(
                job_id,
                status="indexing",
                message=f"Embedding & indexing… {indexed}/{total} chunks ({pct}%)",
                chunks_indexed=indexed,
            )

    return indexed
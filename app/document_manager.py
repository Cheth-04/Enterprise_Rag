from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, FilterSelector
from app.config import settings

client = QdrantClient(url=settings.qdrant_url)


def list_documents() -> list[str]:
    """Returns a sorted list of unique filenames stored in Qdrant."""
    results, _ = client.scroll(
        collection_name=settings.qdrant_collection,
        limit=1000,
        with_payload=True,
    )
    filenames: set[str] = set()
    for point in results:
        fname = point.payload.get("filename") if point.payload else None
        if fname:
            filenames.add(fname)
    return sorted(filenames)


def delete_document(filename: str) -> bool:
    """Deletes all Qdrant points that belong to a given filename."""
    client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=FilterSelector(
            filter=Filter(
                must=[
                    FieldCondition(
                        key="filename",
                        match=MatchValue(value=filename),
                    )
                ]
            )
        ),
    )
    return True

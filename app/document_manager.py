from qdrant_client import QdrantClient
from app.config import settings
from qdrant_client.models import Filter, FieldCondition, MatchValue

client = QdrantClient(url=settings.qdrant_url)


def list_documents():

    results = client.scroll(
        collection_name=settings.qdrant_collection,
        limit=1000,
        with_payload=True
    )

    points = results[0]

    filenames = set()

    for point in points:

        filename = point.payload.get("filename")

        if filename:
            filenames.add(filename)

    return sorted(list(filenames))


def delete_document(filename: str):

    client.delete(
        collection_name=settings.qdrant_collection,

        points_selector=Filter(
            must=[
                FieldCondition(
                    key="filename",
                    match=MatchValue(value=filename)
                )
            ]
        )
    )

    return True

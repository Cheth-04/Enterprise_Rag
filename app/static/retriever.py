from app.rag.embedder import embedder
from app.db.qdrant import qdrant


def retrieve(
    query:str,
    limit:int=10
):

    embedding = embedder.embed(
        query
    )


    results = qdrant.query_points(
        collection_name="documents",

        query=embedding,

        limit=limit,

        with_payload=True
    )


    final=[]


    for point in results.points:

        score=point.score

        # ignore weak matches

        if score and score<0.35:
            continue

        payload=point.payload


        final.append({

            "text":
            payload["text"],

            "filename":
            payload.get(
            "filename",
            "unknown"
            ),

            "chunk_index":
            payload.get(
            "chunk_index",
            0
            ),

            "score":
            score

        })


    final.sort(
        key=lambda x:
        x["score"],
        reverse=True
    )

    return final

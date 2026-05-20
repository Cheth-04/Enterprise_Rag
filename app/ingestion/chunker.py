from app.config import settings


def chunk_text(text: str) -> list[str]:

    cleaned = " ".join(text.split())


    chunks = []

    start = 0

    chunk_size = settings.chunk_size

    overlap = settings.chunk_overlap


    while start < len(cleaned):

        end = start + chunk_size

        chunk = cleaned[start:end]


        if chunk.strip():

            chunks.append(chunk.strip())


        start = end - overlap


        if start < 0:

            start = 0


        if end >= len(cleaned):

            break


    return chunks

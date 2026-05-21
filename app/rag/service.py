from app.rag.retriever import retrieve
from app.rag.generator import generate_answer_stream

def stream_answer(question: str):
    chunks = retrieve(question)

    if not chunks:
        yield "No relevant documents found.\n\nSources:\n"
        return

    top_chunks = chunks[:5]

    answer = ""
    for token in generate_answer_stream(question, top_chunks):
        answer += token
        yield token

    yield "\n\nSources:\n"

    seen = set()
    for item in top_chunks:
        key = (item["filename"], item["chunk_index"])
        if key in seen:
            continue
        seen.add(key)
        yield f"• {item['filename']} (chunk {item['chunk_index']})\n"

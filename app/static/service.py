from app.rag.retriever import retrieve
from app.rag.llm import ask_llm


def stream_answer(question: str):

    retrieved = retrieve(question)

    if not retrieved:
        yield "No relevant documents found."
        return

    # remove duplicate chunks
    seen = set()
    cleaned = []

    for item in retrieved:

        text = item["text"].strip()

        if text not in seen:

            seen.add(text)
            cleaned.append(item)

    # keep strongest matches only
    cleaned = cleaned[:5]

    context = "\n\n".join(
        x["text"]
        for x in cleaned
    )

    prompt = f"""
You are an enterprise document assistant.

Rules:

- Answer ONLY from supplied context
- If answer unavailable say:
  "I could not find that in uploaded documents"

Context:

{context}


Question:

{question}


Answer:
"""

    final = ""

    for chunk in ask_llm(prompt):

        final += chunk
        yield chunk


    yield "\n\nSources:\n"

    used = set()

    for item in cleaned:

        key = (
            item["filename"],
            item["chunk_index"]
        )

        if key not in used:

            used.add(key)

            yield (
                f"• {item['filename']} "
                f"(chunk {item['chunk_index']})\n"
            )

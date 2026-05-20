import requests

from app.config import settings


def generate_answer(question: str, context_chunks: list[dict]) -> str:

    context = "\n\n".join(

        [

            f"[Source: {chunk['filename']} | Chunk: {chunk['chunk_index']}]\n{chunk['text']}"

            for chunk in context_chunks

        ]

    )


    system_prompt = """

You are an enterprise knowledge assistant.

Answer only using the provided context when possible.

If the answer is not available in the context, clearly say:

"I could not find that information in the indexed documents."

Do not invent policies, numbers, or steps.

Keep answers clear, structured, and useful.

"""


    user_prompt = f"""

Context:

{context}


Question:

{question}


Answer:

"""


    payload = {

        "model": settings.ollama_model,

        "stream": False,

        "messages": [

            {

                "role": "system",

                "content": system_prompt.strip()

            },

            {

                "role": "user",

                "content": user_prompt.strip()

            }

        ]

    }


    response = requests.post(

        f"{settings.ollama_base_url}/api/chat",

        json=payload,

        timeout=300

    )


    response.raise_for_status()

    data = response.json()


    return data["message"]["content"]

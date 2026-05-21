import requests
import json
from app.config import settings


def generate_answer_stream(
    question,
    context_chunks,
    chat_history=None
):

    if chat_history is None:
        chat_history=[]

    context="\n\n".join([
        c["text"]
        for c in context_chunks
    ])

    messages=[

        {
            "role":"system",
            "content":
            """
You are an enterprise assistant.

Use previous conversation history if relevant.

Answer only from supplied context.
"""
        }

    ]

    messages.extend(chat_history)

    messages.append(
        {
            "role":"user",
            "content":
f"""
Context:

{context}

Question:

{question}
"""
        }
    )

    payload={

        "model":
        settings.lmstudio_model,

        "messages":
        messages,

        "stream":True,

        "temperature":0.2
    }


    response=requests.post(
        f"{settings.lmstudio_base_url}/chat/completions",
        json=payload,
        stream=True
    )

    for line in response.iter_lines():

        if line:

            decoded=line.decode()

            if decoded.startswith(
                "data: "
            ):

                data=decoded[6:]

                if data=="[DONE]":
                    break

                try:

                    parsed=json.loads(
                        data
                    )

                    delta=parsed[
                        "choices"
                    ][0]["delta"]

                    content=delta.get(
                        "content",
                        ""
                    )

                    if content:
                        yield content

                except:
                    pass

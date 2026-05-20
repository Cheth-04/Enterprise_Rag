from app.rag.retriever import retrieve_chunks

from app.rag.reranker import reranker

from app.rag.generator import generate_answer


def answer_question(question: str) -> dict:

    retrieved_chunks = retrieve_chunks(question)


    reranked_chunks = reranker.rerank(

        question,

        retrieved_chunks

    )


    answer = generate_answer(

        question,

        reranked_chunks

    )


    return {

        "answer": answer,

        "sources": reranked_chunks

    }

from FlagEmbedding import FlagReranker

from app.config import settings


class Reranker:

    def __init__(self):

        self.model = FlagReranker(

            settings.reranker_model,

            use_fp16=False

        )


    def rerank(self, question: str, chunks: list[dict]) -> list[dict]:

        if not chunks:

            return []


        pairs = [[question, chunk["text"]] for chunk in chunks]

        scores = self.model.compute_score(pairs)


        if not isinstance(scores, list):

            scores = [scores]


        for chunk, score in zip(chunks, scores):

            chunk["rerank_score"] = float(score)


        sorted_chunks = sorted(

            chunks,

            key=lambda item: item["rerank_score"],

            reverse=True

        )


        return sorted_chunks[:settings.top_k_reranked]


reranker = Reranker()

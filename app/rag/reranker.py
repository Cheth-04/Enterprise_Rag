from FlagEmbedding import FlagReranker
from app.config import settings

class Reranker:

    _model=None

    def get_model(self):

        if self._model is None:

            print(
                "Loading reranker..."
            )

            self._model=FlagReranker(
                settings.reranker_model,
                use_fp16=False
            )

        return self._model


    def rerank(
        self,
        question,
        chunks
    ):

        if not chunks:
            return []

        model=self.get_model()

        pairs=[
            [question,c["text"]]
            for c in chunks
        ]

        scores=model.compute_score(
            pairs
        )

        if not isinstance(
            scores,
            list
        ):
            scores=[scores]


        for chunk,score in zip(
            chunks,
            scores
        ):

            chunk[
                "rerank_score"
            ]=float(score)


        chunks.sort(
            key=lambda x:
            x["rerank_score"],
            reverse=True
        )

        return chunks[
            :settings.top_k_reranked
        ]


reranker=Reranker()      

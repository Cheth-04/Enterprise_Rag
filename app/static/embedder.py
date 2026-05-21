from FlagEmbedding import BGEM3FlagModel
from app.config import settings

class Embedder:
    _model = None

    def get_model(self):
        if self._model is None:
            print("Loading embedding model...")
            self._model = BGEM3FlagModel(
                settings.embedding_model,
                use_fp16=False
            )
        return self._model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        model = self.get_model()

        output = model.encode(
            texts,
            batch_size=4,
            max_length=8192
        )

        return output["dense_vecs"].tolist()

    def embed_query(self, query: str) -> list[float]:
        model = self.get_model()

        output = model.encode(
            [query],
            batch_size=1,
            max_length=8192
        )

        return output["dense_vecs"][0].tolist()


embedder = Embedder()

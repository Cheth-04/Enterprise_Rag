from sentence_transformers import SentenceTransformer
from app.config import settings


class Embedder:
    """
    Wraps BAAI/bge-m3 (1024-dim) for both document ingestion
    and query embedding.  Model is loaded once and reused.
    """

    _model = None

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            print(f"[Embedder] Loading model: {settings.embedding_model}")
            self._model = SentenceTransformer(settings.embedding_model)
        return self._model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if isinstance(texts, str):
            texts = [texts]
        model = self._get_model()
        vectors = model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


# Singleton — imported everywhere
embedder = Embedder()

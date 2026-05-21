from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self):
        self.model = SentenceTransformer(
            "BAAI/bge-small-en-v1.5"
        )

    def embed_documents(self, texts):
        if isinstance(texts, str):
            texts = [texts]

        vectors = self.model.encode(
            texts,
            normalize_embeddings=True
        )

        return vectors.tolist()

    def embed_query(self, text):
        return self.embed_documents([text])[0]


embedder = Embedder()

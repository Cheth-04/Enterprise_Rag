from FlagEmbedding import BGEM3FlagModel

from app.config import settings


class Embedder:

    def __init__(self):

        self.model = BGEM3FlagModel(

            settings.embedding_model,

            use_fp16=False

        )


    def embed_documents(self, texts: list[str]) -> list[list[float]]:

        output = self.model.encode(

            texts,

            batch_size=4,

            max_length=8192

        )

        return output["dense_vecs"].tolist()


    def embed_query(self, query: str) -> list[float]:

        output = self.model.encode(

            [query],

            batch_size=1,

            max_length=8192

        )

        return output["dense_vecs"][0].tolist()


embedder = Embedder()

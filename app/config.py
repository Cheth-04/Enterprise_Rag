from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Enterprise RAG API"

    qdrant_url: str
    qdrant_collection: str = "enterprise_docs"

    lmstudio_base_url: str
    lmstudio_model: str = "mistral-7b-instruct"

    embedding_model: str = "BAAI/bge-m3"
    reranker_model: str = "BAAI/bge-reranker-v2-m3"

    top_k_retrieval: int = 12
    top_k_reranked: int = 5

    # Larger chunks = fewer total chunks = much faster indexing on CPU
    # 1200 → 2500: roughly halves chunk count for the same document
    chunk_size: int = 2500
    chunk_overlap: int = 200

    # Hard cap — prevents runaway indexing on huge files
    # 800 chunks × ~2s/batch ≈ ~50s. Raise if you need more coverage.
    max_chunks_per_file: int = 800

    class Config:
        env_file = ".env"


settings = Settings()
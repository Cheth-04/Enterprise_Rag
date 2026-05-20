from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    app_name: str = "Enterprise RAG API"


    qdrant_url: str

    qdrant_collection: str = "enterprise_docs"


    ollama_base_url: str

    ollama_model: str = "qwen3:8b"


    embedding_model: str = "BAAI/bge-m3"

    reranker_model: str = "BAAI/bge-reranker-v2-m3"


    top_k_retrieval: int = 12

    top_k_reranked: int = 5


    chunk_size: int = 1200

    chunk_overlap: int = 200


    class Config:

        env_file = ".env"


settings = Settings()

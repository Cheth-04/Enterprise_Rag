from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Enterprise RAG API"

    # Qdrant
    qdrant_url: str
    qdrant_collection: str = "enterprise_docs"

    # LM Studio
    lmstudio_base_url: str
    lmstudio_model: str = "mistral-7b-instruct"

    # Models
    embedding_model: str = "BAAI/bge-m3"
    reranker_model: str = "BAAI/bge-reranker-v2-m3"

    # Retrieval
    top_k_retrieval: int = 12
    top_k_reranked: int = 5

    # Chunking
    chunk_size: int = 2500
    chunk_overlap: int = 200
    max_chunks_per_file: int = 800

    # Auth — MUST be set in .env
    jwt_secret: str
    admin_username: str
    admin_password: str

    # Widget feature toggle
    collect_user_details: bool = False

    # Limits
    max_file_size_mb: int = 50
    chat_rate_limit: str = "20/minute"

    class Config:
        env_file = ".env"


settings = Settings()
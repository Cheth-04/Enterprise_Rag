from pydantic import BaseModel
from typing import List, Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class ChatRequest(BaseModel):
    question: str


class SourceChunk(BaseModel):
    filename: str
    chunk_index: int
    score: Optional[float] = None
    text_preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]


class IngestResponse(BaseModel):
    filename: str
    chunks_indexed: int
    message: str

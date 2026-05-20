import os

import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException

from fastapi.middleware.cors import CORSMiddleware


from app.schemas import ChatRequest, ChatResponse, SourceChunk, IngestResponse

from app.ingestion.parser import parse_document_to_markdown

from app.ingestion.chunker import chunk_text

from app.ingestion.indexer import index_chunks

from app.rag.service import answer_question


app = FastAPI(

    title="Enterprise RAG API",

    version="1.0.0"

)


app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://192.168.1.41:8000",

        "http://localhost:8000"

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)


UPLOAD_DIR = "/app/uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")

def health_check():

    return {

        "status": "ok",

        "service": "Enterprise RAG API"

    }


@app.post("/ingest", response_model=IngestResponse)

async def ingest_document(file: UploadFile = File(...)):

    try:

        file_path = os.path.join(UPLOAD_DIR, file.filename)


        with open(file_path, "wb") as buffer:

            shutil.copyfileobj(file.file, buffer)


        markdown_text = parse_document_to_markdown(file_path)

        chunks = chunk_text(markdown_text)


        if not chunks:

            raise HTTPException(

                status_code=400,

                detail="No usable text found in uploaded document."

            )


        indexed_count = index_chunks(file.filename, chunks)


        return IngestResponse(

            filename=file.filename,

            chunks_indexed=indexed_count,

            message="Document parsed, chunked, embedded, and indexed successfully."

        )


    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail=f"Document ingestion failed: {str(exc)}"

        )


@app.post("/chat", response_model=ChatResponse)

def chat(request: ChatRequest):

    try:

        result = answer_question(request.question)


        source_items = []


        for chunk in result["sources"]:

            source_items.append(

                SourceChunk(

                    filename=chunk["filename"],

                    chunk_index=chunk["chunk_index"],

                    score=chunk.get("rerank_score"),

                    text_preview=chunk["text"][:220]

                )

            )


        return ChatResponse(

            answer=result["answer"],

            sources=source_items

        )


    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail=f"RAG chat failed: {str(exc)}"

        )

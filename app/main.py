import os
import shutil

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Request
)

from fastapi.responses import StreamingResponse

from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles

from app.auth import verify_user
from app.schemas import LoginRequest

from app.schemas import (
    ChatRequest,
    ChatResponse,
    SourceChunk,
    IngestResponse
)

from app.ingestion.parser import (
    parse_document_to_markdown
)

from app.ingestion.chunker import (
    chunk_text
)

from app.ingestion.indexer import (
    index_chunks
)

from app.rag.service import (
    stream_answer
)

from app.document_manager import (
    list_documents,
    delete_document
)


app = FastAPI(

    title="Enterprise RAG API",

    version="1.0.0"

)


app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static"
)


app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://192.168.1.41:8000",

        "http://localhost:8000",

        "*"

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]

)



UPLOAD_DIR="/app/uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)



@app.middleware("http")
async def disable_cache(
    request: Request,
    call_next
):

    response = await call_next(
        request
    )

    if request.url.path.startswith(
        "/static"
    ):

        response.headers[
            "Cache-Control"
        ]="no-store,no-cache,must-revalidate,max-age=0"

    return response



@app.get("/")
def health_check():

    return {

        "status":"ok",

        "service":
        "Enterprise RAG API"

    }



@app.post(
    "/ingest",
    response_model=IngestResponse
)
async def ingest_document(
    file: UploadFile=File(...)
):

    try:

        file_path=os.path.join(
            UPLOAD_DIR,
            file.filename
        )


        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        markdown_text=(
            parse_document_to_markdown(
                file_path
            )
        )


        chunks=chunk_text(
            markdown_text
        )


        if not chunks:

            raise HTTPException(

                status_code=400,

                detail=
                "No usable text found in uploaded document."

            )


        indexed_count=(
            index_chunks(
                file.filename,
                chunks
            )
        )


        return IngestResponse(

            filename=
            file.filename,

            chunks_indexed=
            indexed_count,

            message=
            "Document parsed, chunked, embedded, and indexed successfully."

        )


    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail=
            f"Document ingestion failed: {str(exc)}"

        )



@app.post(
    "/chat",
    response_class=StreamingResponse
)
def chat(
    request: ChatRequest
):

    try:

        return StreamingResponse(

            stream_answer(
                request.question
            ),

            media_type=
            "text/plain"

        )


    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail=
            f"RAG chat failed: {str(exc)}"

        )



@app.post("/chat-stream")
def chat_stream(
    request: ChatRequest
):

    return StreamingResponse(

        stream_answer(
            request.question
        ),

        media_type=
        "text/plain"

    )



@app.get("/documents")
def get_documents():

    return {

        "documents":
        list_documents()

    }



@app.delete(
    "/documents/{filename}"
)
def remove_document(
    filename:str
):

    delete_document(
        filename
    )

    return {

        "message":
        f"{filename} deleted"

    } 

@app.post("/login")
def login(
    req:LoginRequest
):

    token=verify_user(
        req.username,
        req.password
    )

    if not token:

        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    return{

        "token":
        token
    }

import os
import shutil
import uuid
import threading

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import verify_user, require_admin
from app.schemas import LoginRequest, ChatRequest, IngestResponse
from app.ingestion.parser import parse_document_to_markdown
from app.ingestion.chunker import chunk_text
from app.ingestion.indexer import index_chunks
from app.rag.service import stream_answer
from app.document_manager import list_documents, delete_document
from app.job_store import create_job, update_job, read_job


# ── App ──────────────────────────────────────────────────────────
app = FastAPI(title="Enterprise RAG API", version="1.0.0")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt"}


# ── Background ingestion worker ──────────────────────────────────
def _ingest_worker(job_id: str, file_path: str, filename: str):
    try:
        update_job(job_id, status="parsing",  message="Parsing document…")
        markdown_text = parse_document_to_markdown(file_path)

        update_job(job_id, status="chunking", message="Splitting into chunks…")
        chunks = chunk_text(markdown_text)

        if not chunks:
            update_job(job_id, status="error",
                       message="No usable text extracted. File may be empty or image-only.")
            return

        update_job(job_id, status="indexing",
                   message=f"Embedding & indexing {len(chunks)} chunks…")
        indexed_count = index_chunks(filename, chunks)

        update_job(job_id, status="done",
                   message=f"Indexed {indexed_count} chunks successfully.",
                   chunks_indexed=indexed_count)

    except Exception as exc:
        update_job(job_id, status="error", message=str(exc))

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


# ── Cache-control middleware ─────────────────────────────────────
@app.middleware("http")
async def disable_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static"):
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
    return response


# ── Public routes ────────────────────────────────────────────────
@app.get("/")
def health_check():
    return {"status": "ok", "service": "Enterprise RAG API"}


@app.post("/login")
def login(req: LoginRequest):
    token = verify_user(req.username, req.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": token}


@app.post("/chat")
def chat(request: ChatRequest):
    try:
        return StreamingResponse(
            stream_answer(request.question),
            media_type="text/plain",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {exc}")


# ── Admin — Ingest ───────────────────────────────────────────────
@app.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    _admin: dict = Depends(require_admin),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, PPTX, TXT",
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job_id = str(uuid.uuid4())
    create_job(job_id, filename=file.filename)

    threading.Thread(
        target=_ingest_worker,
        args=(job_id, file_path, file.filename),
        daemon=True,
    ).start()

    return {"job_id": job_id, "status": "queued", "filename": file.filename}


@app.get("/ingest/status/{job_id}")
def ingest_status(job_id: str, _admin: dict = Depends(require_admin)):
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ── Admin — Documents ────────────────────────────────────────────
@app.get("/documents")
def get_documents(_admin: dict = Depends(require_admin)):
    return {"documents": list_documents()}


@app.delete("/documents/{filename}")
def remove_document(filename: str, _admin: dict = Depends(require_admin)):
    delete_document(filename)
    return {"message": f"{filename} deleted successfully"}

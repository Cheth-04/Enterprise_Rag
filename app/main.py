import os
import shutil
import uuid
import threading
import time
import logging
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from qdrant_client import QdrantClient

from app.auth import verify_user, require_admin
from app.config import settings
from app.schemas import LoginRequest, ChatRequest, IngestResponse
from app.ingestion.parser import parse_document_to_markdown
from app.ingestion.chunker import chunk_text
from app.ingestion.indexer import index_chunks
from app.rag.service import stream_answer
from app.document_manager import list_documents, delete_document
from app.job_store import create_job, update_job, read_job
from app.leads_store import add_lead, get_all_leads

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate limiter ─────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── App ──────────────────────────────────────────────────────────
app = FastAPI(title="Enterprise RAG API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploads"
JOBS_DIR   = "/app/uploads/jobs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(JOBS_DIR,   exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt",".md"}
MAX_FILE_BYTES = settings.max_file_size_mb * 1024 * 1024


# ── Background: job file cleanup (runs every hour) ───────────────
def _cleanup_old_jobs():
    while True:
        time.sleep(3600)
        cutoff = time.time() - 86400   # 24 hours
        for fname in os.listdir(JOBS_DIR):
            fpath = os.path.join(JOBS_DIR, fname)
            try:
                if os.path.getmtime(fpath) < cutoff:
                    os.remove(fpath)
                    logger.info(f"Cleaned up old job file: {fname}")
            except Exception:
                pass

threading.Thread(target=_cleanup_old_jobs, daemon=True).start()


# ── Background: ingestion worker ─────────────────────────────────
def _ingest_worker(job_id: str, file_path: str, filename: str):
    try:
        # Auto-delete old chunks for this file (duplicate handling)
        try:
            delete_document(filename)
            logger.info(f"Deleted existing chunks for '{filename}' before re-indexing")
        except Exception:
            pass

        update_job(job_id, status="parsing", message="Parsing document…")
        markdown_text = parse_document_to_markdown(file_path)

        update_job(job_id, status="chunking", message="Splitting into chunks…")
        chunks = chunk_text(markdown_text)

        if not chunks:
            update_job(job_id, status="error",
                       message="No usable text extracted. File may be empty or image-only.")
            return

        update_job(job_id, status="indexing",
                   message=f"Embedding & indexing {len(chunks)} chunks…")
        indexed_count = index_chunks(filename, chunks, job_id=job_id)

        update_job(job_id, status="done",
                   message=f"Indexed {indexed_count} chunks successfully.",
                   chunks_indexed=indexed_count)
        logger.info(f"Indexed '{filename}' — {indexed_count} chunks")

    except Exception as exc:
        logger.error(f"Ingestion failed for '{filename}': {exc}")
        update_job(job_id, status="error", message=str(exc))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


# ── Middleware: cache control ─────────────────────────────────────
@app.middleware("http")
async def disable_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static"):
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
    return response


# ── Health check ─────────────────────────────────────────────────
@app.get("/health")
def health():
    try:
        QdrantClient(url=settings.qdrant_url).get_collections()
        return {"status": "ok", "qdrant": "ok"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Qdrant unreachable: {e}")


# ── Widget config (public) ────────────────────────────────────────
@app.get("/widget-config")
def widget_config():
    """Returns feature flags for the embedded widget."""
    return {"collect_user_details": settings.collect_user_details}


# ── Lead capture (public) ─────────────────────────────────────────
class LeadRequest(BaseModel):
    name:  str
    phone: str
    email: str


@app.post("/leads")
def submit_lead(lead: LeadRequest):
    if not lead.name.strip() or not lead.email.strip():
        raise HTTPException(status_code=400, detail="Name and email are required")
    lead_id = add_lead(lead.name.strip(), lead.phone.strip(), lead.email.strip())
    logger.info(f"New lead captured: {lead.email}")
    return {"lead_id": lead_id}


@app.get("/leads")
def get_leads(_admin: dict = Depends(require_admin)):
    """Admin only — returns all captured leads."""
    return {"leads": get_all_leads()}


# ── Auth (public) ─────────────────────────────────────────────────
@app.post("/login")
def login(req: LoginRequest):
    token = verify_user(req.username, req.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": token}


# ── Chat (public, rate-limited) ───────────────────────────────────
@app.post("/chat")
@limiter.limit(settings.chat_rate_limit)
def chat(request: Request, body: ChatRequest):
    try:
        return StreamingResponse(
            stream_answer(body.question),
            media_type="text/plain",
        )
    except Exception as exc:
        logger.error(f"Chat error: {exc}")
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {exc}")


# ── Ingest (admin only) ───────────────────────────────────────────
@app.post("/ingest", response_model=IngestResponse)
async def ingest_document(
    file: UploadFile = File(...),
    _admin: dict = Depends(require_admin),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, PPTX, TXT ,MD",
        )

    # File size check
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {settings.max_file_size_mb} MB.",
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    job_id = str(uuid.uuid4())
    create_job(job_id, filename=file.filename)

    threading.Thread(
        target=_ingest_worker,
        args=(job_id, file_path, file.filename),
        daemon=True,
    ).start()

    logger.info(f"Ingest job {job_id} started for '{file.filename}'")
    return IngestResponse(
        job_id=job_id,
        filename=file.filename,
        chunks_indexed=0,
        message=f"Job {job_id} queued.",
    )


@app.get("/ingest/status/{job_id}")
def ingest_status(job_id: str, _admin: dict = Depends(require_admin)):
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ── Documents (admin only) ────────────────────────────────────────
@app.get("/documents")
def get_documents(_admin: dict = Depends(require_admin)):
    return {"documents": list_documents()}


@app.delete("/documents/{filename}")
def remove_document(filename: str, _admin: dict = Depends(require_admin)):
    delete_document(filename)
    logger.info(f"Deleted document: {filename}")
    return {"message": f"{filename} deleted successfully"}

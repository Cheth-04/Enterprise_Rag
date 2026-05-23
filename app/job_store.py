"""
File-based job store.
Each job is a JSON file at /app/uploads/jobs/<job_id>.json
Works across worker restarts and doesn't require a database.
"""
import json
import os
from datetime import datetime

JOBS_DIR = "/app/uploads/jobs"
os.makedirs(JOBS_DIR, exist_ok=True)


def _path(job_id: str) -> str:
    return os.path.join(JOBS_DIR, f"{job_id}.json")


def create_job(job_id: str, filename: str) -> dict:
    job = {
        "job_id": job_id,
        "status": "queued",
        "message": "Queued for processing…",
        "filename": filename,
        "chunks_indexed": 0,
        "started_at": datetime.utcnow().isoformat(),
    }
    _write(job_id, job)
    return job


def update_job(job_id: str, **kwargs) -> None:
    job = read_job(job_id) or {}
    job.update(kwargs)
    _write(job_id, job)


def read_job(job_id: str) -> dict | None:
    try:
        with open(_path(job_id), "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def _write(job_id: str, data: dict) -> None:
    tmp = _path(job_id) + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.replace(tmp, _path(job_id))   # atomic rename
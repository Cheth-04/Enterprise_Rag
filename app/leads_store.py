"""
Simple file-based lead store.
Leads saved to /app/uploads/leads.json — persists across restarts.
"""
import json
import os
import uuid
import threading
from datetime import datetime

LEADS_FILE = "/app/uploads/leads.json"
_lock = threading.Lock()


def _read() -> list:
    try:
        with open(LEADS_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def _write(leads: list) -> None:
    tmp = LEADS_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(leads, f, indent=2)
    os.replace(tmp, LEADS_FILE)


def add_lead(name: str, phone: str, email: str) -> str:
    lead_id = str(uuid.uuid4())
    with _lock:
        leads = _read()
        leads.append({
            "id":        lead_id,
            "name":      name,
            "phone":     phone,
            "email":     email,
            "timestamp": datetime.utcnow().isoformat(),
        })
        _write(leads)
    return lead_id


def get_all_leads() -> list:
    with _lock:
        return _read()
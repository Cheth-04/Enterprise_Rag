from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

# ── Config ──────────────────────────────────────────────────────
SECRET = "enterprise-rag-secret"   # move to .env for production
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 1

# Hard-coded users — replace with a DB in production
USERS: dict[str, dict] = {
    "admin": {"password": "admin123", "role": "admin"},
    "user":  {"password": "user123",  "role": "user"},
}

security = HTTPBearer()


# ── Token helpers ────────────────────────────────────────────────

def _create_token(username: str) -> str:
    payload = {
        "sub": username,
        "role": USERS[username]["role"],
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def verify_user(username: str, password: str) -> str | None:
    """Returns a signed JWT if credentials are valid, else None."""
    user = USERS.get(username)
    if not user or user["password"] != password:
        return None
    return _create_token(username)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── FastAPI dependencies ─────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Injects the decoded token payload. Raises 401 if token is bad."""
    return _decode_token(credentials.credentials)


def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Raises 403 if the authenticated user is not an admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required for this operation",
        )
    return current_user

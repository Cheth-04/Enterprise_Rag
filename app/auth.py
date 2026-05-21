from fastapi import HTTPException
from fastapi.security import HTTPBearer
from jose import jwt
from datetime import datetime, timedelta

SECRET="enterprise-rag-secret"

security=HTTPBearer()

USERS={

    "admin":{
        "password":"admin123",
        "role":"admin"
    },

    "user":{
        "password":"user123",
        "role":"user"
    }

}


def create_token(username):

    payload={

        "sub":username,

        "role":
        USERS[username]["role"],

        "exp":
        datetime.utcnow()
        +timedelta(days=1)

    }

    return jwt.encode(
        payload,
        SECRET,
        algorithm="HS256"
    )



def verify_user(
    username,
    password
):

    if username not in USERS:

        return None

    if USERS[
        username
    ]["password"]!=password:

        return None

    return create_token(
        username
    )

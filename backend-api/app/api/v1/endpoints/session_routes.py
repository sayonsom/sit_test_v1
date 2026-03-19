from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
import os
from jose import jwt, JWTError


session = APIRouter(tags=["session"])
SIGNING_KEY = os.getenv("VHVL_SIGNING_KEY")


@session.post("/session/exchange")
async def exchange(req: Request):
    body = await req.json()
    token = body.get("ltisid")
    if not token:
        raise HTTPException(400, "missing token")
    try:
        _ = jwt.decode(token, SIGNING_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(400, "bad token")

    resp = Response(status_code=204)
    resp.set_cookie(
        "vhvl",
        token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=3600,
    )
    return resp


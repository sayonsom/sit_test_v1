from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
import os
import time
import base64
import urllib.parse as up
import httpx
from jose import jwt, jwk  # noqa: F401
from jose.utils import base64url_decode  # noqa: F401


router = APIRouter(prefix="/lti", tags=["lti"])

CFG = {
    "ISSUER": os.getenv("ISSUER"),
    "AUTH": os.getenv("AUTHORIZATION_ENDPOINT"),
    "JWKS": os.getenv("JWKS_URL"),
    "CLIENT_ID": os.getenv("CLIENT_ID"),
    "DEPLOYMENT_ID": os.getenv("DEPLOYMENT_ID"),
    "REDIRECT_FE": os.getenv("REDIRECT_FE"),
    "SIGNING_KEY": os.getenv("VHVL_SIGNING_KEY"),
}
STATE: dict[str, dict] = {}


# Accept both GET (query params) and POST (form) for OIDC Login Initiation
@router.api_route("/login", methods=["GET", "POST"])
async def lti_login(req: Request):
    # Read params from query string for GET, or form body for POST
    if req.method == "POST":
        data = await req.form()
    else:
        data = req.query_params

    if data.get("iss") != CFG["ISSUER"]:
        raise HTTPException(400, "bad issuer")

    state = base64.urlsafe_b64encode(str(time.time()).encode()).decode()
    nonce = base64.urlsafe_b64encode(os.urandom(18)).decode()
    STATE[state] = {"nonce": nonce, "ts": time.time()}

    # Prefer EXTERNAL_BASE_URL if provided (e.g., Cloud Run public URL)
    external_base = os.getenv("EXTERNAL_BASE_URL")
    if external_base:
        redirect_uri = f"{external_base.rstrip('/')}/lti/launch"
    else:
        redirect_uri = f"{req.base_url}lti/launch".rstrip("/")

    params = {
        "scope": "openid",
        "response_type": "id_token",
        "response_mode": "form_post",
        "prompt": "none",
        "client_id": CFG["CLIENT_ID"],
        "redirect_uri": redirect_uri,
        "login_hint": data.get("login_hint"),
        "lti_message_hint": data.get("lti_message_hint"),
        "state": state,
        "nonce": nonce,
    }
    return RedirectResponse(f'{CFG["AUTH"]}?{up.urlencode(params)}', status_code=302)


@router.post("/launch")
async def lti_launch(req: Request):
    form = await req.form()
    state = form.get("state")
    id_token = form.get("id_token")
    if state not in STATE:
        raise HTTPException(400, "state missing/expired")
    nonce = STATE.pop(state)["nonce"]

    async with httpx.AsyncClient() as client:
        jwks = (await client.get(CFG["JWKS"]))
        jwks_json = jwks.json()

    claims = jwt.decode(
        id_token,
        jwks_json,
        algorithms=["RS256"],
        issuer=CFG["ISSUER"],
        options={"verify_aud": False},
    )
    if claims.get("nonce") != nonce:
        raise HTTPException(400, "nonce mismatch")
    if (
        claims.get("https://purl.imsglobal.org/spec/lti/claim/deployment_id")
        != CFG["DEPLOYMENT_ID"]
    ):
        raise HTTPException(400, "wrong deployment")

    vhvl_claims = {
        "sub": claims.get("sub"),
        "email": claims.get("email"),
        "context": claims.get(
            "https://purl.imsglobal.org/spec/lti/claim/context", {}
        ),
        "roles": claims.get("https://purl.imsglobal.org/spec/lti/claim/roles", []),
        "exp": int(time.time()) + 3600,
    }
    vhvl_token = jwt.encode(vhvl_claims, CFG["SIGNING_KEY"], algorithm="HS256")

    return RedirectResponse(
        f'{CFG["REDIRECT_FE"]}?ltisid={vhvl_token}', status_code=302
    )


@router.get("")
async def lti_status():
    return JSONResponse({"status": "ok", "issuer": CFG["ISSUER"]})


import os
import secrets
from dataclasses import dataclass, field
from typing import Any

from fastapi import Depends, Header, HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt, jwk
import requests
from jose.utils import base64url_decode
from starlette.status import HTTP_403_FORBIDDEN
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.backends import default_backend

# Optional Auth0 compatibility. Prefer environment configuration in all deployments.
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
API_AUDIENCE = os.getenv("API_AUDIENCE", "")
API_SERVICE_TOKEN = os.getenv("API_SERVICE_TOKEN", "")
BACKEND_API_JWT_SECRET = os.getenv("BACKEND_API_JWT_SECRET") or os.getenv("VHVL_SIGNING_KEY", "")
BACKEND_API_JWT_AUDIENCE = os.getenv("BACKEND_API_JWT_AUDIENCE", "")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"https://{AUTH0_DOMAIN}/oauth/token")


@dataclass(frozen=True)
class AuthenticatedActor:
    subject: str
    email: str | None
    roles: set[str] = field(default_factory=set)
    auth_method: str = "unknown"
    course_id: str | None = None
    claims: dict[str, Any] = field(default_factory=dict)

    def has_any_role(self, *roles: str) -> bool:
        return bool(self.roles.intersection(roles))

    @property
    def is_service(self) -> bool:
        return "service" in self.roles

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles

    @property
    def is_teacher(self) -> bool:
        return "teacher" in self.roles or "admin" in self.roles

    @property
    def is_student(self) -> bool:
        return "student" in self.roles


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    if isinstance(value, str):
        return [value]
    return []


def _normalize_role(role: Any) -> str | None:
    if not isinstance(role, str):
        return None
    value = role.strip().lower()
    if not value:
        return None
    role_name = value.rsplit("#", 1)[-1].rsplit("/", 1)[-1]
    if role_name in {"learner", "student"}:
        return "student"
    if role_name in {"instructor", "teachingassistant", "ta", "teacher", "staff"}:
        return "teacher"
    if role_name in {"administrator", "admin", "superadmin"}:
        return "admin"
    if role_name == "service":
        return "service"
    return role_name


def _normalize_roles(raw_roles: Any, auth_method: str | None = None) -> set[str]:
    roles = {
        normalized
        for normalized in (_normalize_role(role) for role in _as_list(raw_roles))
        if normalized
    }
    if not roles:
        if auth_method == "lti":
            roles.add("student")
        elif auth_method == "staff":
            roles.add("teacher")
    return roles


def _extract_email(claims: dict[str, Any]) -> str | None:
    for key in ("email", "upn", "unique_name", "preferred_username"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().lower()
    user = claims.get("user")
    if isinstance(user, dict):
        return _extract_email(user)
    return None


def _extract_subject(claims: dict[str, Any], email: str | None) -> str:
    for key in ("sub", "user_id", "oid"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return email or "unknown"


def _extract_course_id(claims: dict[str, Any]) -> str | None:
    for key in ("course_id", "context_id"):
        value = claims.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    course = claims.get("course")
    if isinstance(course, dict):
        for key in ("course_id", "context_id", "id"):
            value = course.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()
    context = claims.get("context")
    if isinstance(context, dict):
        value = context.get("id")
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


async def require_service_token(
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
):
    if not API_SERVICE_TOKEN:
        raise HTTPException(status_code=503, detail="Service token authentication is not configured")
    if not x_service_token or not secrets.compare_digest(x_service_token, API_SERVICE_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid service token")
    return {"sub": "trusted-service", "roles": ["service"]}


async def get_authenticated_actor(
    authorization: str | None = Header(default=None),
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
) -> AuthenticatedActor:
    if API_SERVICE_TOKEN and x_service_token and secrets.compare_digest(x_service_token, API_SERVICE_TOKEN):
        return AuthenticatedActor(
            subject="trusted-service",
            email=None,
            roles={"service", "admin"},
            auth_method="service",
            claims={"sub": "trusted-service", "roles": ["service", "admin"]},
        )

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    if not BACKEND_API_JWT_SECRET:
        raise HTTPException(status_code=503, detail="Backend API token validation is not configured")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        decode_kwargs: dict[str, Any] = {
            "key": BACKEND_API_JWT_SECRET,
            "algorithms": ["HS256"],
        }
        if BACKEND_API_JWT_AUDIENCE:
            decode_kwargs["audience"] = BACKEND_API_JWT_AUDIENCE
        else:
            decode_kwargs["options"] = {"verify_aud": False}
        claims = jwt.decode(token, **decode_kwargs)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired bearer token")

    auth_method = str(claims.get("auth_method") or claims.get("typ") or "unknown")
    email = _extract_email(claims)
    roles = _normalize_roles(claims.get("roles"), auth_method=auth_method)
    subject = _extract_subject(claims, email)
    return AuthenticatedActor(
        subject=subject,
        email=email,
        roles=roles,
        auth_method=auth_method,
        course_id=_extract_course_id(claims),
        claims=claims,
    )


async def get_optional_authenticated_actor(
    authorization: str | None = Header(default=None),
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
) -> AuthenticatedActor | None:
    if not authorization and not x_service_token:
        return None
    return await get_authenticated_actor(authorization=authorization, x_service_token=x_service_token)


def require_actor_with_any_role(*roles: str):
    required = set(roles)

    async def checker(
        actor: AuthenticatedActor = Depends(get_authenticated_actor),
    ) -> AuthenticatedActor:
        if actor.roles.intersection(required):
            return actor
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return checker


require_authenticated_user = get_authenticated_actor
require_staff_actor = require_actor_with_any_role("teacher", "admin", "service")
require_admin_or_service_actor = require_actor_with_any_role("admin", "service")

def fetch_auth0_public_key(auth0_domain):
    if not auth0_domain:
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Auth0 domain is not configured")
    jwks_uri = f"https://{auth0_domain}/.well-known/jwks.json"
    jwks = requests.get(jwks_uri).json()
    key_data = jwks['keys'][0]  # Assuming you want the first key

    # Construct public key
    public_key = jwk.construct(key_data)
    return public_key.to_pem()

#Get current user
def get_current_user(token: str = Security(oauth2_scheme)):
    public_key = fetch_auth0_public_key(AUTH0_DOMAIN)
    try:
        # Decoding the JWT token
        payload = jwt.decode(token, public_key, algorithms=["RS256"])
    except JWTError:
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials while trying to get current user")
    return payload

def get_current_user_roles(token: str = Security(oauth2_scheme)):
    public_key = fetch_auth0_public_key(AUTH0_DOMAIN)
    try:
        # Decoding the JWT token
        payload = jwt.decode(token, public_key, algorithms=["RS256"])
    except JWTError:
        raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials")

    roles_namespace = 'http://localhost:3100/roles'
    roles = payload.get(roles_namespace, [])
    return roles

def require_role(required_role: str):
    def role_checker(token: str = Security(oauth2_scheme)):
        roles = get_current_user_roles(token)
        if required_role not in roles:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return roles
    return role_checker

def get_rsa_key(token):
    if not AUTH0_DOMAIN:
        raise Exception('Auth0 domain is not configured')
    # Obtain the JWKS from Auth0's endpoint
    jwks_url = f'https://{AUTH0_DOMAIN}/.well-known/jwks.json'
    jwks = requests.get(jwks_url).json()

    # Decode the JWT header
    unverified_header = jwt.get_unverified_header(token)

    # Find the key in the JWKS that matches the key ID from the JWT header
    rsa_key = {}
    if 'kid' not in unverified_header:
        raise Exception('Authorization malformed')

    for key in jwks['keys']:
        if key['kid'] == unverified_header['kid']:
            # Construct the public key
            rsa_key = {
                'kty': key['kty'],
                'kid': key['kid'],
                'use': key['use'],
                'n': key['n'],
                'e': key['e']
            }
    if rsa_key:
        # Construct a public key
        public_key = jwk.construct(rsa_key)
        return public_key.to_pem()
    else:
        raise Exception('Public key not found.')

def validate_jwt(token: str = Security(oauth2_scheme)):
    try:
        # Decode the token
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = get_rsa_key(token)
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=['RS256'],
            audience=API_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail='Could not validate credentials',
            headers={"WWW-Authenticate": "Bearer"},
        )

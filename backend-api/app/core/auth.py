from fastapi import HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt, jwk
import requests
from jose.utils import base64url_decode
from starlette.status import HTTP_403_FORBIDDEN
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.backends import default_backend

# Your Auth0 domain and API audience
AUTH0_DOMAIN = 'dev-o4fxv2xy7kvnxb0d.us.auth0.com'
API_AUDIENCE = 'http://localhost:3100/'


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"https://{AUTH0_DOMAIN}/oauth/token")

def fetch_auth0_public_key(auth0_domain):
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
        rsa_key = get_rsa_key(unverified_header)  # Implement this function to fetch the RSA key
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

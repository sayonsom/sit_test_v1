# HVVL LMS UAT Local-Server Deployment

This deployment path runs the complete UAT stack on the server:

- `virtuallab`: React/nginx frontend
- `lti-backend`: Brightspace LTI and staff OIDC session service
- `backend-api`: local FastAPI course/results API
- `postgres`: local PostgreSQL database
- `redis`: local session store

The frontend keeps `REACT_APP_API_URL=/api/v1`; nginx proxies that path to the
local `backend-api` container. This UAT path does not use the old Cloud Run API.

## 1. Pull The Shipped Repo

On the UAT server:

```sh
cd /opt/sit_test_v1

# Preserve the server-owned secret file before pulling the release that stops
# tracking .env.uat.
install -d -m 700 "$HOME/.config/hvvl"
if [ -f .env.uat ]; then
  install -m 600 .env.uat "$HOME/.config/hvvl/.env.uat"
fi

git fetch origin
git checkout main
git pull --ff-only origin main

if [ -f "$HOME/.config/hvvl/.env.uat" ]; then
  install -m 600 "$HOME/.config/hvvl/.env.uat" .env.uat
fi
```

If deploying a security-fix branch before merge, check out that branch instead.

## 2. Create Or Update `.env.uat`

Keep this file out of git. The repository contains only `.env.uat.example`.

```sh
test -f .env.uat || cp .env.uat.example .env.uat
chmod 600 .env.uat
```

Replace every angle-bracket value in `.env.uat`. The Compose release is pinned
to disabled API docs and debug routes, so those switches are not accepted from
the environment.

`CLIENT_ID` and `DEPLOYMENT_ID` are the public registration identifiers shown
in the SIT Brightspace LTI 1.3 tool registration. They are not random secrets.
The values must match the registration that launches this UAT tool. If the
registration has more than one accepted client or deployment, put the complete
comma-separated allow-list in `LTI_CLIENT_IDS` or `LTI_DEPLOYMENT_IDS`.

`REACT_APP_AAD_CLIENT_ID` is also a public registration identifier, but it must
come from the SIT ADFS/OIDC application registration. It must not be generated
randomly. The Compose readiness gate requires both the client ID and authority
because staff sign-in is part of this deployment.

The Brightspace registration must use these exact UAT endpoints:

- OIDC login initiation URL: `https://hvlabonline-uat.singaporetech.edu.sg/lti/login`
- Redirect/launch URL: `https://hvlabonline-uat.singaporetech.edu.sg/lti/launch`
- OpenID Connect issuer: `https://xsitestg.singaporetech.edu.sg`
- Brightspace JWKS URL: `https://xsitestg.singaporetech.edu.sg/d2l/.well-known/jwks`

Generate separate random values for `POSTGRES_PASSWORD`,
`BACKEND_API_SERVICE_TOKEN`, `BACKEND_API_JWT_SECRET`, and
`LOCAL_STORAGE_SIGNING_KEY` on the UAT server with:

```sh
openssl rand -base64 48
```

Do not reuse the service token, JWT secret, or storage signing key. Readiness
requires each value to be at least 32 characters and rejects placeholders or
reused signing values.

## 3. Deploy The Local Stack

```sh
docker compose --env-file .env.uat -f docker-compose.uat.yml config --quiet
docker compose --env-file .env.uat -f docker-compose.uat.yml pull
docker compose --env-file .env.uat -f docker-compose.uat.yml build --pull --no-cache virtuallab backend-api lti-backend
docker compose --env-file .env.uat -f docker-compose.uat.yml up -d --remove-orphans
docker compose --env-file .env.uat -f docker-compose.uat.yml ps
```

This release changes the frontend, `backend-api`, and `lti-backend`; all three
images must be rebuilt. PostgreSQL and Redis data volumes must be retained.
Existing in-flight LTI state expires within five minutes, so users should start
a fresh Brightspace launch after deployment.

This release replaces session tokens in browser URLs with one-time login codes.
Old in-flight launch URLs cannot be resumed after deployment; start a new launch
from Brightspace.

Staff listed in `STAFF_ADMIN_EMAILS` must log out and sign in again after deployment so their refreshed `vhvl_api_token` includes the `admin` role.

## 4. Apply DB Hardening To Existing Volumes

For a fresh `postgres_data` volume, the base schema and seed data are loaded by
the Postgres image. For an existing UAT volume, apply the additive hardening
migration after taking a backup:

```sh
docker compose --env-file .env.uat -f docker-compose.uat.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "uat-backup-$(date +%Y%m%d-%H%M%S).sql"

docker compose --env-file .env.uat -f docker-compose.uat.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < backend-api/sql/2026-06-09-rbac-security-hardening.sql
```

Review any duplicate/null preflight output before enabling stricter unique or
not-null constraints that are intentionally left commented in the migration.

## 5. Smoke Test

```sh
sh scripts/verify-deployed-vapt-controls.sh \
  https://hvlabonline-uat.singaporetech.edu.sg
```

Expected unauthenticated responses:

- `/health`: `200`
- `/lti/health/ready`: `200` with `{"status":"ready"}`
- `/api/v1/auth/me`: `401`
- `/api/v1/students/`: `401`
- `/api/v1/generate-signed-url/`: `401`

If readiness is `503`, inspect only the named failed checks and correct
`.env.uat`; do not replace Brightspace IDs with random values:

```sh
docker compose --env-file .env.uat -f docker-compose.uat.yml logs --tail=200 lti-backend
```

Then launch the tool from `D2L Training SandBox14 (VHVL Test)`. A direct browser
visit to `/lti/launch` is not a valid test because Brightspace must supply the
signed ID token and one-time state.

## 6. Edge Configuration

The platform team must configure Cloudflare or any upstream caching layer to
bypass cache for the exact path `/env-config.js`, then purge any previously
cached object for that path. The application sends `Cache-Control`,
`CDN-Cache-Control`, `Cloudflare-CDN-Cache-Control`, and `Surrogate-Control`
no-store directives, but the edge rule must not override them.
Cloudflare consumes its service-specific header instead of forwarding it to
the browser; the public verifier therefore checks the forwarded
`CDN-Cache-Control` directive and requires `cf-cache-status` not to be `HIT`.

Cloudflare and AWS load-balancer cookies are platform-managed. Record their
owner, purpose, lifetime, domain/path, and supported flags in the platform
cookie register. Disable load-balancer stickiness when it is not required;
otherwise document the provider-controlled attributes and approved exception.

## 7. Rerun Retest

```sh
python3 scripts/hvvl_vapt_retest.py \
  --api-base https://hvlabonline-uat.singaporetech.edu.sg/api/v1 \
  --uat-url https://hvlabonline-uat.singaporetech.edu.sg/ \
  --out output/evidence/retest-uat-local-post-deploy \
  --include-auth-gate-posts
```

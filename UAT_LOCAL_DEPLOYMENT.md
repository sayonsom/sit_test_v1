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
git fetch origin
git checkout main
git pull --ff-only origin main
```

If deploying a security-fix branch before merge, check out that branch instead.

## 2. Create Or Update `.env.uat`

Keep this file out of git.

```sh
cat > .env.uat <<'EOF'
FRONTEND_PORT=3000

CLIENT_ID=<brightspace-lti-client-id>
DEPLOYMENT_ID=<brightspace-lti-deployment-id>
ISSUER=https://xsitestg.singaporetech.edu.sg
AUTHORIZATION_ENDPOINT=https://xsitestg.singaporetech.edu.sg/d2l/lti/authenticate
KEY_SET_URL=https://xsitestg.singaporetech.edu.sg/d2l/.well-known/jwks

TOOL_URL=https://hvlabonline-uat.singaporetech.edu.sg
FRONTEND_URL=https://hvlabonline-uat.singaporetech.edu.sg
ALLOWED_ORIGINS=https://hvlabonline-uat.singaporetech.edu.sg,https://xsitestg.singaporetech.edu.sg
CORS_ALLOWED_ORIGINS=https://hvlabonline-uat.singaporetech.edu.sg,https://xsitestg.singaporetech.edu.sg
CSP_FRAME_ANCESTORS='self' https://hvlabonline-uat.singaporetech.edu.sg https://xsitestg.singaporetech.edu.sg

REACT_APP_AAD_CLIENT_ID=<staff-adfs-client-id>
REACT_APP_AAD_AUTHORITY=https://fs-uat.singaporetech.edu.sg/adfs
REACT_APP_AAD_REDIRECT_URI=https://hvlabonline-uat.singaporetech.edu.sg/oauth2/callback
REACT_APP_AAD_SCOPES=openid
REACT_APP_AAD_ALLOWED_EMAIL_DOMAIN=singaporetech.edu.sg
REACT_APP_AAD_ALLOWED_EMAILS=dhivya.sampathkumar@singaporetech.edu.sg,munhin.yong@singaporetech.edu.sg,stlatest01@singaporetech.edu.sg,G12069@singaporetech.edu.sg
STAFF_ADMIN_EMAILS=munhin.yong@singaporetech.edu.sg

POSTGRES_DB=aligndb
POSTGRES_USER=alignuser
POSTGRES_PASSWORD=<strong-uat-db-password>

BACKEND_API_SERVICE_TOKEN=<strong-random-service-token>
BACKEND_API_JWT_SECRET=<strong-random-jwt-secret>
BACKEND_API_JWT_AUDIENCE=hvvl-backend-api
LOCAL_STORAGE_SIGNING_KEY=<strong-random-file-url-signing-key>

ENABLE_API_DOCS=false
ENABLE_DEBUG_ROUTES=false
DEBUG=false
LOG_LEVEL=INFO
EOF

chmod 600 .env.uat
```

Generate random values on the UAT server with:

```sh
openssl rand -base64 48
```

## 3. Deploy The Local Stack

```sh
docker compose --env-file .env.uat -f docker-compose.uat.yml pull
docker compose --env-file .env.uat -f docker-compose.uat.yml build --pull
docker compose --env-file .env.uat -f docker-compose.uat.yml up -d --remove-orphans
docker compose --env-file .env.uat -f docker-compose.uat.yml ps
```

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
curl -i https://hvlabonline-uat.singaporetech.edu.sg/health
curl -i https://hvlabonline-uat.singaporetech.edu.sg/env-config.js
curl -i https://hvlabonline-uat.singaporetech.edu.sg/api/v1/auth/me
curl -i https://hvlabonline-uat.singaporetech.edu.sg/api/v1/students/
curl -i "https://hvlabonline-uat.singaporetech.edu.sg/api/v1/generate-signed-url/?blob_name=content_files/test.txt"
```

Expected unauthenticated responses:

- `/health`: `200`
- `/api/v1/auth/me`: `401`
- `/api/v1/students/`: `401`
- `/api/v1/generate-signed-url/`: `401`

## 6. Rerun Retest

```sh
python3 scripts/hvvl_vapt_retest.py \
  --api-base https://hvlabonline-uat.singaporetech.edu.sg/api/v1 \
  --uat-url https://hvlabonline-uat.singaporetech.edu.sg/ \
  --out output/evidence/retest-uat-local-post-deploy \
  --include-auth-gate-posts
```

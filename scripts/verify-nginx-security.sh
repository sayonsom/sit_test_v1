#!/bin/sh

set -eu

IMAGE="${IMAGE:-sit-hvvl-lms:security-candidate}"
PORT="${PORT:-18080}"
CONTAINER_ID=""

cleanup() {
  if [ -n "$CONTAINER_ID" ]; then
    docker rm -f "$CONTAINER_ID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

docker build -t "$IMAGE" .

CONTAINER_ID="$(
  docker run -d \
    -p "${PORT}:80" \
    -e ENABLE_DEBUG_ROUTES=false \
    -e ENABLE_LTI_PROXY=false \
    -e CSP_FRAME_ANCESTORS="'self' http://localhost:${PORT}" \
    "$IMAGE"
)"

for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

require_header() {
  path="$1"
  header="$2"
  tmp="$(mktemp)"
  curl -sS -o /dev/null -D "$tmp" "http://localhost:${PORT}${path}"
  if ! grep -iq "^${header}:" "$tmp"; then
    echo "Missing ${header} on ${path}" >&2
    cat "$tmp" >&2
    rm -f "$tmp"
    exit 1
  fi
  rm -f "$tmp"
}

require_status_closed() {
  path="$1"
  tmp="$(mktemp)"
  curl -sS -o /dev/null -D "$tmp" "http://localhost:${PORT}${path}"
  if ! grep -Eq "^HTTP/[0-9.]+ (403|404)" "$tmp"; then
    echo "Expected ${path} to return 403 or 404" >&2
    cat "$tmp" >&2
    rm -f "$tmp"
    exit 1
  fi
  rm -f "$tmp"
}

for path in / /env-config.js /manifest.json /health /docs /openapi.json; do
  require_header "$path" "Content-Security-Policy"
  require_header "$path" "X-Content-Type-Options"
  require_header "$path" "Strict-Transport-Security"
  require_header "$path" "Referrer-Policy"
  require_header "$path" "Permissions-Policy"
  require_header "$path" "Cross-Origin-Opener-Policy"
  require_header "$path" "Cross-Origin-Resource-Policy"
done

require_header /env-config.js "Cache-Control"
require_status_closed /docs
require_status_closed /openapi.json

if curl -sS -o /dev/null -D - "http://localhost:${PORT}/" | grep -iq "Server: nginx/"; then
  echo "Precise nginx version is exposed" >&2
  exit 1
fi

echo "Nginx security header smoke check passed on http://localhost:${PORT}"

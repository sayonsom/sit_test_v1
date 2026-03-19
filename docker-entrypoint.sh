#!/bin/sh

set -eu

ENV_JS="/usr/share/nginx/html/env-config.js"
PROXY_CONF="/etc/nginx/conf.d/backend-proxy.conf"

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# --- Nginx backend proxy configuration ---
BACKEND_API_URL="${BACKEND_API_URL:-https://alignbackendapis-708196257066.asia-southeast1.run.app/api/v1}"

# Extract upstream origin (scheme + host[:port])
UPSTREAM="$(echo "$BACKEND_API_URL" | sed -E 's|^(https?://[^/]+).*|\1|')"
# Extract just the hostname (without port) for the Host header
HOST="$(echo "$BACKEND_API_URL" | sed -E 's|^https?://([^/:]+).*|\1|')"

mkdir -p /etc/nginx/conf.d

# Generate different proxy config for HTTPS vs HTTP upstreams
case "$UPSTREAM" in
  https://*)
    cat > "$PROXY_CONF" <<NGINX
location ^~ /api/v1/ {
    proxy_pass $UPSTREAM;
    proxy_ssl_server_name on;
    proxy_ssl_verify on;
    proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
    proxy_set_header Host $HOST;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
NGINX
    ;;
  *)
    cat > "$PROXY_CONF" <<NGINX
location ^~ /api/v1/ {
    proxy_pass $UPSTREAM;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
NGINX
    ;;
esac

echo "Backend proxy: $UPSTREAM (host: $HOST)"

# --- Runtime JS environment config ---
API_URL="$(escape_js "${REACT_APP_API_URL:-/api/v1}")"
LTI_API_URL="$(escape_js "${REACT_APP_LTI_API_URL:-}")"
MAPS_API="$(escape_js "${REACT_APP_MAPS_API:-}")"
AAD_CLIENT_ID="$(escape_js "${REACT_APP_AAD_CLIENT_ID:-}")"
AAD_TENANT_ID="$(escape_js "${REACT_APP_AAD_TENANT_ID:-}")"
AAD_AUTHORITY="$(escape_js "${REACT_APP_AAD_AUTHORITY:-}")"
AAD_REDIRECT_URI="$(escape_js "${REACT_APP_AAD_REDIRECT_URI:-}")"
AAD_SCOPES="$(escape_js "${REACT_APP_AAD_SCOPES:-}")"
AAD_ALLOWED_GROUP_IDS="$(escape_js "${REACT_APP_AAD_ALLOWED_GROUP_IDS:-}")"
AAD_ALLOWED_ROLES="$(escape_js "${REACT_APP_AAD_ALLOWED_ROLES:-}")"
AAD_ALLOWED_EMAIL_DOMAIN="$(escape_js "${REACT_APP_AAD_ALLOWED_EMAIL_DOMAIN:-}")"

cat > "$ENV_JS" <<EOF
window.__ENV = window.__ENV || {};
window.__ENV.REACT_APP_API_URL = "${API_URL}";
window.__ENV.REACT_APP_LTI_API_URL = "${LTI_API_URL}";
window.__ENV.REACT_APP_MAPS_API = "${MAPS_API}";
window.__ENV.REACT_APP_AAD_CLIENT_ID = "${AAD_CLIENT_ID}";
window.__ENV.REACT_APP_AAD_TENANT_ID = "${AAD_TENANT_ID}";
window.__ENV.REACT_APP_AAD_AUTHORITY = "${AAD_AUTHORITY}";
window.__ENV.REACT_APP_AAD_REDIRECT_URI = "${AAD_REDIRECT_URI}";
window.__ENV.REACT_APP_AAD_SCOPES = "${AAD_SCOPES}";
window.__ENV.REACT_APP_AAD_ALLOWED_GROUP_IDS = "${AAD_ALLOWED_GROUP_IDS}";
window.__ENV.REACT_APP_AAD_ALLOWED_ROLES = "${AAD_ALLOWED_ROLES}";
window.__ENV.REACT_APP_AAD_ALLOWED_EMAIL_DOMAIN = "${AAD_ALLOWED_EMAIL_DOMAIN}";
EOF

chmod 644 "$ENV_JS"

exec "$@"

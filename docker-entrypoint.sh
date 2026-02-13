#!/bin/sh

set -eu

ENV_JS="/usr/share/nginx/html/env-config.js"

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# In deployments behind nginx.conf, `/api/v1/*` is proxied through the same origin.
API_URL="$(escape_js "${REACT_APP_API_URL:-/api/v1}")"
LTI_API_URL="$(escape_js "${REACT_APP_LTI_API_URL:-}")"
AUTH0_DOMAIN="$(escape_js "${REACT_APP_AUTH0_DOMAIN:-dev-o4fxv2xy7kvnxb0d.us.auth0.com}")"
AUTH0_CLIENT_ID="$(escape_js "${REACT_APP_AUTH0_CLIENT_ID:-R227TInzL2MGUwozJQiObpDauZ2yRTod}")"
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
window.__ENV.REACT_APP_AUTH0_DOMAIN = "${AUTH0_DOMAIN}";
window.__ENV.REACT_APP_AUTH0_CLIENT_ID = "${AUTH0_CLIENT_ID}";
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

# Execute the original command
exec "$@"

#!/bin/sh

set -eu

npm ci
npm audit --omit=dev
npm run build

PYTHON_BIN="${PYTHON_BIN:-$(command -v python3.11 || command -v python3)}"
PIP_AUDIT_VENV="${PIP_AUDIT_VENV:-/tmp/sit-vapt-pip-audit}"
"$PYTHON_BIN" -m venv "$PIP_AUDIT_VENV"
"$PIP_AUDIT_VENV/bin/python" -m pip install --quiet --upgrade pip pip-audit
"$PIP_AUDIT_VENV/bin/pip-audit" -r backend-api/requirements.txt
"$PIP_AUDIT_VENV/bin/pip-audit" -r backend-lti/requirements.txt
"$PIP_AUDIT_VENV/bin/pip-audit" -r lti_tool/requirements.txt

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source . --config .gitleaks.toml
else
  echo "gitleaks is not installed; install it locally or rely on the CI gitleaks action" >&2
fi

#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# SIT Virtual HV Laboratory — Stop All Services
# ─────────────────────────────────────────────────────────

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.local.yml"

echo ""
echo "Stopping all services..."
docker compose -f "$COMPOSE_FILE" down
echo ""
echo "✅ All services stopped."
echo ""
echo "Note: Database and Redis data are preserved in Docker volumes."
echo "To remove all data and start fresh:"
echo "  docker compose -f $COMPOSE_FILE down -v"
echo ""

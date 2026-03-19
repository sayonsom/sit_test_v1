#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# SIT Virtual HV Laboratory — Full Startup
# ─────────────────────────────────────────────────────────
# Starts all services: Frontend, LTI Backend, API, PostgreSQL, Redis
# Access the app at http://localhost:3000 (or $FRONTEND_PORT)
# ─────────────────────────────────────────────────────────

cd "$(dirname "$0")"

ENV_FILE=".env.local"
COMPOSE_FILE="docker-compose.local.yml"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   SIT Virtual High Voltage Laboratory        ║"
echo "  ║   Starting all services...                   ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# 1. Check Docker
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi
echo "✓ Docker is running"

# 2. Check env file
if [ ! -f "$ENV_FILE" ]; then
  if [ -f ".env.local.example" ]; then
    echo "⚠ No $ENV_FILE found. Creating from .env.local.example..."
    cp .env.local.example "$ENV_FILE"
    echo "  → Please edit $ENV_FILE to add your OPENAI_API_KEY"
    echo "  → Then re-run this script."
    exit 1
  else
    echo "❌ No $ENV_FILE or .env.local.example found."
    exit 1
  fi
fi
echo "✓ Environment file loaded"

# 3. Build and start
echo ""
echo "Building and starting containers (this may take a few minutes on first run)..."
echo ""
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

# 4. Wait for health
echo ""
echo "Waiting for services to be ready..."
TRIES=0
MAX_TRIES=30
until curl -sf http://localhost:${FRONTEND_PORT:-3000}/api/v1/test-cors > /dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    echo "⚠ Services are taking longer than expected. Check logs with:"
    echo "  docker compose -f $COMPOSE_FILE logs"
    break
  fi
  sleep 2
done

# 5. Show status
echo ""
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   ✅ All services started!                   ║"
echo "  ║                                              ║"
echo "  ║   App:  http://localhost:${FRONTEND_PORT:-3000}                ║"
echo "  ║                                              ║"
echo "  ║   Stop: ./stop_full.sh                       ║"
echo "  ║   Logs: docker compose -f $COMPOSE_FILE logs ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

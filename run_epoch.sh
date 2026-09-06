#!/usr/bin/env bash
# ====================================================================
# EPOCH - Autonomous Landslide Early-Warning & Decision Support System
# Single Startup Development Script (SIH PS SIH26001)
# ====================================================================

set -e

echo "================================================================="
echo "  EPOCH: AI Landslide Early-Warning & Disaster Command Center   "
echo "  Region: North Eastern Region (Assam, Sikkim, Meghalaya, AP)   "
echo "================================================================="

# Get absolute script directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "--> [1/3] Checking Backend Environment..."
cd "$PROJECT_ROOT/backend"
python3 -c "import fastapi, uvicorn, pydantic" 2>/dev/null || {
    echo "Installing backend requirements..."
    python3 -m pip install -r requirements.txt
}

echo "--> [2/3] Starting FastAPI Backend on port 8000..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend running (PID: $BACKEND_PID) at http://localhost:8000/api/v1/telemetry"

echo "--> [3/3] Starting Vite Frontend on port 5173..."
cd "$PROJECT_ROOT/frontend"

cleanup() {
    echo "Shutting down EPOCH services..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

npm run dev

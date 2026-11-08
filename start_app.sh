#!/usr/bin/env bash

# ==================================================
#   Iniciando NexusJob AI - macOS / Linux Launcher
# ==================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo "  🚀 NexusJob AI - Agente Autónomo de Empleo"
echo "=================================================="

# 1. Detect and configure Node.js in PATH if needed
NODE_PATHS=(
    "$SCRIPT_DIR/../../.tools/node/bin"
    "$HOME/.local/share/node/bin"
    "/opt/homebrew/bin"
    "/usr/local/bin"
)

for p in "${NODE_PATHS[@]}"; do
    if [ -f "$p/node" ]; then
        export PATH="$p:$PATH"
        break
    fi
done

if command -v node >/dev/null 2>&1; then
    echo "✓ Node.js detectado: $(node -v)"
else
    echo "⚠️  Aviso: Node.js no encontrado en PATH estándar."
fi

# 2. Check and configure Python Virtual Environment
if [ ! -f "venv/bin/python" ]; then
    echo "📦 Creando entorno virtual de Python en ./venv..."
    python3 -m venv venv
    echo "📦 Instalando dependencias de backend..."
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r backend/requirements.txt
fi

echo "✓ Entorno Python listo ($(./venv/bin/python --version))"

# 3. Check and build frontend if dist is missing
if [ ! -d "frontend/dist" ]; then
    echo "📦 Compilando interfaz web (frontend)..."
    if [ ! -d "frontend/node_modules" ]; then
        (cd frontend && npm install)
    fi
    (cd frontend && npm run build)
fi

echo "✓ Frontend listo y compilado"

# 4. Open browser
PORT="${PORT:-8000}"
URL="http://localhost:$PORT"

echo ""
echo "🌐 Iniciando servidor en $URL..."
echo "📋 Panel de Swagger en $URL/docs"
echo "Presiona Ctrl+C para detener."
echo "=================================================="

# Open browser in background after short delay
(
    sleep 1.5
    if command -v open >/dev/null 2>&1; then
        open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"
    fi
) &

# 5. Launch FastAPI backend
exec ./venv/bin/python backend/run.py

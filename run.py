import os
import sys
from pathlib import Path

# Automatically detect and adjust to backend directory
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir / "backend"

if backend_dir.exists():
    sys.path.insert(0, str(backend_dir))
    os.chdir(backend_dir)
else:
    sys.path.insert(0, str(current_dir))

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\n==================================================")
    print(f"  Oportia Jobs IA - Servidor Backend")
    print(f"  Iniciado en: http://0.0.0.0:{port}")
    print(f"==================================================\n")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)

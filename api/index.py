import sys
import os
from pathlib import Path

# Set up paths so FastAPI and its internal modules resolve properly on Vercel Serverless
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.main import app

# Vercel Serverless ASGI entrypoint
app = app

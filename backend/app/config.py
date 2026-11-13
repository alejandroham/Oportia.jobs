import os
import json
import base64
from app.agents.models import DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL, DEFAULT_CLAUDE_MODEL
from pathlib import Path
from dotenv import load_dotenv

def _mask_key(key: str) -> str:
    if not key:
        return ""
    raw = f"nexus_enc_v1:{key}".encode("utf-8")
    return base64.b64encode(raw).decode("ascii")

def _unmask_key(val: str) -> str:
    if not val:
        return ""
    try:
        raw = base64.b64decode(val.encode("ascii")).decode("utf-8")
        if raw.startswith("nexus_enc_v1:"):
            return raw[len("nexus_enc_v1:"):]
        return val
    except Exception:
        return val

# Load .env if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if os.environ.get("VERCEL"):
    DATA_DIR = Path("/tmp/data")
else:
    DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "uploads").mkdir(parents=True, exist_ok=True)

load_dotenv(BASE_DIR / ".env")

class Settings:
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    PROJECT_NAME: str = "Oportia Jobs IA - Tu talento. Tus decisiones. Tus oportunidades."
    VERSION: str = "1.1.0"
    
    # Storage Paths
    PROFILE_FILE: Path = DATA_DIR / "profile.json"
    PREFERENCES_FILE: Path = DATA_DIR / "preferences.json"
    JOBS_FILE: Path = DATA_DIR / "jobs.json"
    APPLICATIONS_FILE: Path = DATA_DIR / "applications.json"
    FEEDBACK_FILE: Path = DATA_DIR / "feedback_events.json"
    LLM_SETTINGS_FILE: Path = DATA_DIR / "llm_settings.json"
    COMPANIES_FILE: Path = DATA_DIR / "companies.json"
    ROLE_RECOMMENDATIONS_FILE: Path = DATA_DIR / "role_recommendations.json"
    EVALUATIONS_FILE: Path = DATA_DIR / "evaluations.json"
    COACH_DATA_FILE: Path = DATA_DIR / "coach_data.json"
    UPLOADS_DIR: Path = DATA_DIR / "uploads"

    # LLM Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    DEFAULT_PROVIDER: str = os.getenv("DEFAULT_PROVIDER", "gemini") # "gemini", "openai", "claude"
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", DEFAULT_CLAUDE_MODEL)
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

    def __init__(self):
        self.UPLOADS_DIR.mkdir(exist_ok=True)
        # In Option A (Stateless), no credentials are loaded from or saved to disk
        self.load_persisted_llm_settings()

    def load_persisted_llm_settings(self):
        # Server only uses environment variables from .env if running in personal local mode
        pass

    def save_persisted_llm_settings(self):
        # Zero disk retention: never write user API keys to disk
        pass

    def purge_keys(self):
        """Completely wipes all API keys and removes stored credentials from disk."""
        self.GEMINI_API_KEY = ""
        self.OPENAI_API_KEY = ""
        self.ANTHROPIC_API_KEY = ""
        os.environ.pop("GEMINI_API_KEY", None)
        os.environ.pop("OPENAI_API_KEY", None)
        os.environ.pop("ANTHROPIC_API_KEY", None)
        if self.LLM_SETTINGS_FILE.exists():
            try:
                self.LLM_SETTINGS_FILE.unlink()
            except Exception:
                pass

settings = Settings()

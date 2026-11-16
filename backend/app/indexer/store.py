"""
Dónde vive el índice diario: Supabase Storage (bucket público de solo lectura).

- Lectura: URL pública, sin claves. Se arma con SUPABASE_URL + bucket, o se fija con OPORTIA_INDEX_URL.
- Escritura: solo la tarea diaria de GitHub Actions, con SUPABASE_SERVICE_ROLE_KEY (secreto de GitHub).
  La app desplegada en Vercel nunca necesita esa clave.
- El índice solo contiene ofertas públicas; jamás datos de personas.
"""

import gzip
import json
import logging
import os
import threading
import time
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)

INDEX_BUCKET = os.environ.get("OPORTIA_INDEX_BUCKET", "oportia-index")
INDEX_OBJECT = "jobs-index.json.gz"
INDEX_CACHE_SECONDS = 30 * 60


def index_public_url() -> Optional[str]:
    explicit = os.environ.get("OPORTIA_INDEX_URL")
    if explicit:
        return explicit
    base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    if not base:
        return None
    return f"{base}/storage/v1/object/public/{INDEX_BUCKET}/{INDEX_OBJECT}"


def encode_index(index: Dict[str, Any]) -> bytes:
    raw = json.dumps(index, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return gzip.compress(raw, compresslevel=9)


def decode_index(data: bytes) -> Dict[str, Any]:
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    return json.loads(data.decode("utf-8"))


def download_index(timeout: float = 8.0) -> Optional[Dict[str, Any]]:
    url = index_public_url()
    if not url:
        return None
    try:
        res = requests.get(url, timeout=timeout)
        if res.status_code != 200:
            logger.info(f"Índice diario no disponible ({res.status_code}).")
            return None
        index = decode_index(res.content)
        return index if isinstance(index.get("jobs"), list) else None
    except Exception as e:  # noqa: BLE001 - sin índice, la búsqueda sigue en vivo
        logger.warning(f"No se pudo leer el índice diario: {e}")
        return None


def auth_headers(key: str) -> Dict[str, str]:
    """
    Claves antiguas (JWT "eyJ…"): en apikey y Authorization. Claves nuevas ("sb_secret_…"): solo en
    apikey; Supabase las rechaza en Authorization ("Invalid Compact JWS") y genera el token por su cuenta.
    """
    key = key.strip()
    if key.startswith("eyJ"):
        return {"apikey": key, "Authorization": f"Bearer {key}"}
    return {"apikey": key}


def upload_index(index: Dict[str, Any]) -> None:
    base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not base or not key:
        raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para publicar el índice.")
    res = requests.post(
        f"{base}/storage/v1/object/{INDEX_BUCKET}/{INDEX_OBJECT}",
        data=encode_index(index),
        headers={**auth_headers(key), "Content-Type": "application/gzip", "Cache-Control": "max-age=1800", "x-upsert": "true"},
        timeout=60,
    )
    if res.status_code >= 300:
        raise RuntimeError(f"Supabase Storage respondió {res.status_code}: {res.text[:300]}")


class IndexCache:
    """El servidor guarda el índice en memoria 30 minutos (no en disco)."""

    def __init__(self, ttl: float = INDEX_CACHE_SECONDS):
        self.ttl = ttl
        self._lock = threading.Lock()
        self._loaded_at = 0.0
        self._index: Optional[Dict[str, Any]] = None

    def get(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            if time.time() - self._loaded_at < self.ttl:
                return self._index
            self._index = download_index()
            # Si falló, se reintenta en 5 minutos en vez de 30.
            self._loaded_at = time.time() if self._index else time.time() - self.ttl + 300
            return self._index

    def set(self, index: Optional[Dict[str, Any]]) -> None:
        with self._lock:
            self._index = index
            self._loaded_at = time.time()


index_cache = IndexCache()

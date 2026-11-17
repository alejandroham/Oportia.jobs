"""
Registro ANÓNIMO de uso y seguridad para el portal de administración (tabla app_events de Supabase).

Qué se guarda: tipo de evento, ruta, si se usó IA (propia o gratuita), resultado y versión de la app.
Qué NO se guarda: CV, perfil, búsquedas escritas, correos, IP ni el identificador del navegador.
- client_hash e ip_hash son huellas que CAMBIAN CADA DÍA (HMAC con una sal diaria): sirven para contar
  usuarios activos de un día o detectar abuso, pero no permiten seguir a una persona entre días.
- La IP se trunca (red /24 en IPv4, /48 en IPv6) antes de calcular su huella, y solo para eventos de seguridad.
- La clave usada es la publicable: la tabla solo admite agregar filas y leerlas exige ser administrador con MFA.
Si Supabase no está configurado (o en pruebas), no hace nada. Nunca interrumpe la petición.
"""

import hashlib
import hmac
import ipaddress
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)

TIMEOUT = 1.5


def enabled() -> bool:
    if os.environ.get("OPORTIA_TELEMETRY", "1") == "0" or os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_PUBLISHABLE_KEY"))


def _daily_hash(value: str) -> Optional[str]:
    if not value:
        return None
    secret = os.environ.get("METRICS_SALT") or os.environ.get("SUPABASE_PUBLISHABLE_KEY") or "oportia"
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    salt = hmac.new(secret.encode(), day.encode(), hashlib.sha256).digest()
    return hmac.new(salt, value.encode(), hashlib.sha256).hexdigest()[:16]


def _truncate_ip(ip: str) -> str:
    try:
        addr = ipaddress.ip_address(ip)
        net = ipaddress.ip_network(f"{ip}/{24 if addr.version == 4 else 48}", strict=False)
        return str(net.network_address)
    except ValueError:
        return ""


def build_event(kind: str, category: str = "uso", detail: Optional[Dict[str, Any]] = None,
                client_id: str = "", ip: str = "", app_version: str = "") -> Dict[str, Any]:
    clean_detail = {str(k)[:30]: (v if isinstance(v, (int, float, bool)) or v is None else str(v)[:120])
                    for k, v in (detail or {}).items()}
    return {
        "kind": kind[:40],
        "category": category if category in ("uso", "seguridad", "error") else "uso",
        "detail": clean_detail,
        "client_hash": _daily_hash(client_id) if client_id and client_id != "anon" else None,
        "ip_hash": _daily_hash(_truncate_ip(ip)) if ip and category != "uso" else None,
        "app_version": app_version[:20] or None,
    }


def record(kind: str, category: str = "uso", detail: Optional[Dict[str, Any]] = None,
           client_id: str = "", ip: str = "", app_version: str = "") -> None:
    if not enabled():
        return
    base = os.environ["SUPABASE_URL"].strip().rstrip("/")
    key = os.environ["SUPABASE_PUBLISHABLE_KEY"].strip()
    headers = {"apikey": key, "Content-Type": "application/json", "Prefer": "return=minimal"}
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    try:
        requests.post(f"{base}/rest/v1/app_events", json=build_event(kind, category, detail, client_id, ip, app_version),
                      headers=headers, timeout=TIMEOUT)
    except Exception as e:  # noqa: BLE001 - el registro nunca rompe la app
        logger.debug(f"Telemetría omitida: {e}")

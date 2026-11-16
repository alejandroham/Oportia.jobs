"""
Opiniones sobre Oportia ("¿Qué te parece la app?").

- Se guardan en la tabla `feedback` de Supabase. La app solo puede AGREGAR filas (clave publicable +
  seguridad a nivel de fila); leerlas exige la clave secreta, que solo tiene quien mantiene Oportia.
- El correo y el teléfono son voluntarios y solo se guardan si la persona marca la autorización
  (la base de datos también lo exige).
- El servidor no guarda nada en disco ni registra la IP.
"""

import os
import re
import uuid
from typing import Optional

import requests
from pydantic import BaseModel, Field, field_validator, model_validator

CONSENT_VERSION = "2026-11-17"
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$")
PHONE_RE = re.compile(r"^\+?[\d\s()-]{8,20}$")


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    liked: Optional[str] = Field(default=None, max_length=1000)
    improve: Optional[str] = Field(default=None, max_length=1000)
    contact_email: Optional[str] = Field(default=None, max_length=200)
    contact_phone: Optional[str] = Field(default=None, max_length=40)
    contact_consent: bool = False
    trigger: str = "manual"

    @field_validator("liked", "improve", "contact_email", "contact_phone", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        if isinstance(v, str):
            v = v.strip()
        return v or None

    @field_validator("contact_email")
    @classmethod
    def _email(cls, v):
        if v and not EMAIL_RE.match(v):
            raise ValueError("El correo no parece válido.")
        return v

    @field_validator("contact_phone")
    @classmethod
    def _phone(cls, v):
        if v and not PHONE_RE.match(v):
            raise ValueError("El teléfono no parece válido.")
        return v

    @field_validator("trigger")
    @classmethod
    def _trigger(cls, v):
        return v if v in ("manual", "auto") else "manual"

    @model_validator(mode="after")
    def _consent(self):
        if (self.contact_email or self.contact_phone) and not self.contact_consent:
            raise ValueError("Para dejar tu correo o teléfono debes marcar la autorización de contacto.")
        if not self.contact_consent:
            # Sin autorización no se guarda ningún dato de contacto.
            self.contact_email = self.contact_phone = None
        return self


class FeedbackUnavailable(Exception):
    pass


def save_feedback(fb: FeedbackRequest, app_version: str) -> str:
    base = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    key = (os.environ.get("SUPABASE_PUBLISHABLE_KEY") or "").strip()
    if not base or not key:
        raise FeedbackUnavailable("Las opiniones no están configuradas en este servidor.")
    feedback_id = str(uuid.uuid4())
    row = {
        "id": feedback_id,
        "rating": fb.rating,
        "liked": fb.liked,
        "improve": fb.improve,
        "contact_email": fb.contact_email,
        "contact_phone": fb.contact_phone,
        "contact_consent": fb.contact_consent,
        "consent_version": CONSENT_VERSION if fb.contact_consent else None,
        "trigger": fb.trigger,
        "app_version": app_version,
    }
    headers = {"apikey": key, "Content-Type": "application/json", "Prefer": "return=minimal"}
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    res = requests.post(f"{base}/rest/v1/feedback", json=row, headers=headers, timeout=15)
    if res.status_code >= 300:
        raise FeedbackUnavailable(f"No se pudo guardar la opinión ({res.status_code}).")
    return feedback_id


RETENTION_DAYS = 365


def purge_old_feedback() -> None:
    """
    Borra las opiniones con más de 12 meses (política de privacidad, sección 9).
    Lo ejecuta la tarea diaria de GitHub Actions con la clave secreta; la app nunca la tiene.
    """
    from datetime import datetime, timedelta, timezone
    from app.indexer.store import auth_headers, clean_key

    base = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    key = clean_key(os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "")
    if not base or not key:
        print("Limpieza de opiniones omitida: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.")
        return
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat(timespec="seconds")
    for with_bearer in (key.startswith("eyJ"), not key.startswith("eyJ")):
        res = requests.delete(f"{base}/rest/v1/feedback", params={"created_at": f"lt.{cutoff}"},
                              headers={**auth_headers(key, with_bearer), "Prefer": "return=minimal"}, timeout=30)
        if res.status_code < 300:
            print(f"Opiniones anteriores a {cutoff[:10]} eliminadas.")
            return
    raise RuntimeError(f"No se pudieron borrar las opiniones antiguas ({res.status_code}).")


if __name__ == "__main__":
    purge_old_feedback()


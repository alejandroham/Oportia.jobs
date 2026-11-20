"""
Central catalog of LLM models supported by Oportia Jobs IA.
Single source of truth for model IDs, names, tags, status, and descriptions.
"""
from typing import Dict, List, Optional, TypedDict, Literal

class ModelOption(TypedDict):
    id: str
    name: str
    tag: str
    status: Literal['recommended', 'active', 'legacy']
    description: str

# 1.6.5 (DT-15): modelos vigentes verificados el 20-nov-2026 en la documentación de cada proveedor
# (ai.google.dev / aistudio.google.com/docs/models, developers.openai.com/api/docs/models y deprecations).
# Antes el modelo por omisión era gemini-2.0-flash, apagado por Google el 1-jun-2026: cada consulta de la
# IA gratuita probaba 3 modelos retirados (404) antes de llegar a uno que respondía.
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
# Respaldo rápido: si el modelo principal no alcanza a responder, se intenta con este.
FAST_GEMINI_MODEL = "gemini-3.5-flash-lite"
DEFAULT_OPENAI_MODEL = "gpt-6.2-sol"
DEFAULT_CLAUDE_MODEL = "claude-sonnet-5-5"

DEFAULT_MODELS: Dict[str, str] = {
    "gemini": DEFAULT_GEMINI_MODEL,
    "openai": DEFAULT_OPENAI_MODEL,
    "claude": DEFAULT_CLAUDE_MODEL
}

# Modelos apagados o en retiro. Si un navegador todavía tiene guardado uno (Ajustes > modelo), se usa el
# modelo por omisión del proveedor en su lugar, sin consultar al proveedor.
RETIRED_MODELS: Dict[str, set] = {
    "gemini": {
        "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite",
        "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.5-flash",
    },
    "openai": {"gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "o3", "gpt-5"},
    "claude": {"claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-7-sonnet-latest"},
}

CATALOG: Dict[str, List[ModelOption]] = {
    "gemini": [
        {
            "id": "gemini-3.6-flash",
            "name": "Gemini 3.6 Flash",
            "tag": "Recomendado",
            "status": "recommended",
            "description": "Modelo estable de Google para leer tu CV, evaluar compatibilidad y redactar documentos."
        },
        {
            "id": "gemini-3.5-flash-lite",
            "name": "Gemini 3.5 Flash-Lite",
            "tag": "Rápido",
            "status": "active",
            "description": "Más rápido y económico; útil para ordenar muchas ofertas a la vez."
        }
    ],
    "openai": [
        {
            "id": "gpt-6.2-sol",
            "name": "GPT-6.2 Sol",
            "tag": "Recomendado",
            "status": "recommended",
            "description": "Modelo de OpenAI para el trabajo diario: buena redacción y comprensión de requisitos."
        },
        {
            "id": "gpt-6.2-astra",
            "name": "GPT-6.2 Astra",
            "tag": "Razonamiento",
            "status": "active",
            "description": "El modelo más capaz de OpenAI, para análisis detallados (más lento y más caro)."
        },
        {
            "id": "gpt-6.1-terra",
            "name": "GPT-6.1 Terra",
            "tag": "Rápido",
            "status": "active",
            "description": "Rápido y eficiente para ordenar ofertas y respuestas breves."
        },
        {
            "id": "gpt-6-luna",
            "name": "GPT-6 Luna",
            "tag": "Económico",
            "status": "active",
            "description": "El más económico, para grandes volúmenes."
        }
    ],
    "claude": [
        {
            "id": "claude-sonnet-5-5",
            "name": "Claude Sonnet 5.5",
            "tag": "Recomendado",
            "status": "recommended",
            "description": "Muy buena redacción de cartas y CV adaptados, con buen equilibrio de velocidad."
        },
        {
            "id": "claude-opus-5-5",
            "name": "Claude Opus 5.5",
            "tag": "Más capaz",
            "status": "active",
            "description": "El modelo más capaz de Anthropic, para análisis profundos (más lento y más caro)."
        },
        {
            "id": "claude-haiku-5-5",
            "name": "Claude Haiku 5.5",
            "tag": "Rápido",
            "status": "active",
            "description": "Respuestas casi instantáneas para tareas breves."
        }
    ]
}


def current_model(provider: str, model: Optional[str]) -> str:
    """El modelo pedido, o el por omisión del proveedor si viene vacío o está retirado."""
    name = (model or "").strip()
    if not name or name in RETIRED_MODELS.get(provider, set()):
        return DEFAULT_MODELS.get(provider, DEFAULT_GEMINI_MODEL)
    return name

def get_default_model(provider: str) -> str:
    return DEFAULT_MODELS.get(provider, DEFAULT_GEMINI_MODEL)

def get_catalog() -> Dict[str, List[ModelOption]]:
    return CATALOG

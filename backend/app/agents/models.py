"""
Central catalog of LLM models supported by Oportia Jobs IA.
Single source of truth for model IDs, names, tags, status, and descriptions.
"""
from typing import Dict, List, TypedDict, Literal

class ModelOption(TypedDict):
    id: str
    name: str
    tag: str
    status: Literal['recommended', 'active', 'legacy']
    description: str

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
DEFAULT_OPENAI_MODEL = "gpt-4o"
DEFAULT_CLAUDE_MODEL = "claude-3-5-sonnet-latest"

DEFAULT_MODELS: Dict[str, str] = {
    "gemini": DEFAULT_GEMINI_MODEL,
    "openai": DEFAULT_OPENAI_MODEL,
    "claude": DEFAULT_CLAUDE_MODEL
}

CATALOG: Dict[str, List[ModelOption]] = {
    "gemini": [
        {
            "id": "gemini-2.0-flash",
            "name": "Gemini 2.0 Flash",
            "tag": "Recomendado Estable",
            "status": "recommended",
            "description": "Modelo insignia oficial de Google de última generación, baja latencia y alta cuota."
        },
        {
            "id": "gemini-1.5-flash",
            "name": "Gemini 1.5 Flash",
            "tag": "Rápido & Eficiente",
            "status": "active",
            "description": "Excelente velocidad para parseo rápido de CV y resúmenes ejecutivos."
        },
        {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash",
            "tag": "Avanzado",
            "status": "active",
            "description": "Capacidad analítica ampliada para evaluaciones complejas de compatibilidad."
        }
    ],
    "openai": [
        {
            "id": "gpt-4o",
            "name": "GPT-4o (Omni)",
            "tag": "Recomendado",
            "status": "recommended",
            "description": "Modelo insignia de OpenAI. Excelente comprensión de requisitos laborales y redacción fluida."
        },
        {
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "tag": "Rápido & Económico",
            "status": "active",
            "description": "Versión ligera, económica y muy veloz para clasificación masiva de empleos."
        },
        {
            "id": "o1",
            "name": "OpenAI o1",
            "tag": "Razonamiento Profundo",
            "status": "active",
            "description": "Modelo de razonamiento reflexivo para análisis minucioso de ajuste candidato-vacante."
        },
        {
            "id": "o3-mini",
            "name": "OpenAI o3-mini",
            "tag": "Nuevo • Lógica y STEM",
            "status": "active",
            "description": "Razonamiento ágil y optimizado para lógica estructurada y preparación de entrevistas."
        }
    ],
    "claude": [
        {
            "id": "claude-3-5-sonnet-latest",
            "name": "Claude 3.5 Sonnet",
            "tag": "Recomendado",
            "status": "recommended",
            "description": "El modelo más elogiado para redacción elegante de cartas de presentación y personalización de CVs."
        },
        {
            "id": "claude-3-5-haiku-latest",
            "name": "Claude 3.5 Haiku",
            "tag": "Ultra Rápido",
            "status": "active",
            "description": "Velocidad de respuesta casi instantánea con excelente sintaxis y análisis."
        },
        {
            "id": "claude-3-7-sonnet-latest",
            "name": "Claude 3.7 Sonnet",
            "tag": "Última Generación",
            "status": "active",
            "description": "Modelo híbrido de razonamiento profundo y respuesta rápida para preparación de entrevistas."
        }
    ]
}

def get_default_model(provider: str) -> str:
    return DEFAULT_MODELS.get(provider, DEFAULT_GEMINI_MODEL)

def get_catalog() -> Dict[str, List[ModelOption]]:
    return CATALOG

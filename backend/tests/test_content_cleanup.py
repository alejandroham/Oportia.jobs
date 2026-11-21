"""1.6.12: contenido y deuda técnica (DT-32 textos del índice, DT-33 correo de la oferta, DT-37 versión única)."""
import json
from pathlib import Path

import pytest

from app.agents.job_text_parser import find_contact_email, parse_job_text
from app.config import settings
from app.indexer.search import index_jobs
from app.indexer.text import clean_description, clean_location_modality

ROOT = Path(__file__).resolve().parents[2]


# ---------- DT-37: versión en un solo lugar ----------

def test_backend_version_comes_from_frontend_package_json():
    pkg = json.loads((ROOT / "frontend" / "package.json").read_text())
    assert settings.VERSION == pkg["version"]
    assert "version" not in json.loads((ROOT / "package.json").read_text()), "la raíz no repite la versión"


def test_vercel_ships_package_json_with_the_api_function():
    vercel = json.loads((ROOT / "vercel.json").read_text())
    assert vercel["functions"]["api/index.py"]["includeFiles"] == "frontend/package.json"


# ---------- DT-33: correo de contacto de la oferta ----------

def test_pasted_offer_keeps_the_contact_email_without_ai():
    job, method, _ = parse_job_text(
        "Analista Contable\nEmpresa: Ficticia SpA\nEnvía tu CV a rrhh@example.com indicando pretensiones.", use_ai=False)
    assert method == "reglas" and job.contact_email == "rrhh@example.com"


@pytest.mark.parametrize("text, email", [
    ("Escríbenos a noreply@empresa.cl o a postula@empresa.cl.", "postula@empresa.cl"),
    ("Correo: Seleccion.Personas@Hospital-Ficticio.cl", "seleccion.personas@hospital-ficticio.cl"),
    ("Sin correo, postula en el portal.", None),
])
def test_find_contact_email(text, email):
    assert find_contact_email(text) == email


# ---------- DT-32: textos del índice ----------

def test_description_is_cut_at_a_word_and_cleaned():
    text = "Postulación oficial a través del portal " * 30
    out = clean_description(text, 500)
    assert len(out) <= 501 and out.endswith("…") and not out[:-1].endswith(" ")
    assert out[:-1].split()[-1] in text.split()  # termina en una palabra completa
    assert clean_description("Educación PrimariaAtención de público") == "Educación Primaria Atención de público"
    assert clean_description("convpostularavisoTrabajo en terreno") == "Trabajo en terreno"
    assert clean_description("Experiencia en TypeScript y JavaScript") == "Experiencia en TypeScript y JavaScript"


@pytest.mark.parametrize("location, modality, remote, expected", [
    ("Chile — Híbrido", "Presencial", False, ("Chile", "Híbrido", False)),
    ("Remote — Remote_local", None, True, ("Remoto", "Remoto", True)),
    ("Chile — No_remote", "Remoto", True, ("Chile", "Presencial", False)),
    ("Santiago, Región Metropolitana de Santiago", "Presencial", False, ("Santiago, Región Metropolitana de Santiago", "Presencial", False)),
])
def test_location_and_modality_are_separated(location, modality, remote, expected):
    assert clean_location_modality(location, modality, remote) == expected


def test_published_index_is_cleaned_when_read():
    jobs = index_jobs({"jobs": [{"title": "Dev", "location": "Chile — Híbrido", "modality": "Presencial",
                                 "description": "convpostularavisoTrabajo  remoto"}]})
    assert (jobs[0].location, jobs[0].modality, jobs[0].description) == ("Chile", "Híbrido", "Trabajo remoto")

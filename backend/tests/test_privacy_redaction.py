"""v1.5.0: la IA no recibe datos de contacto y el CV final los trae exactos (sin inventar ni alterar)."""

import logging

import pytest
from fastapi.testclient import TestClient

from app.agents import profile_analyzer as pa
from app.agents.llm_provider import LLMProviderError, llm
from app.main import app
from app.models.schemas import CandidateProfile
from app.privacy import context as pctx
from app.privacy.redact import apply_cv_header, profile_for_ai, redact_text
from app.utils.rate_limiter import ai_rate_limiter

EMAIL, PHONE = "rosa.perez@correo.cl", "+56 9 8765 4321"
PROFILE = {
    "name": "Rosa Pérez Soto", "email": EMAIL, "phone": PHONE, "region": "Región Metropolitana", "commune": "Maipú",
    "headline": "Supervisora de obra", "summary": "Supervisora con 10 años. Contacto: rosa.perez@correo.cl",
    "links": [{"label": "LinkedIn", "url": "https://www.linkedin.com/in/rosaperez"}],
    "technical_skills": ["Planos"], "raw_cv_text": "Rosa Pérez Soto rosa.perez@correo.cl +56 9 8765 4321 RUT 12.345.678-9",
    "experiences": [{"id": "e1", "company": "Constructora Andes", "role": "Supervisora de obra", "start_date": "2022",
                     "end_date": "Actual", "description": "Cuadrillas", "technologies": [], "bullet_achievements": ["Logro"]}],
    "education": [], "certifications": [],
}
JOB = {"id": "j1", "title": "Supervisor de obra", "company": "Constructora X", "location": "Santiago", "is_remote": False,
       "description": "Envía tu CV a seleccion@constructorax.cl", "source": "t", "tags": []}


@pytest.fixture(autouse=True)
def reset_person():
    token = pctx.current_person.set(None)
    yield
    pctx.current_person.reset(token)


def test_redact_text_finds_contact_but_not_years_or_salaries():
    text = "Rosa — rosa.perez@correo.cl — +56 9 8765 4321 — 9 1234 5678 — RUT 12.345.678-9 — linkedin.com/in/rosa\n2019 - 2021 · Renta $1.400.000 · 2.000 m2"
    out, found = redact_text(text)
    assert "rosa.perez@correo.cl" not in out and "8765" not in out and "12.345.678-9" not in out and "linkedin.com" not in out
    assert found["emails"] == ["rosa.perez@correo.cl"] and len(found["phones"]) == 2 and found["ruts"] == ["12.345.678-9"]
    assert "2019 - 2021" in out and "$1.400.000" in out and "2.000 m2" in out


def test_profile_for_ai_has_no_contact_data():
    safe = profile_for_ai(CandidateProfile(**PROFILE)).model_dump_json()
    for secret in ("Rosa Pérez Soto", EMAIL, "8765", "linkedin.com/in/rosaperez", "Maipú", "12.345.678"):
        assert secret not in safe
    assert "Supervisora de obra" in safe and "Constructora Andes" in safe


def test_cv_header_is_written_by_oportia_with_exact_data():
    profile = CandidateProfile(**PROFILE)
    ai_md = "# {{NOMBRE}}\nSupervisora · rosa@INVENTADO.cl · +56 9 0000 0000\n## Experiencia\n- Logro de {{NOMBRE}}"
    md = apply_cv_header(ai_md, profile)
    assert md.startswith("# Rosa Pérez Soto\n")
    assert EMAIL in md and PHONE in md and "Maipú, Región Metropolitana" in md and "linkedin.com/in/rosaperez" in md
    assert "INVENTADO" not in md and "0000 0000" not in md and "{{" not in md
    assert "Logro de Rosa Pérez Soto" in md


def test_draft_never_sends_contact_to_ai_and_documents_keep_exact_data(monkeypatch):
    sent = []

    def fake_json(prompt, system_instruction=None):
        sent.append(prompt)
        if '"experiencias"' in prompt:
            return {"perfil": "Supervisora de obra.", "experiencias": [],
                    "cover_letter": "Estimado equipo:\n\nSoy supervisora.\n\nAtentamente,\n{{NOMBRE}}"}
        return {"ats_score": 80, "ats_feedback": ["Bien"], "reviewer_critique": "ok"}

    monkeypatch.setattr(llm, "generate_json", fake_json)
    ai_rate_limiter.clear()
    r = TestClient(app).post("/api/applications/draft", json={"job": JOB, "profile": PROFILE, "cv_options": {"length": "full"}})
    assert r.status_code == 200, r.text
    everything = "\n".join(sent)
    for secret in ("Rosa Pérez Soto", EMAIL, "8765 4321", "linkedin.com/in/rosaperez", "Maipú", "12.345.678-9"):
        assert secret not in everything, secret
    d = r.json()
    assert d["tailored_cv_markdown"].startswith("# Rosa Pérez Soto\n") and EMAIL in d["tailored_cv_markdown"] and PHONE in d["tailored_cv_markdown"]
    assert d["cover_letter"].rstrip().endswith("Rosa Pérez Soto") and "{{" not in d["cover_letter"]


def test_connection_layer_hides_the_person_in_every_query(monkeypatch):
    seen = {}

    def fake_raw(prompt, system_instruction=None, provider=None):
        seen["prompt"] = prompt
        return "Hola {{NOMBRE}}, te escribo a [CORREO]."

    monkeypatch.setattr(llm, "_generate_text_raw", fake_raw)
    CandidateProfile(**PROFILE)  # al recibir el perfil en una petición se anota la persona (solo en memoria)
    out = llm.generate_text(f"Chat: soy Rosa Pérez Soto, mi fono es 9 8765 4321 y mi RUT 12.345.678-9. Oferta: escribir a seleccion@constructorax.cl")
    assert "Rosa Pérez" not in seen["prompt"] and "8765" not in seen["prompt"] and "12.345.678-9" not in seen["prompt"]
    assert "seleccion@constructorax.cl" in seen["prompt"]  # el correo de la empresa sí se mantiene
    assert out == f"Hola Rosa Pérez Soto, te escribo a {EMAIL}."


def test_cv_analysis_hides_contact_and_takes_it_from_the_text(monkeypatch):
    seen = {}

    def fake_json(prompt, system_instruction=None):
        seen["prompt"] = prompt
        return {"name": "Rosa Pérez Soto", "email": "[CORREO]", "phone": "[TELÉFONO]", "headline": "Supervisora",
                "experiences": [{"company": "Andes", "role": "Supervisora", "start_date": "2022"}]}

    monkeypatch.setattr(pa, "_ai_available", lambda: True)
    monkeypatch.setattr(pa.llm, "generate_json", fake_json)
    raw = "Rosa Pérez Soto\nrosa.perez@correo.cl | +56 9 8765 4321 | RUT 12.345.678-9\nEXPERIENCIA\nSupervisora en Andes 2022"
    profile, method, _ = pa.analyze_cv(raw)
    assert method == "ia"
    assert EMAIL not in seen["prompt"] and "8765" not in seen["prompt"] and "12.345.678-9" not in seen["prompt"]
    assert profile.email == EMAIL and profile.phone == "+56 9 8765 4321"


def test_invalid_json_log_has_no_content(monkeypatch, caplog):
    monkeypatch.setattr(llm, "_generate_text_raw", lambda p, s=None, provider=None: "Rosa Pérez Soto vive en Maipú (no es JSON)")
    with caplog.at_level(logging.WARNING), pytest.raises(LLMProviderError):
        llm.generate_json("x")
    assert "Maipú" not in caplog.text and "Rosa" not in caplog.text


def test_endpoint_queries_go_without_name_even_when_agent_includes_it(monkeypatch):
    prompts = []

    def fake_raw(prompt, system_instruction=None, provider=None):
        prompts.append(prompt)
        return '{"overall_score": 70, "summary": "{{NOMBRE}} calza bien"}'

    monkeypatch.setattr(llm, "_generate_text_raw", fake_raw)
    ai_rate_limiter.clear()
    r = TestClient(app, raise_server_exceptions=False).post("/api/jobs/evaluate", json={"job": JOB, "profile": PROFILE})
    assert prompts, r.text
    assert all("Rosa Pérez Soto" not in p and EMAIL not in p for p in prompts)

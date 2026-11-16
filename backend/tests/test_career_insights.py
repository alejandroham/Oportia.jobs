"""Qué busco y Mis logros desde el CV: una consulta a la IA, sin inventar, y respaldo por reglas."""

from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.agents import career_insights as ci
from app.agents.llm_provider import SharedAIConsentRequired
from app.agents.profile_analyzer import deterministic_cv_parser
from app.main import app
from app.models.schemas import UserPreferences

PROFILE = deterministic_cv_parser((Path(__file__).parent / "fixtures" / "cv_tecnico_construccion.txt").read_text())

AI = {
    "cargos": [
        {"titulo": "Supervisor de Obra", "categoria": "directo", "resumen": "Ejerce el cargo desde 2021 en Constructora Andes Sur.", "evidencia": ["Supervisor de Obra, Constructora Andes Sur"], "nivel": "Supervisión"},
        {"titulo": "Jefe de Obra", "categoria": "ascenso", "resumen": "8 años y experiencia como Jefe de Terreno.", "evidencia": ["Jefe de Terreno"]},
        {"titulo": "Inspector Técnico de Obra (ITO)", "categoria": "transferible", "resumen": "Control de calidad en terreno."},
        {"titulo": "jefe de terreno", "categoria": "directo", "resumen": "ya está en lo que busca"},
        {"titulo": "", "categoria": "directo"},
    ],
    "logros": [
        {"titulo": "Coordinación de cuadrillas", "situacion_tarea": "Edificio de 12 pisos", "accion": "Coordinó 3 cuadrillas (25 trabajadores)", "resultado": "Avance semanal informado", "habilidades": ["Liderazgo", "Planificación"]},
        {"titulo": "vacío"},
    ],
}


def test_ai_roles_have_summary_skip_current_and_achievements_are_star():
    prefs = UserPreferences(target_roles=["Jefe de Terreno"])
    with patch.object(ci.llm, "generate_json", return_value=AI) as gen:
        res = ci.career_insights(PROFILE, prefs)
    assert gen.call_count == 1  # una sola consulta para cargos y logros
    assert res.method == "ia"
    assert [r.title for r in res.roles] == ["Supervisor de Obra", "Jefe de Obra", "Inspector Técnico de Obra (ITO)"]
    assert res.roles[1].category == "ascenso" and res.roles[1].category_label == "Siguiente paso"
    assert "Constructora Andes Sur" in res.roles[0].summary
    assert len(res.achievements) == 1 and res.achievements[0].action.startswith("Coordinó")
    assert res.achievements[0].id.startswith("star_") and res.achievements[0].source == "cv_ia"


def test_without_ai_rules_use_cv_roles_and_bullets():
    with patch.object(ci.llm, "generate_json", side_effect=SharedAIConsentRequired()):
        res = ci.career_insights(PROFILE, UserPreferences())
    assert res.method == "reglas" and "Activa la IA" in res.note
    assert any(r.title == "Supervisor de Obra" for r in res.roles)
    assert res.achievements and res.achievements[0].situation_and_task.startswith("Como Supervisor de Obra")


def test_endpoint_requires_cv_and_is_stateless():
    client = TestClient(app)
    assert client.post("/api/profile/career-insights", json={"profile": {"name": "Candidato"}}).status_code == 400
    with patch.object(ci.llm, "generate_json", return_value=AI):
        data = client.post("/api/profile/career-insights", json={"profile": PROFILE.model_dump()}).json()
    assert data["method"] == "ia" and len(data["roles"]) == 4  # sin "lo que ya busca", jefe de terreno sí entra

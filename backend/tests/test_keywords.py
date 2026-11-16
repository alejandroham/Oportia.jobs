import pytest
from app.utils.keywords import keyword_matches, normalize


@pytest.mark.parametrize("text,query,expected", [
    ("Registered Nurse - Emergency Department", "enfermera", True),
    ("Técnico en Enfermería (TENS)", "enfermera", True),
    ("TÉCNICO EN ENFERMERÍA", "tecnico en enfermeria", True),
    ("Senior Accounting Analyst", "analista contable", True),
    ("Analista de Datos", "analista contable", False),
    ("Warehouse Manager", "jefe de bodega", True),
    ("Jefe de Ventas", "jefe de bodega", False),
    ("Sales Associate", "vendedor", True),
    ("Java Developer", "vendedor", False),
    ("Educadora de Párvulos", "educadora de parvulos", True),
    ("Médico General", "medico", True),
    ("Cualquier cosa", "", True),
])
def test_keyword_matches(text, query, expected):
    assert keyword_matches(text, query) is expected


def test_normalize_removes_accents_and_case():
    assert normalize("Enfermería PÁRVULOS Ñuñoa") == "enfermeria parvulos nunoa"


from app.utils.keywords import relevance_score


@pytest.mark.parametrize("title,description,query,relevant", [
    ("Encargado de Informática", "", "encargado informatica", True),
    ("Ingeniero Informático", "", "encargado informatica", True),
    ("Jefe de Soporte TI", "", "encargado informatica", True),
    ("Encargado de Aseo y Mantenimiento", "", "encargado informatica", False),
    ("Reemplazo Psicólogo (a) de Protección", "", "encargado informatica", False),
    ("Técnico(a) en Enfermería - Residencias", "", "encargado informatica", False),
    ("Vendedor", "Un trabajo ideal para ti", "informatica", False),
    ("Analista Contable", "", "analista", True),
    ("Vendedor", "", "analista", False),
])
def test_relevance_score_filters_other_areas(title, description, query, relevant):
    assert (relevance_score(title, description, query) > 0) is relevant


def test_title_match_ranks_higher_than_description():
    assert relevance_score("Encargado de Informática", "", "encargado informatica") > \
        relevance_score("Coordinador General", "Área de informática", "encargado informatica")


def test_search_endpoint_drops_irrelevant_and_sorts(monkeypatch):
    from unittest.mock import patch
    from fastapi.testclient import TestClient
    from app.main import app
    from app.models.schemas import JobPosting
    from app.utils.cache import job_search_cache
    job_search_cache.clear()
    mk = lambda t: JobPosting(title=t, company="X", location="Chile", is_remote=False, description=t, source="t")
    found = [mk("Encargado de Aseo"), mk("Ingeniero Informático"), mk("Psicólogo"), mk("Encargado de Informática")]
    with patch("app.main.ChilePortalsScraper.search_with_status", return_value=(found, [])), \
         patch("app.main.RemoteBoardsScraper.search_with_status", return_value=([], [])), \
         patch("app.main.ats_scraper.search", return_value=[]):
        data = TestClient(app).post("/api/jobs/search", json={"keywords": "encargado informatica", "search_scope": "all"}).json()
    assert [j["title"] for j in data["jobs"]] == ["Encargado de Informática", "Ingeniero Informático"]


def test_area_in_title_beats_generic_role_word():
    assert relevance_score("Gestor TI (Soporte)", "", "encargado informatica") > \
        relevance_score("Director of Product Management", "Área de informática", "encargado informatica")


def test_short_synonyms_match_whole_words_only():
    # "jefe ti" (sinónimo de informática) no debe calzar con "Jefe de Tienda".
    assert relevance_score("Jefe de Tienda Alto Las Condes", "", "encargado informatica") == 0
    assert relevance_score("Jefe TI", "", "encargado informatica") > 0


def test_literal_word_in_title_beats_synonym():
    q = "guardia de seguridad"
    assert relevance_score("Guardia de Seguridad 4x4", "", q) > relevance_score("Encargado Unidad de Seguridad del Paciente", "", q)

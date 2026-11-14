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

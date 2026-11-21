"""
1.6.8: calidad de datos del CV (auditoría QA-005, QA-006, QA-007, QA-011, QA-030, QA-037).
CV ficticios en tests/fixtures (TENS de hospital y bodega con viñetas perdidas al extraer el PDF).
"""
from datetime import date
from pathlib import Path

import pytest

from app.agents.cv_builder import coherence_warnings, dedupe_bullets, similar_bullets
from app.agents.profile_analyzer import _role_company, deterministic_cv_parser
from app.models.schemas import CandidateProfile, WorkExperience

FIX = Path(__file__).parent / "fixtures"


# ---------- DT-18: empresa vs. cargo ----------

@pytest.mark.parametrize("header, role, company", [
    (["Hospital Ficticio del Puerto — TENS Servicio de Urgencia"], "TENS Servicio de Urgencia", "Hospital Ficticio del Puerto"),
    (["Operador de Grúa Horquilla | Logística Ficticia SpA"], "Operador de Grúa Horquilla", "Logística Ficticia SpA"),
    (["Analista Contable — Constructora Ficticia Ltda."], "Analista Contable", "Constructora Ficticia Ltda."),
    (["Clínica Los Andes, Paramédico"], "Paramédico", "Clínica Los Andes"),
    (["Municipalidad de Valparaíso", "Asistente Social"], "Asistente Social", "Municipalidad de Valparaíso"),
    (["Desarrollador Frontend", "Banco Ficticio"], "Desarrollador Frontend", "Banco Ficticio"),
    (["Liceo Ficticio — Profesora de Matemáticas"], "Profesora de Matemáticas", "Liceo Ficticio"),
    (["Supermercado Ficticio · Cajera"], "Cajera", "Supermercado Ficticio"),
    (["Vendedor | Tienda Ficticia S.A."], "Vendedor", "Tienda Ficticia S.A."),
    (["Cesfam Ficticio - Técnico en Enfermería"], "Técnico en Enfermería", "Cesfam Ficticio"),
    (["Jefe de Proyectos de la Región del", "Biobío"], "Jefe de Proyectos de la Región del Biobío", ""),
    (["Encargado de Bodega"], "Encargado de Bodega", ""),
])
def test_role_and_company_are_told_apart(header, role, company):
    assert _role_company(header) == (role, company)


# ---------- DT-20: viñetas sin duplicar ----------

def test_parser_does_not_copy_bullets_into_the_description():
    p = deterministic_cv_parser((FIX / "cv_tens_hospital.txt").read_text())
    first = p.experiences[0]
    assert first.role == "TENS Servicio de Urgencia" and first.company == "Hospital Ficticio del Puerto"
    assert first.description.startswith("Atención de pacientes")
    assert "signos vitales" not in first.description
    assert len(first.bullet_achievements) == 3
    # El último logro de un cargo no se pega a la empresa del siguiente.
    assert p.experiences[1].company == "Clínica Ficticia Costa"


def test_similar_bullets_and_leading_dashes_are_removed():
    out = dedupe_bullets([
        "- Control de inventario mensual con SAP",
        "Control mensual del inventario en SAP",
        "• Ordenamiento de bodega según rotación",
    ])
    assert out == ["Control de inventario mensual con SAP", "Ordenamiento de bodega según rotación"]
    assert not any(b.startswith(("-", "•")) for b in out)
    assert similar_bullets("Control de inventario mensual con SAP", "Control mensual del inventario en SAP")


def test_bullets_that_repeat_the_description_are_dropped():
    desc = ["Atención de pacientes en el servicio de urgencia adulto"]
    assert dedupe_bullets(["Atención de pacientes en servicio de urgencia adulto", "Curaciones avanzadas"], desc) == ["Curaciones avanzadas"]


# ---------- DT-21: contradicciones ----------

def _exp(role, start, end):
    return WorkExperience(company="X", role=role, start_date=start, end_date=end, location="", is_remote=False,
                          description="", bullet_achievements=[], technologies=[])


def test_warns_when_summary_years_disagree_with_dates_and_on_long_gaps():
    profile = CandidateProfile(
        name="Paula", summary="TENS con 4 años de experiencia en urgencia.",
        experiences=[_exp("TENS Urgencia", "03/2023", "Actualidad"), _exp("TENS Pabellón", "01/2019", "12/2021")],
    )
    notes = coherence_warnings(profile, date(2026, 11, 20))
    assert any("Tu resumen dice 4 años" in n and "~7" in n for n in notes)
    assert any("14 meses sin experiencia" in n for n in notes)


def test_no_warnings_when_consistent():
    profile = CandidateProfile(
        name="Ana", summary="Vendedora con 3 años de experiencia.",
        experiences=[_exp("Vendedora", "01/2023", "Actual")],
    )
    assert coherence_warnings(profile, date(2026, 11, 20)) == []


# ---------- DT-22: lectura sin IA de PDF y oficios ----------

def test_warehouse_cv_with_lost_bullets_and_licenses_heading():
    p = deterministic_cv_parser((FIX / "cv_bodega_sin_vinetas.txt").read_text())
    exp = p.experiences[0]
    assert (exp.role, exp.company) == ("Operador de Grúa Horquilla", "Logística Ficticia SpA")
    assert len(exp.bullet_achievements) == 3
    assert p.certifications == [
        "Licencia de conducir clase D", "Curso operador grúa horquilla (24 horas)", "Curso manejo manual de cargas (8 horas)",
    ]
    assert "Consultor / Especialista" not in p.related_roles
    assert p.related_roles == [] and p.economic_sectors == []
    assert p.seniority_level == ""
    assert p.region == "Región del Biobío"


def test_inline_bullets_are_split():
    text = (FIX / "cv_bodega_sin_vinetas.txt").read_text().replace(
        "Carga y descarga de camiones en centro de distribución\nControl de inventario mensual con lector y SAP\n"
        "Ordenamiento de bodega según rotación de productos",
        "• Carga y descarga de camiones • Control de inventario con SAP • Ordenamiento de bodega",
    )
    exp = deterministic_cv_parser(text).experiences[0]
    assert exp.bullet_achievements == ["Carga y descarga de camiones", "Control de inventario con SAP", "Ordenamiento de bodega"]


def test_valparaiso_cv_detects_its_region():
    assert deterministic_cv_parser((FIX / "cv_tens_hospital.txt").read_text()).region == "Región de Valparaíso"

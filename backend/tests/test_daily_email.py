"""Etapa C: correo diario con las ofertas nuevas (sin red: Resend simulado)."""

import pytest

from app.indexer import notify


def job(i, title, company="Empresa", area="Comercio y ventas", day="2026-11-17", **kw):
    return {"id": f"ix-{i}", "title": title, "company": company, "profession_category": area,
            "discovered_at": day, "url": f"https://x.cl/{i}", "source": "computrabajo", "description": title, **kw}


def index(jobs):
    return {"generated_at": "2026-11-17T11:05:00+00:00", "count": len(jobs) + 500, "jobs": jobs}


def test_only_new_jobs_and_max_two_per_company():
    jobs = [job(1, "Vendedor", "A"), job(2, "Vendedora", "A"), job(3, "Cajero", "A"),
            job(4, "Reponedor", "B"), job(5, "Vendedor antiguo", "C", day="2026-11-10")]
    subject, body_html, text = notify.build_email(index(jobs))
    assert "4 ofertas nuevas" in subject
    assert "Vendedor antiguo" not in text
    assert text.count("· A ·") == 2  # máximo 2 por empresa
    assert "Reponedor" in body_html


def test_keywords_filter_and_html_is_escaped():
    jobs = [job(1, "Encargado de Informática <b>", "TI SpA", "Tecnología"), job(2, "Psicólogo", "Salud SA", "Salud"),
            job(3, "Soporte TI", "Otra", "Tecnología")]
    subject, body_html, text = notify.build_email(index(jobs), ["encargado informatica"])
    assert "Psicólogo" not in text
    assert "Encargado de Informática &lt;b&gt;" in body_html
    assert "<b>" not in body_html.split("Encargado de Informática")[1][:10]


def test_nothing_new_sends_nothing(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("NOTIFY_EMAIL", "persona@example.com")
    monkeypatch.setattr(notify.requests, "post", lambda *a, **k: pytest.fail("no debe enviar"))
    assert notify.build_email(index([job(1, "Vendedor", day="2026-11-01")])) is None
    assert notify.send_daily_email(index([job(1, "Vendedor", day="2026-11-01")])) == 0


def test_disabled_without_secrets(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("NOTIFY_EMAIL", raising=False)
    assert notify.send_daily_email(index([job(1, "Vendedor")])) is None


def test_sends_with_resend(monkeypatch):
    sent = {}

    class R:
        status_code = 200
        text = "{}"

    def fake_post(url, json, headers, timeout):
        sent.update(url=url, body=json, headers=headers)
        return R()

    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("NOTIFY_EMAIL", "persona@example.com, otra@example.com")
    monkeypatch.delenv("NOTIFY_FROM", raising=False)
    monkeypatch.delenv("NOTIFY_KEYWORDS", raising=False)
    monkeypatch.setattr(notify.requests, "post", fake_post)
    assert notify.send_daily_email(index([job(1, "Vendedor"), job(2, "Bodeguero", "B", "Logística y transporte")])) == 2
    assert sent["url"] == notify.RESEND_URL
    assert sent["headers"]["Authorization"] == "Bearer re_test"
    assert sent["body"]["to"] == ["persona@example.com", "otra@example.com"]
    assert sent["body"]["from"] == notify.DEFAULT_FROM
    assert "Logística y transporte" in sent["body"]["html"]


def test_errors_never_show_the_email(monkeypatch):
    class R:
        status_code = 403
        text = "You can only send testing emails to your own email address (persona@example.com)."

    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("NOTIFY_EMAIL", "persona@example.com")
    monkeypatch.setattr(notify.requests, "post", lambda *a, **k: R())
    with pytest.raises(RuntimeError) as e:
        notify.send_daily_email(index([job(1, "Vendedor")]))
    assert "persona@example.com" not in str(e.value)
    assert "[correo oculto]" in str(e.value)


def test_first_run_is_a_sample():
    jobs = [job(i, f"Vendedor {i}", f"Empresa {i}") for i in range(300)]
    idx = {"generated_at": "2026-11-17T11:05:00+00:00", "count": 300, "jobs": jobs}
    subject, body_html, text = notify.build_email(idx)
    assert "Primer índice" in text
    assert sum(1 for line in text.splitlines() if line.startswith("- ")) <= notify.MAX_TOTAL

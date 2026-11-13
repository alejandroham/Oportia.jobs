import os
import json
import tempfile
import logging
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.models.schemas import (
    CandidateProfile, UserPreferences, JobPosting, 
    FitEvaluation, ApplicationDraft, FeedbackAction, LLMConfig,
    OutcomeSubmission, UpskillPlan, CompetencyDiagnosticItem,
    LearningCourseResource, LearningPath, TutorPracticeChallenge,
    TutorEvaluationResult,
    StatelessJobEvaluationRequest, StatelessApplicationDraftRequest,
    StatelessInterviewPrepRequest, StatelessInterviewEvalRequest,
    StatelessCoachDiagnosticRequest, StatelessLearningPathRequest,
    StatelessTutorChallengeRequest, StatelessTutorEvalRequest,
    StatelessChatOpiRequest, JobSearchRequest, JobSearchResponse
)
from app.storage.db import db
from app.agents.profile_analyzer import (
    extract_text_from_file, analyze_cv_content, assist_profile_content,
    suggest_roles_from_experience, tailor_profile_for_role
)
from app.agents.fit_evaluator import fit_evaluator
from app.agents.drafter_reviewer import drafter_reviewer
from app.agents.preference_learner import preference_learner
from app.agents.interview_coach import interview_coach
from app.agents.career_coach import career_coach
from app.agents.outcome_agent import outcome_agent
from app.agents.llm_provider import llm, LLMProviderError, AINotConnectedError
from app.agents.models import DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL, DEFAULT_CLAUDE_MODEL, CATALOG
from app.agents.llm_context import current_llm_credentials, LLMCredentials
from app.utils.cache import job_search_cache
from app.utils.rate_limiter import ai_rate_limiter, search_rate_limiter
from app.scrapers.remote_boards import RemoteBoardsScraper
from app.scrapers.linkedin_guest import LinkedInGuestScraper
from app.scrapers.url_parser import extract_job_from_url
from app.scrapers.chile_portals import ChilePortalsScraper
from app.scrapers.ats_scraper import ats_scraper
from app.agents.role_recommender import role_recommender
from app.utils.chile_regions import calculate_geographic_priority, detect_region_and_commune, get_all_regions_list
from app.models.schemas import (
    CompanyDirectoryItem, RoleRecommendation, GeneratedATSQuery
)

app = FastAPI(title="Oportia Jobs IA API", version=settings.VERSION)

# Restrict CORS to allowed origins (Task 1.6)
allowed_origins_list = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-LLM-Provider", "X-LLM-Model"],
)

@app.middleware("http")
async def extract_llm_credentials_middleware(request: Request, call_next):
    """
    Extracts ephemeral client-provided API keys from HTTP headers (Task 1.2).
    Keys are held only in a request-scoped ContextVar and immediately reset.
    Zero disk retention, zero logging.
    """
    provider = request.headers.get("X-LLM-Provider")
    api_key = request.headers.get("X-LLM-Key")
    model_name = request.headers.get("X-LLM-Model")
    if api_key:
        token = current_llm_credentials.set(
            LLMCredentials(
                provider=(provider or "gemini").lower(),
                api_key=api_key.strip(),
                model_name=model_name
            )
        )
    else:
        token = current_llm_credentials.set(None)
    try:
        response = await call_next(request)
        return response
    finally:
        current_llm_credentials.reset(token)

@app.middleware("http")
async def ensure_api_prefix_middleware(request, call_next):
    """
    Transparently rewrites root endpoint requests (e.g. /settings, /profile, /jobs)
    to /api/* so frontend calls work seamlessly whether VITE_API_URL has /api or not.
    """
    path = request.url.path
    if (
        not path.startswith("/api")
        and not path.startswith("/docs")
        and not path.startswith("/openapi")
        and not path.startswith("/redoc")
        and not path.startswith("/assets")
        and not path.startswith("/health")
        and path != "/"
        and path != "/favicon.ico"
    ):
        request.scope["path"] = f"/api{path}"
    return await call_next(request)

@app.exception_handler(LLMProviderError)
async def llm_provider_exception_handler(request: Request, exc: LLMProviderError):
    status_code = 400
    if exc.code == "invalid_key":
        status_code = 401
    elif exc.code == "quota_exceeded":
        status_code = 429
    elif exc.code == "timeout":
        status_code = 504
    elif exc.code == "service_unavailable":
        status_code = 503
    return JSONResponse(
        status_code=status_code,
        content=exc.to_dict()
    )

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Health check endpoint for Render, Vercel, and monitoring."""
    return {
        "status": "healthy",
        "service": "oportia-backend",
        "version": settings.VERSION,
        "provider": settings.DEFAULT_PROVIDER
    }

# --- Profile Endpoints ---

@app.get("/api/profile", response_model=CandidateProfile)
def get_profile():
    return db.get_profile()

@app.put("/api/profile", response_model=CandidateProfile)
def update_profile(profile: CandidateProfile):
    db.save_profile(profile)
    return profile

@app.post("/api/profile/upload")
async def upload_cv(file: UploadFile = File(...)):
    filename = file.filename or "cv.pdf"
    suffix = Path(filename).suffix.lower()
    if suffix not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(
            status_code=400,
            detail="Formato no compatible. Por favor sube tu currículum exclusivamente en formato PDF (.pdf) o Word (.docx, .doc)."
        )
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        content = await file.read()
        tmp.write(content)

    try:
        text = extract_text_from_file(tmp_path)
    finally:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception as e:
            logger.warning(f"Error unlinking temp file {tmp_path}: {e}")

    if not text:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del archivo subido.")

    # Option A: Do not save to DB (returns profile for client storage in IndexedDB)
    profile = analyze_cv_content(text, save_to_db=False)
    return {"message": "CV analizado exitosamente", "profile": profile}

@app.post("/api/profile/extract-preview")
async def extract_profile_preview(file: UploadFile = File(...)):
    filename = file.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(
            status_code=400,
            detail="Formato no compatible. Por favor sube tu currículum exclusivamente en formato PDF (.pdf) o Word (.docx, .doc)."
        )
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        content = await file.read()
        tmp.write(content)

    try:
        text = extract_text_from_file(tmp_path)
    finally:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception as e:
            logger.warning(f"Error unlinking temp file {tmp_path}: {e}")

    if not text:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del archivo subido.")

    # Extract without saving to DB (requires explicit candidate review & confirmation)
    extracted = analyze_cv_content(text, save_to_db=False)
    return {
        "message": "Currículum analizado para revisión previa",
        "extracted_profile": extracted,
        "filename": filename,
        "text_length": len(text)
    }

@app.post("/api/profile/ai-assist")
def ai_assist_profile_endpoint(data: dict):
    section = data.get("section", "summary")
    action = data.get("action", "improve")
    current_text = data.get("current_text", "")
    target_role = data.get("target_role")
    res = assist_profile_content(section, action, current_text, target_role)
    return res

@app.post("/api/profile/import-linkedin")
async def import_from_linkedin():
    raise HTTPException(
        status_code=400,
        detail="La importación directa desde perfiles de LinkedIn ha sido deshabilitada para evitar distorsiones en la experiencia profesional. Por favor sube tu currículum oficial en formato PDF (.pdf) o Word (.docx, .doc)."
    )

@app.api_route("/api/profile/suggest-roles", methods=["GET", "POST"])
def suggest_roles_endpoint(data: Optional[dict] = None):
    """Generates suggested career roles derived directly from candidate's CV experiences and taxonomy"""
    profile = None
    if data and data.get("profile"):
        try:
            profile = CandidateProfile(**data["profile"])
        except Exception:
            profile = None
    if not profile:
        profile = db.get_profile()
    if not profile or not profile.name or profile.name.lower() == "candidato":
        return []
    return suggest_roles_from_experience(profile)

@app.post("/api/profile/tailor-version")
def tailor_version_endpoint(data: dict):
    """Tailors headline, executive summary, and prioritizes skills for a target role without hallucinations"""
    target_role = data.get("target_role", "").strip()
    version_name = data.get("version_name", "").strip() or None
    if not target_role:
        raise HTTPException(status_code=400, detail="Debes indicar un cargo objetivo para optimizar la versión.")
    
    profile_data = data.get("profile")
    if profile_data:
        profile = CandidateProfile(**profile_data)
    else:
        profile = db.get_profile()

    if not profile or not profile.name or profile.name.lower() == "candidato":
        raise HTTPException(status_code=400, detail="Se requiere un currículum cargado para optimizar con IA.")

    tailored = tailor_profile_for_role(profile, target_role, version_name)
    return tailored

# --- Preferences & Learning Endpoints ---

@app.get("/api/preferences", response_model=UserPreferences)
def get_preferences():
    return db.get_preferences()

@app.put("/api/preferences", response_model=UserPreferences)
def update_preferences(prefs: UserPreferences):
    db.save_preferences(prefs)
    return prefs

@app.post("/api/memory/consolidate", response_model=UserPreferences)
def consolidate_ai_memory():
    """Triggers deep cognitive memory synthesis across CV, Applications, Radar & STAR answers"""
    return preference_learner.consolidate_memory()

@app.post("/api/memory/reset", response_model=UserPreferences)
def reset_ai_memory():
    """Wipes all learned memory, DNA, STAR stories and feedback history to start 100% fresh"""
    return preference_learner.reset_memory()

@app.delete("/api/memory/stories/{story_id}", response_model=UserPreferences)
def delete_learned_star_story(story_id: str):
    """Allows user to remove a learned STAR story from memory"""
    prefs = db.get_preferences()
    prefs.learned_star_stories = [s for s in prefs.learned_star_stories if s.id != story_id]
    preference_learner._update_maturity(prefs)
    db.save_preferences(prefs)
    return prefs

@app.post("/api/chat/opi", dependencies=[Depends(ai_rate_limiter)])
def chat_opi_stateless(req: StatelessChatOpiRequest):
    """
    Stateless conversational Opi Copilot endpoint (Option A).
    Accepts message, profile, preferences, history.
    Zero server disk read/write.
    """
    creds = current_llm_credentials.get()
    has_key = bool(creds and creds.api_key) or bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)
    if not has_key:
        raise HTTPException(
            status_code=403,
            detail=(
                "Opi Copiloto requiere una clave de API activa (Google Gemini, OpenAI o Claude). "
                "La clave se custodia exclusivamente en tu navegador y viaja de forma segura por petición."
            )
        )
    return preference_learner.chat_and_learn(
        message=req.message,
        chat_history=req.history,
        profile=req.profile,
        prefs=req.preferences,
        save_to_db=False
    )

@app.post("/api/memory/chat")
def memory_chat(payload: dict):
    """Conversational Memory Coach to feed and enrich AI cognitive memory in real-time"""
    message = payload.get("message", "").strip()
    history = payload.get("history", [])
    if not message:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    creds = current_llm_credentials.get()
    has_key = bool(creds and creds.api_key) or bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)
    if not has_key:
        raise HTTPException(
            status_code=403,
            detail=(
                "Opi Copiloto requiere una clave de API activa (Google Gemini, OpenAI o Claude) para interactuar en vivo. "
                "La clave no es guardada por la aplicación en servidores externos y se mantiene 100% segura y cifrada en tu propio equipo."
            )
        )

    profile_data = payload.get("profile")
    prefs_data = payload.get("preferences")
    profile = CandidateProfile(**profile_data) if profile_data else None
    prefs = UserPreferences(**prefs_data) if prefs_data else None
    save_to_db = not (profile or prefs)

    result = preference_learner.chat_and_learn(
        message=message,
        chat_history=history,
        profile=profile,
        prefs=prefs,
        save_to_db=save_to_db
    )
    return result

@app.post("/api/feedback")
def record_feedback(event: FeedbackAction):
    updated_prefs = preference_learner.process_feedback(event)
    return {"status": "success", "learned_insights": updated_prefs.auto_learned_insights}

# --- Companies Directory & ATS Endpoints ---

@app.get("/api/companies", response_model=List[CompanyDirectoryItem])
def list_companies(country: Optional[str] = None, industry: Optional[str] = None):
    return db.get_companies(country=country, industry=industry)

def _has_analyzed_cv(profile: Optional[CandidateProfile]) -> bool:
    """Verifies that a real CV has been uploaded and analyzed before allowing AI evaluations."""
    if not profile or not profile.name or profile.name.strip().lower() == "candidato":
        return False
    return bool(profile.experiences or profile.technical_skills or profile.headline or profile.primary_profession)

@app.get("/api/roles/recommendations", response_model=List[RoleRecommendation])
def get_role_recommendations(force_refresh: bool = False):
    profile = db.get_profile()
    if not _has_analyzed_cv(profile):
        return []

    existing = db.get_role_recommendations()
    # Auto-refresh if stored recs are legacy placeholders (<=3 or containing 'Profesional & Especialidad')
    is_stale_or_default = False
    if existing:
        if len(existing) < 4 or any("Profesional & Especialidad" in r.role_family for r in existing):
            is_stale_or_default = True

    if existing and not force_refresh and not is_stale_or_default:
        return existing

    prefs = db.get_preferences()
    recs = role_recommender.recommend_roles(profile, prefs)
    db.save_role_recommendations(recs)
    return recs

@app.post("/api/roles/recommendations/{rec_id}/status", response_model=RoleRecommendation)
def update_role_rec_status(rec_id: str, data: dict):
    approved = data.get("approved", True)
    updated = db.update_role_recommendation_status(rec_id, approved=approved)
    if not updated:
        raise HTTPException(status_code=404, detail="Recomendación no encontrada")
    return updated

@app.get("/api/roles/ats-queries", response_model=List[GeneratedATSQuery])
def get_ats_queries():
    profile = db.get_profile()
    if not _has_analyzed_cv(profile):
        return []

    prefs = db.get_preferences()
    recs = db.get_role_recommendations()
    if not recs:
        recs = role_recommender.recommend_roles(profile, prefs)
        db.save_role_recommendations(recs)
    queries = role_recommender.generate_ats_queries(profile, prefs, recs)
    return queries

@app.post("/api/jobs/scrape-query")
def scrape_custom_query(data: dict):
    query = data.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Consulta no proporcionada")
    jobs = ats_scraper.search(keywords=query, limit=15)
    added = db.save_jobs(jobs)
    return {
        "message": f"Búsqueda ATS ejecutada: {len(jobs)} ofertas encontradas ({added} nuevas).",
        "total_fetched": len(jobs),
        "new_added": added,
        "query": query
    }

# --- Jobs & Radar Endpoints ---

@app.get("/api/regions")
def list_regions():
    """Returns official list of all 16 Chilean regions and communes for filters."""
    return get_all_regions_list()

@app.get("/api/jobs", response_model=List[JobPosting])
def list_jobs(status: Optional[str] = None):
    jobs = db.get_jobs(status=status)
    prefs = db.get_preferences()
    profile = db.get_profile()
    user_reg = prefs.preferred_region or profile.region or None
    user_comm = prefs.preferred_communes[0] if prefs.preferred_communes else (profile.commune or None)

    # Dynamically annotate region and geographic priority according to user's active preferences
    for j in jobs:
        geo_cat, _, reg, comm = calculate_geographic_priority(
            j.location,
            user_region=user_reg,
            user_commune=user_comm
        )
        if reg and not j.region:
            j.region = reg
        if comm and not j.commune:
            j.commune = comm
        j.is_user_region = (geo_cat == "user_region")
        if not j.modality:
            j.modality = "Remoto" if j.is_remote else "Presencial"

    return jobs

@app.post("/api/jobs/search", response_model=JobSearchResponse, dependencies=[Depends(search_rate_limiter)])
def search_jobs_stateless(req: JobSearchRequest):
    """
    Stateless job search across Chilean portals, Remote boards, and ATS corporativo (Option A).
    Executes sources concurrently with 5.0s timeout per source.
    Results are cached in server RAM for 15 minutes.
    Zero server disk retention (db.save_jobs is NEVER called).
    """
    cache_key = f"{req.keywords.lower()}:{req.remote_only}:{req.search_scope}:{req.region}:{req.commune}"
    cached = job_search_cache.get(cache_key)
    if cached is not None:
        if isinstance(cached, JobSearchResponse):
            return cached
        if isinstance(cached, dict):
            return JobSearchResponse(**cached)
        if isinstance(cached, list):
            return JobSearchResponse(jobs=cached, sources_failed=[], total=len(cached))

    kw = req.keywords.strip()
    jobs: List[JobPosting] = []
    sources_failed: List[str] = []

    def fetch_remote_boards():
        scraper = RemoteBoardsScraper()
        return scraper.search_with_status(keywords=kw, remote_only=req.remote_only, limit=20)

    def fetch_linkedin():
        scraper = LinkedInGuestScraper()
        return scraper.search(keywords=kw, remote_only=req.remote_only, limit=8), []

    def fetch_chile():
        scraper = ChilePortalsScraper()
        return scraper.search(keywords=kw, remote_only=req.remote_only, limit=40), []

    def fetch_ats():
        return ats_scraper.search(keywords=kw, remote_only=req.remote_only, limit=15), []

    tasks: Dict[str, Any] = {}
    if req.search_scope in ("global", "all"):
        tasks["Tableros Remotos"] = fetch_remote_boards
        tasks["LinkedIn Empleos"] = fetch_linkedin
    if req.search_scope in ("chile", "all"):
        tasks["Portales Chile"] = fetch_chile
    tasks["ATS Corporativo"] = fetch_ats

    with ThreadPoolExecutor(max_workers=min(4, len(tasks))) as executor:
        future_to_source = {executor.submit(fn): name for name, fn in tasks.items()}
        for future in as_completed(future_to_source):
            src_name = future_to_source[future]
            try:
                result = future.result(timeout=5.0)
                if isinstance(result, tuple):
                    found_jobs, partial_failures = result
                    jobs.extend(found_jobs)
                    if partial_failures:
                        sources_failed.extend(partial_failures)
                elif isinstance(result, list):
                    jobs.extend(result)
            except Exception as e:
                logger.warning(f"Error fetching from source {src_name}: {e}")
                sources_failed.append(src_name)

    # Annotate region, commune, and modality
    for j in jobs:
        geo_cat, _, reg, comm = calculate_geographic_priority(
            j.location,
            user_region=req.region,
            user_commune=req.commune
        )
        if reg and not j.region:
            j.region = reg
        if comm and not j.commune:
            j.commune = comm
        j.is_user_region = (geo_cat == "user_region")
        if not j.modality:
            j.modality = "Remoto" if j.is_remote else "Presencial"

    # Deduplicate by url or title+company
    seen = set()
    deduped: List[JobPosting] = []
    for j in jobs:
        uniq = j.url or f"{j.title}:{j.company}".lower()
        if uniq not in seen:
            seen.add(uniq)
            deduped.append(j)

    response = JobSearchResponse(
        jobs=deduped,
        sources_failed=sorted(list(set(sources_failed))),
        total=len(deduped)
    )
    job_search_cache.set(cache_key, response)
    return response

@app.post("/api/jobs/scrape")
def trigger_scrape(keywords: Optional[str] = None, remote_only: bool = False, scope: str = "chile"):
    """
    Scrape job postings from multiple sources dynamically based on candidate profession.
    """
    prefs = db.get_preferences()
    profile = db.get_profile()

    # Dynamic search keyword: prefer user keyword, then profile primary profession, then target_roles
    kw = keywords or (profile.primary_profession or (prefs.target_roles[0] if prefs.target_roles else ""))
    user_reg = prefs.preferred_region or profile.region or None
    user_comm = prefs.preferred_communes[0] if prefs.preferred_communes else (profile.commune or None)

    jobs: list = []

    # ── International / Global remote boards ────────────────────────────────
    if scope in ("global", "all"):
        try:
            remote_scraper = RemoteBoardsScraper()
            global_jobs = remote_scraper.search(keywords=kw, remote_only=remote_only, limit=20)
            jobs.extend(global_jobs)
        except Exception as e:
            import logging; logging.getLogger(__name__).warning(f"Remote boards error: {e}")

        try:
            linkedin_scraper = LinkedInGuestScraper()
            li_jobs = linkedin_scraper.search(keywords=kw, remote_only=remote_only, limit=8)
            jobs.extend(li_jobs)
        except Exception:
            pass

    # ── Chilean Portals ──────────────────────────────────────────────────────
    if scope in ("chile", "all"):
        try:
            chile_scraper = ChilePortalsScraper()
            chile_jobs = chile_scraper.search(keywords=kw, remote_only=remote_only, limit=40)
            jobs.extend(chile_jobs)
        except Exception as e:
            import logging; logging.getLogger(__name__).warning(f"Chile portals error: {e}")

    # ── Direct ATS Corporate Scraper (Workday, Greenhouse, Lever, Ashby) ──
    try:
        ats_jobs = ats_scraper.search(keywords=kw, remote_only=remote_only, limit=15)
        jobs.extend(ats_jobs)
    except Exception as e:
        import logging; logging.getLogger(__name__).warning(f"ATS direct error: {e}")

    # Annotate all scraped jobs with geographic categorization & modality
    for j in jobs:
        geo_cat, _, reg, comm = calculate_geographic_priority(
            j.location,
            user_region=user_reg,
            user_commune=user_comm
        )
        if reg and not j.region:
            j.region = reg
        if comm and not j.commune:
            j.commune = comm
        j.is_user_region = (geo_cat == "user_region")
        if not j.modality:
            j.modality = "Remoto" if j.is_remote else "Presencial"

    added = db.save_jobs(jobs)
    scope_labels = {
        "global": "portales internacionales remotos + ATS",
        "chile": "portales chilenos (nacional + regional) + ATS",
        "all": "portales globales + chilenos + ATS Corporativo"
    }
    return {
        "message": f"Radar actualizado ({kw or 'búsqueda general'}) — {scope_labels.get(scope, scope)}: {len(jobs)} vacantes encontradas ({added} nuevas).",
        "total_fetched": len(jobs),
        "new_added": added,
        "scope": scope,
        "user_region": user_reg,
        "sources": list({j.source for j in jobs})
    }

@app.post("/api/jobs/import-url")
def import_job_from_url(data: dict):
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL es requerida")

    parsed = extract_job_from_url(url)
    if "error" in parsed:
        raise HTTPException(status_code=400, detail=parsed["error"])

    job = JobPosting(
        title=parsed.get("title", "Posición Detectada"),
        company=parsed.get("company", "Empresa Externa"),
        location=parsed.get("location", "Remoto"),
        is_remote=parsed.get("is_remote", True),
        description=parsed.get("description", ""),
        url=url,
        source="url_import"
    )

    db.save_jobs([job])
    return {"message": "Oferta importada exitosamente", "job": job}

@app.post("/api/jobs/evaluate", response_model=FitEvaluation, dependencies=[Depends(ai_rate_limiter)])
def evaluate_job_stateless(req: StatelessJobEvaluationRequest):
    """
    Pure stateless fit evaluation (Option A).
    Evaluates fit score directly from client-provided job, profile, and preferences.
    Zero server disk read/write.
    """
    if not _has_analyzed_cv(req.profile):
        raise HTTPException(
            status_code=400,
            detail="Para evaluar el Fit Score con IA primero debes cargar tu currículum vitae."
        )
    return fit_evaluator.evaluate(req.job, req.profile, req.preferences)

@app.post("/api/jobs/{job_id}/evaluate", response_model=FitEvaluation)
def evaluate_job(job_id: str):
    profile = db.get_profile()
    if not _has_analyzed_cv(profile):
        raise HTTPException(
            status_code=400,
            detail="Para evaluar el Fit Score con IA primero debes cargar y analizar tu currículum vitae en 'Perfil & CV'."
        )

    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    
    prefs = db.get_preferences()
    evaluation = fit_evaluator.evaluate(job, profile, prefs)
    return evaluation

@app.get("/api/jobs/{job_id}/evaluation", response_model=Optional[FitEvaluation])
def get_job_evaluation(job_id: str):
    return db.get_evaluation(job_id)

@app.post("/api/jobs/batch-rank")
def batch_rank_jobs():
    profile = db.get_profile()
    if not _has_analyzed_cv(profile):
        raise HTTPException(
            status_code=400,
            detail="No se puede evaluar el Fit Score sin un currículum cargado y analizado. Carga tu CV primero en 'Perfil & CV'."
        )

    jobs = db.get_jobs()
    prefs = db.get_preferences()

    evaluated_count = 0
    # Evaluate unevaluated jobs first (or top batch)
    unevaluated = [j for j in jobs if j.fit_score is None]
    target_jobs = unevaluated if unevaluated else jobs
    for job in target_jobs[:20]:
        fit_evaluator.evaluate(job, profile, prefs)
        evaluated_count += 1

    return {"message": f"{evaluated_count} ofertas evaluadas con IA y ordenadas por Fit Score (de mayor a menor porcentaje)."}

@app.post("/api/jobs/{job_id}/track", response_model=JobPosting)
def track_job_endpoint(job_id: str):
    job = db.track_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return job

@app.put("/api/jobs/{job_id}", response_model=JobPosting)
def update_job_endpoint(job_id: str, data: dict):
    updated = db.update_job(job_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return updated

@app.post("/api/jobs/{job_id}/classify", response_model=JobPosting)
def classify_job_endpoint(job_id: str, data: dict):
    status = data.get("status")
    allowed_statuses = (
        "offer", "rejected", "applied", "interviewing", "saved", "responded",
        "eval_pending", "eval_approved", "eval_discarded",
        "preparing", "ready_to_send", "pending_send",
        "applied_no_response", "contact_received",
        "interview_scheduled", "interview_done", "in_evaluation", "final_stage"
    )
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Estado de clasificación inválido")
    reason = data.get("reason")
    feedback = data.get("feedback")
    classified = db.classify_job(job_id, status=status, reason=reason, feedback=feedback)
    if not classified:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return classified

@app.post("/api/jobs/{job_id}/history", response_model=JobPosting)
def add_job_history_endpoint(job_id: str, data: dict):
    updated = db.add_job_history_event(job_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    return updated

@app.delete("/api/jobs/{job_id}/history/{event_id}", response_model=JobPosting)
def delete_job_history_endpoint(job_id: str, event_id: str):
    updated = db.delete_job_history_event(job_id, event_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Empleo o evento no encontrado")
    return updated

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str, from_section: str = "radar"):
    db.delete_job(job_id, from_section=from_section)
    msg = "Oportunidad descartada del Radar" if from_section == "radar" else "Registro eliminado del Seguimiento"
    return {"message": msg}

@app.delete("/api/jobs")
def clear_all_jobs():
    db.clear_radar_jobs()
    return {"message": "Radar limpiado exitosamente. Las ofertas en Seguimiento se mantienen protegidas."}

@app.put("/api/jobs/{job_id}/status")
def update_job_status_endpoint(job_id: str, data: dict):
    new_status = data.get("status", "saved")
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    db.update_job_status(job_id, status=new_status)
    return {"message": f"Estado actualizado a {new_status}"}

@app.post("/api/jobs/{job_id}/outcome", response_model=UpskillPlan)
def register_job_outcome(job_id: str, submission: OutcomeSubmission):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    profile = db.get_profile()
    prefs = db.get_preferences()
    plan = outcome_agent.process_outcome(submission, job, profile, prefs)
    return plan

# --- Drafter-Reviewer Application Endpoints ---

@app.post("/api/applications/draft", response_model=ApplicationDraft, dependencies=[Depends(ai_rate_limiter)])
def draft_application_stateless(req: StatelessApplicationDraftRequest):
    """
    Pure stateless application generator (Option A).
    Zero server database read/write.
    """
    return drafter_reviewer.generate_application(req.job, req.profile)

@app.post("/api/jobs/{job_id}/apply", response_model=ApplicationDraft)
def apply_to_job(job_id: str):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    
    profile = db.get_profile()
    draft = drafter_reviewer.generate_application(job, profile)
    return draft

@app.get("/api/applications", response_model=List[ApplicationDraft])
def list_applications():
    return db.get_applications()

@app.get("/api/applications/{job_id}", response_model=Optional[ApplicationDraft])
def get_application(job_id: str):
    return db.get_application_by_job_id(job_id)

@app.delete("/api/applications/{job_id}")
def delete_application_endpoint(job_id: str):
    db.delete_application(job_id)
    return {"message": "Postulación eliminada exitosamente"}

# --- Interview Coach Endpoints ---

@app.post("/api/jobs/{job_id}/interview-prep")
def get_interview_prep(job_id: str):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    
    profile = db.get_profile()
    kit = interview_coach.generate_prep_kit(job, profile)
    return kit

@app.post("/api/interview/evaluate-answer")
def evaluate_interview_answer(data: dict):
    question = data.get("question", "")
    answer = data.get("answer", "")
    company = data.get("company", None)
    if not question or not answer:
        raise HTTPException(status_code=400, detail="Pregunta y respuesta requeridas")
    eval_res = interview_coach.evaluate_mock_answer(question, answer)
    try:
        preference_learner.learn_from_star_answer(question, answer, eval_res, company=company)
    except Exception as e:
        logger.warning(f"Error auto-learning from interview answer: {e}")
    return eval_res

# --- Coach IA Endpoints (Desarrollo y Crecimiento Profesional) ---

@app.api_route("/api/coach/diagnostic", methods=["GET", "POST"], response_model=List[CompetencyDiagnosticItem])
def get_coach_diagnostic(payload: Optional[dict] = None):
    profile = None
    if payload and payload.get("profile"):
        try:
            profile = CandidateProfile(**payload["profile"])
        except Exception:
            profile = None
    if not profile:
        profile = db.get_profile()
    return career_coach.generate_or_get_diagnostic(profile)

@app.put("/api/coach/competencies/{comp_id}", response_model=CompetencyDiagnosticItem)
def update_coach_competency(comp_id: str, data: dict):
    comps = db.get_competencies()
    target = None
    for c in comps:
        if c.id == comp_id:
            if "declared_level" in data:
                c.declared_level = data["declared_level"]
            if "validation_status" in data:
                c.validation_status = data["validation_status"]
            if "evidence" in data and data["evidence"]:
                if data["evidence"] not in c.evidences:
                    c.evidences.append(data["evidence"])
            c.updated_at = datetime.utcnow().isoformat()
            target = c
            break
    if not target:
        raise HTTPException(status_code=404, detail="Competencia no encontrada")
    db.save_competency(target)
    return target

@app.post("/api/coach/sync-gaps/{job_id}", response_model=List[CompetencyDiagnosticItem])
def sync_gaps_from_job(job_id: str):
    job = db.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    evaluation = db.get_evaluation(job_id)
    if not evaluation:
        profile = db.get_profile()
        prefs = db.get_preferences()
        evaluation = fit_evaluator.evaluate(job, profile, prefs)
    return career_coach.sync_gaps_from_evaluation(evaluation, job.title)

@app.get("/api/coach/courses", response_model=List[LearningCourseResource])
def search_coach_courses(query: Optional[str] = None, competency: Optional[str] = None, cost: Optional[str] = None):
    return career_coach.search_verified_courses(query=query or "", competency=competency or "", cost_filter=cost)

@app.post("/api/coach/learning-path", response_model=LearningPath)
def generate_coach_learning_path(data: dict):
    target_role = data.get("target_role", "Especialista TI")
    gaps = data.get("gaps", [])
    profile_data = data.get("profile")
    profile = CandidateProfile(**profile_data) if profile_data else db.get_profile()
    return career_coach.generate_learning_path(target_role, gaps, profile)

@app.get("/api/coach/learning-paths", response_model=List[LearningPath])
def get_coach_learning_paths():
    return db.get_learning_paths()

@app.put("/api/coach/learning-paths/{path_id}/milestones/{step_number}", response_model=LearningPath)
def update_milestone(path_id: str, step_number: int, data: dict):
    status = data.get("status", "completed")
    evidence = data.get("evidence", None)
    res = db.update_milestone_status(path_id, step_number, status, evidence)
    if not res:
        raise HTTPException(status_code=404, detail="Ruta de aprendizaje o hito no encontrado")
    return res

@app.post("/api/coach/tutor/challenge", response_model=TutorPracticeChallenge)
def generate_tutor_challenge(data: dict):
    competency = data.get("competency", "Continuidad Operacional")
    seniority = data.get("seniority", "Intermedio")
    return career_coach.generate_practice_challenge(competency, seniority)

@app.post("/api/coach/tutor/evaluate", response_model=TutorEvaluationResult)
def evaluate_tutor_solution(data: dict):
    challenge_data = data.get("challenge")
    solution = data.get("solution", "")
    if not challenge_data or not solution:
        raise HTTPException(status_code=400, detail="Desafío y solución del candidato requeridos")
    challenge = TutorPracticeChallenge(**challenge_data)
    return career_coach.evaluate_tutor_response(challenge, solution)

@app.post("/api/coach/interview-prep")
def get_targeted_interview_prep(data: dict):
    interviewer_role = data.get("interviewer_role", "all")
    job_data = data.get("job")
    profile_data = data.get("profile")
    if job_data and profile_data:
        try:
            job = JobPosting(**job_data)
            profile = CandidateProfile(**profile_data)
            return career_coach.generate_targeted_interview_prep(job, profile, interviewer_role)
        except Exception as e:
            logger.warning(f"Error in stateless interview prep: {e}")
    job_id = data.get("job_id")
    job = db.get_job_by_id(job_id) if job_id else None
    if not job:
        raise HTTPException(status_code=404, detail="Empleo no encontrado")
    profile = db.get_profile()
    return career_coach.generate_targeted_interview_prep(job, profile, interviewer_role)

@app.post("/api/coach/interview-eval")
def evaluate_interview_eval_stateless(req: StatelessInterviewEvalRequest):
    return interview_coach.evaluate_mock_answer(req.question, req.answer)

# --- Settings & Keys Endpoints ---

@app.get("/api/settings")
def get_current_settings():
    """
    Returns available LLM catalog and current defaults.
    Under Option A (Stateless), the server retains zero client keys.
    """
    provider = settings.DEFAULT_PROVIDER
    active_model_name = (
        settings.GEMINI_MODEL if provider == "gemini"
        else settings.OPENAI_MODEL if provider == "openai"
        else settings.CLAUDE_MODEL
    ) or DEFAULT_GEMINI_MODEL

    return {
        "provider": provider,
        "has_active_key": False,
        "active_model_name": active_model_name,
        "status_label": "IA no conectada",
        "status_color": "yellow",
        "has_gemini_key": False,
        "has_openai_key": False,
        "has_claude_key": False,
        "gemini_model": settings.GEMINI_MODEL or DEFAULT_GEMINI_MODEL,
        "openai_model": settings.OPENAI_MODEL or DEFAULT_OPENAI_MODEL,
        "claude_model": settings.CLAUDE_MODEL or DEFAULT_CLAUDE_MODEL,
        "available_models": CATALOG
    }

@app.post("/api/settings")
def update_llm_settings(config: LLMConfig):
    """
    Stateless Option A: Updates default provider and model preference in server RAM only.
    Zero disk retention. Never saves api_key to disk.
    """
    settings.DEFAULT_PROVIDER = config.provider
    if config.model_name:
        if config.provider == "gemini":
            settings.GEMINI_MODEL = config.model_name
        elif config.provider == "openai":
            settings.OPENAI_MODEL = config.model_name
        elif config.provider == "claude":
            settings.CLAUDE_MODEL = config.model_name
    return {"message": "Configuración de modelos actualizada en memoria"}

@app.post("/api/settings/purge")
def purge_settings_and_keys():
    """Wipes all API keys and resets in-memory provider state."""
    llm.reset_provider()
    return {"message": "Claves de API y configuración eliminadas completamente"}

@app.post("/api/purge-all")
def purge_all_data():
    """
    Stateless Option A: Clears server RAM caches (search cache, rate limiters, LLM credentials).
    Under stateless architecture, all user data resides exclusively in client IndexedDB.
    """
    llm.reset_provider()
    job_search_cache.clear()
    ai_rate_limiter.clear()
    search_rate_limiter.clear()
    db.purge_all_data()
    return {"message": "Caché de servidor purgada exitosamente. Todo dato de usuario reside exclusivamente en tu navegador."}

@app.get("/api/legacy-export")
def get_legacy_export():
    """
    Stateless Migration Helper (Task 1.8).
    Transfers pre-existing server disk data to the client's browser (IndexedDB) once.
    Renames the local legacy files to .bak after export so they are never read again.
    """
    profile_path = settings.PROFILE_FILE
    if not profile_path.exists():
        return {"found": False}

    try:
        with open(profile_path, "r", encoding="utf-8") as f:
            profile_data = json.load(f)
    except Exception:
        profile_data = None

    if not profile_data or not profile_data.get("name") or profile_data.get("name").strip().lower() == "candidato":
        return {"found": False}

    preferences_data = None
    if settings.PREFERENCES_FILE.exists():
        try:
            with open(settings.PREFERENCES_FILE, "r", encoding="utf-8") as f:
                preferences_data = json.load(f)
        except Exception:
            pass

    jobs_data = []
    if settings.JOBS_FILE.exists():
        try:
            with open(settings.JOBS_FILE, "r", encoding="utf-8") as f:
                jobs_data = json.load(f)
        except Exception:
            pass

    applications_data = []
    if settings.APPLICATIONS_FILE.exists():
        try:
            with open(settings.APPLICATIONS_FILE, "r", encoding="utf-8") as f:
                applications_data = json.load(f)
        except Exception:
            pass

    coach_data = None
    if settings.COACH_DATA_FILE.exists():
        try:
            with open(settings.COACH_DATA_FILE, "r", encoding="utf-8") as f:
                coach_data = json.load(f)
        except Exception:
            pass

    # Rename legacy files to .bak so they are archived and not re-read
    legacy_files = [
        settings.PROFILE_FILE,
        settings.PREFERENCES_FILE,
        settings.JOBS_FILE,
        settings.APPLICATIONS_FILE,
        settings.COACH_DATA_FILE,
        settings.EVALUATIONS_FILE,
        settings.FEEDBACK_FILE
    ]
    for p in legacy_files:
        if p.exists():
            try:
                bak_path = p.with_suffix(p.suffix + ".bak")
                p.rename(bak_path)
            except Exception as e:
                logger.warning(f"Could not rename legacy file {p} to .bak: {e}")

    return {
        "found": True,
        "profile": profile_data,
        "preferences": preferences_data,
        "jobs": jobs_data,
        "applications": applications_data,
        "coach_data": coach_data
    }

# Serve frontend build if present
FRONTEND_DIST = settings.BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

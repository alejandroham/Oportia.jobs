import httpx
import logging
import re
from typing import List, Tuple
from app.utils.concurrency import run_with_deadline
from app.models.schemas import JobPosting
from app.scrapers.base import BaseScraper
from app.utils.keywords import keyword_matches

logger = logging.getLogger(__name__)

BOARD_TIMEOUT_SECONDS = 5.0

class RemoteBoardsScraper(BaseScraper):
    @property
    def name(self) -> str:
        return "remote_boards_aggregator"

    def _fetch_arbeitnow(self, keywords: str, remote_only: bool, limit: int) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        url = "https://www.arbeitnow.com/api/job-board-api"
        with httpx.Client(timeout=BOARD_TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                for item in data:
                    title = item.get("title", "")
                    desc = item.get("description", "")
                    clean_desc = re.sub(r'<[^>]+>', ' ', desc)
                    is_remote = item.get("remote", False) or "remote" in title.lower() or "remoto" in title.lower()

                    # Arbeitnow publica sobre todo empleos presenciales en Alemania: para personas
                    # en Chile solo sirven los remotos, se pida o no "solo remoto".
                    if not is_remote:
                        continue

                    # Solo título y etiquetas: en la descripción casi siempre aparecen palabras
                    # genéricas ("sales", "manager") que traían ofertas sin relación.
                    if keywords and not keyword_matches(
                        f"{title} {' '.join(str(t) for t in item.get('tags', []) or [])}", keywords
                    ):
                        continue

                    jobs.append(JobPosting(
                        title=title,
                        company=item.get("company_name", "Empresa Confidencial"),
                        location=item.get("location", "Remote"),
                        is_remote=is_remote,
                        description=clean_desc[:4000],
                        url=item.get("url"),
                        source="arbeitnow",
                        tags=item.get("tags", []),
                        posted_at=str(item.get("created_at", ""))
                    ))
                    if len(jobs) >= limit:
                        break
        return jobs

    def _fetch_remotive(self, keywords: str, remote_only: bool, limit: int) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        url = "https://remotive.com/api/remote-jobs"
        with httpx.Client(timeout=BOARD_TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = client.get(url, params={"limit": 100})
            if resp.status_code == 200:
                data = resp.json().get("jobs", [])
                for item in data:
                    title = item.get("title", "")
                    desc = item.get("description", "")
                    clean_desc = re.sub(r'<[^>]+>', ' ', desc)
                    salary = item.get("salary", "")

                    # Solo título y etiquetas: en la descripción casi siempre aparecen palabras
                    # genéricas ("sales", "manager") que traían ofertas sin relación.
                    if keywords and not keyword_matches(
                        f"{title} {' '.join(str(t) for t in item.get('tags', []) or [])}", keywords
                    ):
                        continue

                    jobs.append(JobPosting(
                        title=title,
                        company=item.get("company_name", "Empresa"),
                        location=item.get("candidate_required_location", "Worldwide Remote"),
                        is_remote=True,
                        salary_range=salary if salary else None,
                        description=clean_desc[:4000],
                        url=item.get("url"),
                        source="remotive",
                        tags=item.get("tags", []),
                        posted_at=str(item.get("publication_date", ""))
                    ))
                    if len(jobs) >= limit:
                        break
        return jobs

    def _fetch_remoteok(self, keywords: str, remote_only: bool, limit: int) -> List[JobPosting]:
        jobs: List[JobPosting] = []
        url = "https://remoteok.com/api"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        with httpx.Client(timeout=BOARD_TIMEOUT_SECONDS, headers=headers, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                items = [item for item in data if isinstance(item, dict) and "id" in item]
                for item in items:
                    title = item.get("position", "")
                    desc = item.get("description", "")
                    clean_desc = re.sub(r'<[^>]+>', ' ', desc)
                    salary = item.get("salary", "")

                    # Solo título y etiquetas: en la descripción casi siempre aparecen palabras
                    # genéricas ("sales", "manager") que traían ofertas sin relación.
                    if keywords and not keyword_matches(
                        f"{title} {' '.join(str(t) for t in item.get('tags', []) or [])}", keywords
                    ):
                        continue

                    jobs.append(JobPosting(
                        title=title,
                        company=item.get("company", "Empresa"),
                        location=item.get("location", "Remote"),
                        is_remote=True,
                        salary_range=salary if salary else None,
                        description=clean_desc[:4000],
                        url=item.get("url"),
                        source="remoteok",
                        tags=item.get("tags", []),
                        posted_at=str(item.get("date", ""))
                    ))
                    if len(jobs) >= limit:
                        break
        return jobs

    def search_with_status(self, keywords: str = "", remote_only: bool = True, limit: int = 30) -> Tuple[List[JobPosting], List[str]]:
        """
        Executes Arbeitnow, Remotive, and RemoteOK scrapers in parallel with strict 5s timeout.
        Returns tuple of (jobs, failed_sources).
        """
        jobs: List[JobPosting] = []

        tasks = {
            "Arbeitnow": lambda: self._fetch_arbeitnow(keywords, remote_only, limit),
            "Remotive": lambda: self._fetch_remotive(keywords, remote_only, limit),
            "RemoteOK": lambda: self._fetch_remoteok(keywords, remote_only, limit),
        }

        results, failed_sources = run_with_deadline(tasks, deadline=BOARD_TIMEOUT_SECONDS + 1.0)
        for name in tasks:  # orden estable
            jobs.extend(results.get(name) or [])

        return jobs[:limit], failed_sources

    def search(self, keywords: str = "", remote_only: bool = True, limit: int = 30) -> List[JobPosting]:
        jobs, _ = self.search_with_status(keywords=keywords, remote_only=remote_only, limit=limit)
        return jobs

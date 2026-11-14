"""
Ejecución en paralelo con tiempo límite total.

`ThreadPoolExecutor` usado como context manager espera a que TODOS los hilos terminen
al salir, aunque se use `future.result(timeout=...)`; por eso una fuente lenta bloqueaba
la búsqueda completa. Aquí se espera como máximo `deadline` segundos y se devuelve lo que
haya llegado; las fuentes que no alcanzaron se informan como no disponibles.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from time import monotonic
from typing import Any, Callable, Dict, List, Tuple

logger = logging.getLogger(__name__)


def run_with_deadline(
    tasks: Dict[str, Callable[[], Any]],
    deadline: float,
    max_workers: int = 8,
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Ejecuta cada tarea en un hilo. Devuelve ({nombre: resultado}, [nombres sin resultado]).
    Una tarea "sin resultado" es la que lanzó una excepción o no terminó antes del límite.
    """
    if not tasks:
        return {}, []

    executor = ThreadPoolExecutor(max_workers=min(max_workers, len(tasks)))
    futures = {executor.submit(fn): name for name, fn in tasks.items()}
    results: Dict[str, Any] = {}
    failed: List[str] = []
    pending = set(futures)
    end = monotonic() + deadline

    try:
        while pending:
            remaining = end - monotonic()
            if remaining <= 0:
                break
            done, pending = wait(pending, timeout=remaining, return_when=FIRST_COMPLETED)
            for fut in done:
                name = futures[fut]
                try:
                    results[name] = fut.result()
                except Exception as e:  # noqa: BLE001 - una fuente caída no debe tumbar la búsqueda
                    logger.warning(f"Fuente '{name}' falló: {e}")
                    failed.append(name)
        for fut in pending:
            name = futures[fut]
            logger.warning(f"Fuente '{name}' no respondió en {deadline:.1f}s")
            failed.append(name)
    finally:
        # No esperar a los hilos lentos: terminan en segundo plano y su resultado se descarta.
        executor.shutdown(wait=False, cancel_futures=True)

    return results, failed

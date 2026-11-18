/**
 * Cuántas hojas A4 ocupa el CV al imprimirlo, y cuánto achicarlo para que quepa.
 *
 * Usa los mismos márgenes que printDocument.ts (@page A4, 14 mm arriba/abajo y 16 mm a los lados):
 * área útil 178 × 269 mm. Se mide una copia invisible del documento con ese ancho exacto, así el
 * resultado coincide con el PDF aunque la vista previa sea más angosta o más ancha.
 */

const MM = 96 / 25.4; // px CSS por milímetro
export const PRINT_WIDTH_PX = Math.round(178 * MM); // 673
export const PAGE_HEIGHT_PX = 269 * MM; // ≈ 1016,7
/** Escala mínima al "Ajustar a la hoja": la letra del cuerpo no baja de ~11,5 px (≈ 8,6 pt). */
export const MIN_FIT_SCALE = 0.82;
const STEP = 0.02;

/** Alto (px) que ocupa el documento impreso con la escala dada. */
export function measurePrintHeight(element: HTMLElement, scale = 1): number {
  const clone = element.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PRINT_WIDTH_PX}px`,
    maxWidth: 'none',
    padding: '0',
    margin: '0',
    border: '0',
    boxShadow: 'none',
    visibility: 'hidden',
    pointerEvents: 'none'
  });
  const inner = clone.querySelector<HTMLElement>('[data-cv-scale]');
  if (inner) inner.style.zoom = String(scale);
  document.body.appendChild(clone);
  // Con zoom, la altura del contenido se reporta en px sin escalar en algunos navegadores: se usa el rectángulo.
  const height = inner ? inner.getBoundingClientRect().height : clone.scrollHeight;
  clone.remove();
  return height;
}

export function pagesFor(height: number): number {
  return height / PAGE_HEIGHT_PX;
}

/** Texto amable: "Cabe en 1 hoja", "2 hojas al imprimir". */
export function describePages(pages: number): string {
  const sheets = Math.max(1, Math.ceil(pages - 0.01));
  return sheets === 1 ? 'Cabe en 1 hoja' : `${sheets} hojas al imprimir`;
}

/**
 * Escala más grande (entre MIN_FIT_SCALE y 1) con la que el documento cabe en `targetPages` hojas.
 * Devuelve null si ni con la escala mínima cabe.
 */
export function findFitScale(measure: (scale: number) => number, targetPages: number): number | null {
  const limit = targetPages * PAGE_HEIGHT_PX;
  for (let scale = 1; scale >= MIN_FIT_SCALE - 1e-9; scale = Math.round((scale - STEP) * 100) / 100) {
    if (measure(scale) <= limit) return scale;
  }
  return null;
}

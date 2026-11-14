/**
 * Imprime (o guarda como PDF) un único elemento del DOM en un iframe aislado.
 *
 * Antes se usaba `window.print()` sobre toda la app y CSS de impresión que ocultaba
 * el resto. Eso fallaba: si el documento no tenía la clase esperada salía una hoja en
 * blanco, y dentro de modales con scroll el contenido se recortaba a una sola página.
 * Copiar el documento a un iframe propio evita ambos problemas y siempre imprime en
 * tema claro, sin importar si la app está en modo oscuro.
 */

const PRINT_OVERRIDES = `
  @page { size: A4; margin: 14mm 16mm; }
  html, body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
  body * { visibility: visible !important; }
  .no-print { display: none !important; }
  .printable-cv {
    position: static !important;
    max-width: none !important;
    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    background: #ffffff !important;
    color: #111827 !important;
    overflow: visible !important;
  }
  .printable-cv li, .cv-entry { break-inside: avoid; page-break-inside: avoid; }
  .printable-cv h1, .printable-cv h2, .printable-cv h3 { break-after: avoid; page-break-after: avoid; }
`;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Nombre de archivo sugerido al guardar como PDF (el navegador usa el <title>). */
export const buildDocumentTitle = (...parts: Array<string | undefined | null>) =>
  parts
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' - ')
    .replace(/[\\/:*?"<>|]+/g, '')
    .slice(0, 120) || 'Documento Oportia';

const waitForStyles = (doc: Document, timeoutMs = 2000) => {
  const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  const pending = links.map(
    (link) =>
      new Promise<void>((resolve) => {
        if (link.sheet) return resolve();
        link.addEventListener('load', () => resolve(), { once: true });
        link.addEventListener('error', () => resolve(), { once: true });
      })
  );
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => undefined) ?? Promise.resolve();
  return Promise.race([
    Promise.all([...pending, fonts]).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  ]);
};

export async function printElement(element: HTMLElement | null, title: string): Promise<void> {
  if (!element) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Vista de impresión');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden'
  });
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    window.print();
    return;
  }

  // Reutiliza las hojas de estilo de la app (Tailwind) para que el PDF se vea igual que la vista previa.
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');

  doc.open();
  doc.write(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><base href="${escapeHtml(document.baseURI)}">` +
      `<title>${escapeHtml(title)}</title>${styles}<style>${PRINT_OVERRIDES}</style></head>` +
      `<body>${element.outerHTML}</body></html>`
  );
  doc.close();

  await waitForStyles(doc);

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });

  // El título del documento padre también se ajusta: algunos navegadores (Safari) lo usan como nombre del PDF.
  const previousTitle = document.title;
  document.title = title;
  try {
    win.focus();
    win.print();
  } finally {
    document.title = previousTitle;
    // Respaldo por si el navegador no emite afterprint.
    setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
  }
}

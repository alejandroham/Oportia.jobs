/**
 * Aviso de uso de la IA gratuita y exclusión de responsabilidad (BORRADOR sujeto a revisión jurídica).
 * Cambiar el texto obliga a subir AI_NOTICE_VERSION: así se vuelve a pedir el consentimiento.
 */

export const AI_NOTICE_VERSION = '2026-11-18';
export const AI_NOTICE_TITLE = 'Aviso de uso de la IA gratuita de Oportia y exclusión de responsabilidad';

/** Las dos declaraciones que la persona marca (doble confirmación). */
export const AI_CONSENT_STATEMENTS = [
  'Entiendo que lo que envíe a la IA gratuita lo procesa Google en el plan gratuito de la API de Gemini: Google puede usarlo para mejorar sus productos y personas revisoras de Google pueden leerlo.',
  'Tengo 18 años o más, no incluiré datos sensibles, revisaré lo que genere la IA antes de usarlo y entiendo que Oportia no garantiza entrevistas ni contrataciones.'
] as const;

export interface NoticeSection {
  title: string;
  paragraphs: string[];
}

export const AI_NOTICE_SECTIONS: NoticeSection[] = [
  {
    title: '1. Qué es la IA gratuita',
    paragraphs: [
      'Es un servicio sin costo de Oportia para evaluar tu compatibilidad con ofertas, adaptar tu CV y tu carta, preparar entrevistas y conversar con Opi, con un cupo diario de consultas.',
      'Funciona con la API de Google Gemini en su plan gratuito, usando una clave del servidor de Oportia. Puedes usar Oportia sin IA, o con tu propia clave de un proveedor (Google, OpenAI o Anthropic).'
    ]
  },
  {
    title: '2. Qué se envía a la IA y qué no',
    paragraphs: [
      'Se envía solo lo necesario para cada función: tu experiencia laboral, tus estudios, cursos y habilidades, tus logros, lo que buscas, el texto de las ofertas y lo que escribas en el chat o en la práctica de entrevista.',
      'Antes de enviar, Oportia reemplaza por marcadores tu nombre, tu correo, tu teléfono, tus enlaces y cualquier RUT, y los vuelve a poner en el resultado. Oportia no puede detectar todo: si escribes tu dirección, datos de salud o datos de otras personas dentro del CV o del chat, esos textos sí se enviarían.'
    ]
  },
  {
    title: '3. Qué hace Google con esos datos',
    paragraphs: [
      'Según los términos de la API de Gemini, en el plan gratuito Google usa el contenido enviado y las respuestas para proveer, mejorar y desarrollar sus productos, y personas revisoras pueden leerlo (desvinculado de la cuenta y de la clave). Google pide no enviar información sensible, confidencial o personal a ese plan.',
      'El tratamiento que hace Google se rige por sus propios términos y políticas, que Oportia no controla. Los datos pueden procesarse fuera de Chile.'
    ]
  },
  {
    title: '4. Qué hace Oportia',
    paragraphs: [
      'Oportia no guarda tu CV, tu perfil ni tus conversaciones en su servidor: viven en tu navegador. El servidor procesa cada consulta y no la conserva.',
      'Para contar tu cupo diario se usa un identificador aleatorio de este navegador, que no contiene datos personales.',
      'Oportia registra de forma anónima que se aceptó o retiró este aviso (versión, fecha y un código de comprobante), sin tu nombre, correo, CV ni dirección IP. Así Oportia sabe cuántas personas aceptaron cada versión.'
    ]
  },
  {
    title: '5. Tus compromisos',
    paragraphs: [
      'Declaras tener 18 años o más (requisito de Google para su API).',
      'No incluirás datos sensibles (RUT, dirección, salud, situación familiar, datos de otras personas) en tu CV, en el chat ni en las respuestas de práctica.',
      'Revisarás los documentos y recomendaciones antes de usarlos y te asegurarás de que reflejen tu experiencia real. La decisión sobre su contenido y su uso es tuya.'
    ]
  },
  {
    title: '6. Exclusión y límites de responsabilidad',
    paragraphs: [
      'Oportia es una herramienta de apoyo a la búsqueda de empleo. No garantiza entrevistas, contrataciones ni ningún resultado laboral.',
      'Los resultados de la IA se generan automáticamente y pueden contener errores, omisiones o imprecisiones. Oportia instruye a la IA a no inventar antecedentes personales, académicos ni laborales, pero no puede asegurar que nunca ocurra: por eso debes revisarlos.',
      'Los resultados no reemplazan la asesoría de profesionales (orientación laboral, legal u otra) cuando la necesites.',
      'Oportia no responde por el uso que Google haga de los datos según sus propios términos, ni por la disponibilidad del servicio de IA, que puede interrumpirse o tener límites.',
      'Nada de lo anterior limita los derechos que te reconoce la ley chilena (Ley 19.628 y Ley 21.719 sobre protección de datos personales) ni las obligaciones que la ley impone a Oportia.'
    ]
  },
  {
    title: '7. Cómo retirar tu consentimiento',
    paragraphs: [
      'Puedes dejar de usar la IA gratuita cuando quieras con «Dejar de usar IA gratuita» en Ajustes. Desde ese momento tu navegador no envía nada más a la IA gratuita. Lo ya enviado a Google queda sujeto a sus términos.',
      'Si no quieres que Google use tus datos para mejorar sus productos, puedes conectar tu propia clave de un plan de pago.'
    ]
  },
  {
    title: '8. Tus derechos',
    paragraphs: [
      'Puedes pedir información, acceso, rectificación, eliminación u oposición respecto de tus datos por los canales indicados en la Política de privacidad de Oportia. Como Oportia no guarda tu CV, la mayor parte de tus datos la controlas tú en tu navegador: puedes corregirlos en Mi perfil o borrarlos en Ajustes → Privacidad.'
    ]
  }
];

export const DRAFT_NOTE = 'Borrador sujeto a revisión jurídica.';

export interface ConsentRecord {
  type: 'ia_gratuita';
  version: string;
  accepted_at: string; // ISO
  code: string; // código aleatorio del comprobante
  statements: string[];
}

const escapeHtml = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Documento del aviso (y, si hay registro, comprobante de aceptación) como HTML autónomo para guardar o imprimir. */
export function buildNoticeHtml(record?: ConsentRecord | null): string {
  const when = record ? new Date(record.accepted_at).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }) : '';
  const receipt = record
    ? `<section class="receipt"><h2>Comprobante de aceptación</h2>
<p><strong>Código:</strong> ${escapeHtml(record.code)}<br><strong>Fecha y hora:</strong> ${escapeHtml(when)}<br>
<strong>Versión del aviso:</strong> ${escapeHtml(record.version)}</p>
<p>Declaraciones aceptadas:</p><ol>${record.statements.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
<p class="muted">Este comprobante no contiene tu nombre ni tus datos. Guárdalo: con el código puedes acreditar qué versión aceptaste.</p></section>`
    : '';
  const body = AI_NOTICE_SECTIONS.map(
    (s) => `<h2>${escapeHtml(s.title)}</h2>${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}`
  ).join('\n');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(AI_NOTICE_TITLE)}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:720px;margin:32px auto;padding:0 20px;color:#111827;line-height:1.55}
h1{font-size:20px}h2{font-size:15px;margin-top:22px}p,li{font-size:13.5px;text-align:justify}.muted{color:#6b7280;font-size:12px}
.receipt{border:1px solid #20A88A;border-radius:12px;padding:12px 16px;background:#f0fbf8}</style></head><body>
<h1>${escapeHtml(AI_NOTICE_TITLE)}</h1><p class="muted">Versión ${AI_NOTICE_VERSION} · ${DRAFT_NOTE} · https://oportia-jobs.vercel.app</p>
${receipt}
${body}
<p class="muted">Términos de la API de Gemini: https://aistudio.google.com/docs/terms</p></body></html>`;
}

export function downloadNotice(record?: ConsentRecord | null): void {
  const blob = new Blob([buildNoticeHtml(record)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = record ? `Oportia-comprobante-IA-gratuita-${record.code}.html` : `Oportia-aviso-IA-gratuita-${AI_NOTICE_VERSION}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

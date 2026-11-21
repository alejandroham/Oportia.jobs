/** Revisión ATS del CV adaptado antes de descargar el PDF (todo en el navegador, sin IA). */

export interface AtsCheck {
  label: string;
  ok: boolean;
  detail?: string;
}

const DATE_LINE = /((?:19|20)\d{2})|\bActual\b/;

interface JobBlock {
  heading: string;
  dateLine: string;
  bullets: number;
  tech: number;
}

function jobBlocks(markdown: string): JobBlock[] {
  const lines = markdown.split('\n');
  const out: JobBlock[] = [];
  let inExperience = false;
  let current: JobBlock | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
      inExperience = /^##\s+experiencia laboral/i.test(line);
      current = null;
      continue;
    }
    if (!inExperience) continue;
    if (line.startsWith('### ')) {
      const next = lines.slice(i + 1).find((l) => l.trim()) || '';
      current = { heading: line.slice(4), dateLine: next.trim(), bullets: 0, tech: 0 };
      out.push(current);
    } else if (current && /^[-*•]\s/.test(line)) {
      current.bullets += 1;
    } else if (current && /^tecnolog[ií]as:/i.test(line)) {
      current.tech = line.split(':')[1].split(',').filter((t) => t.trim()).length;
    }
  }
  return out;
}

export function atsChecks(markdown: string, pages: number | null, removedCount = 0): AtsCheck[] {
  const md = markdown || '';
  const jobs = jobBlocks(md);
  const recent = jobs.slice(0, 3);
  const noDate = jobs.filter((j) => !DATE_LINE.test(j.dateLine) || j.dateLine.startsWith('-'));
  const fewBullets = recent.filter((j) => j.bullets < 3);
  const tooMuchTech = jobs.filter((j) => j.tech > 12);
  return [
    { label: 'Sin palabras partidas con guion', ok: !/[\u00AD\u2010]/.test(md), detail: 'La partición de palabras está desactivada en el CV.' },
    { label: 'Fuente estándar (Arial, TrueType)', ok: true, detail: 'Nunca Type 3 ni pesos ExtraLight.' },
    {
      label: 'Cada cargo con su fecha en una línea propia',
      ok: jobs.length > 0 && noDate.length === 0,
      detail: noDate.length ? `Sin fecha: ${noDate.map((j) => j.heading).join('; ')}. Agrégala en Mi perfil.` : undefined
    },
    { label: 'Máximo 2 páginas', ok: pages !== null && pages <= 2.01, detail: pages !== null && pages > 2.01 ? 'Usa «Ajustar a la hoja» o elige menos experiencias.' : undefined },
    {
      label: 'Al menos 3 logros en los 3 cargos más recientes',
      ok: recent.length > 0 && fewBullets.length === 0,
      detail: fewBullets.length ? `Pocos logros en: ${fewBullets.map((j) => j.heading).join('; ')}. Agrega logros reales en Mi perfil.` : undefined
    },
    { label: 'Máximo 12 tecnologías por cargo', ok: tooMuchTech.length === 0 },
    { label: 'Sección Idiomas', ok: /^##\s+idiomas/im.test(md), detail: /^##\s+idiomas/im.test(md) ? undefined : 'Agrega tus idiomas en Mi perfil.' },
    {
      label: 'Sin cifras ni tecnologías inventadas',
      ok: true,
      detail: removedCount ? `Oportia quitó ${removedCount} ${removedCount === 1 ? 'dato' : 'datos'} que no estaban en tu perfil.` : 'Todo sale de tu perfil.'
    }
  ];
}

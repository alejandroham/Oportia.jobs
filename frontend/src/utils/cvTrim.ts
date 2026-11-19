/**
 * Recorte del CV adaptado para que quepa en las hojas elegidas (1 o 2), de lo menos a lo más importante.
 * Los niveles son acumulativos. Nunca se agrega nada: solo se acorta lo que ya está en el CV.
 */

export const MAX_TRIM_LEVEL = 6;

export const TRIM_NOTES: Record<number, string> = {
  1: 'Experiencia anterior: solo los 4 cargos más recientes',
  2: 'Máximo 3 logros por cargo',
  3: 'Máximo 6 tecnologías por cargo',
  4: 'Sin la sección Experiencia anterior',
  5: 'Sin la descripción de los cargos más antiguos (se mantienen sus logros)',
  6: 'Máximo 10 competencias'
};

const isSection = (l: string, re: RegExp) => /^##\s/.test(l) && re.test(l);

export function trimMarkdown(markdown: string, level: number): string {
  if (!markdown || level <= 0) return markdown;
  const lines = markdown.split('\n');
  const out: string[] = [];
  let section = '';
  let prevCount = 0;
  let bulletsInJob = 0;
  let jobIndex = -1;
  let afterDateLine = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (/^##\s/.test(t)) {
      section = t.toLowerCase();
      if (level >= 4 && isSection(t, /experiencia anterior/i)) {
        // Se salta la sección completa.
        while (i + 1 < lines.length && !/^##\s/.test(lines[i + 1].trim())) i++;
        continue;
      }
      out.push(line);
      continue;
    }
    if (section.includes('experiencia anterior') && /^[-*•]\s/.test(t)) {
      prevCount++;
      if (level >= 1 && prevCount > 4) continue;
    }
    // "Experiencia laboral" (o "Experiencia"/"Experiencia profesional" en CV adaptados antes de la 1.6.0).
    if (section.includes('experiencia') && !section.includes('anterior')) {
      if (t.startsWith('### ')) {
        jobIndex++;
        bulletsInJob = 0;
        afterDateLine = false;
      } else if (/^[-*•]\s/.test(t)) {
        bulletsInJob++;
        if (level >= 2 && bulletsInJob > 3) continue;
      } else if (/^tecnolog[ií]as:/i.test(t) && level >= 3) {
        const [label, rest] = [t.slice(0, t.indexOf(':') + 1), t.slice(t.indexOf(':') + 1)];
        out.push(`${label} ${rest.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 6).join(', ')}`);
        continue;
      } else if (t && jobIndex >= 0) {
        // Primera línea con texto tras el cargo = fecha | ciudad; la siguiente = descripción.
        if (!afterDateLine) {
          afterDateLine = true;
        } else if (level >= 5 && jobIndex >= 2 && !/^tecnolog/i.test(t)) {
          continue;
        }
      }
    }
    if (section.includes('competencias') && level >= 6 && t && !t.startsWith('#')) {
      const items = t.split(/\s·\s/);
      if (items.length > 10) {
        out.push(items.slice(0, 10).join(' · '));
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

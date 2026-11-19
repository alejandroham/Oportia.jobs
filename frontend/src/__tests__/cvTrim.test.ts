import { describe, expect, it } from 'vitest';
import { trimMarkdown } from '../utils/cvTrim';

const md = `# Ana
## Competencias
${Array.from({ length: 14 }, (_, i) => `C${i}`).join(' · ')}
## Experiencia laboral
### Dev — A
Enero 2024 – Actual | Concepción

Descripción A.
- a1
- a2
- a3
- a4
- a5

Tecnologías: t1, t2, t3, t4, t5, t6, t7, t8
### Dev — B
Enero 2022 – Diciembre 2023

Descripción B.
- b1
### Dev — C
Enero 2020 – Diciembre 2021

Descripción C.
- c1
## Experiencia anterior
- p1
- p2
- p3
- p4
- p5
- p6
## Educación
- Título`;

describe('recorte para caber en las hojas elegidas', () => {
  it('nivel 0 no cambia nada', () => expect(trimMarkdown(md, 0)).toBe(md));

  it('recorta por niveles, sin tocar lo importante', () => {
    expect(trimMarkdown(md, 1)).not.toContain('- p5');
    expect(trimMarkdown(md, 1)).toContain('- p4');
    expect(trimMarkdown(md, 2)).not.toContain('- a4');
    expect(trimMarkdown(md, 3)).toContain('Tecnologías: t1, t2, t3, t4, t5, t6\n');
    expect(trimMarkdown(md, 4)).not.toContain('Experiencia anterior');
    const l5 = trimMarkdown(md, 5);
    expect(l5).toContain('Descripción A.');
    expect(l5).toContain('Descripción B.');
    expect(l5).not.toContain('Descripción C.');
    expect(l5).toContain('- c1');
    expect(trimMarkdown(md, 6)).toContain('C9\n');
    expect(trimMarkdown(md, 6)).not.toContain('C10');
    // Siempre se mantienen cargo, fecha y educación.
    for (const keep of ['### Dev — C', 'Enero 2020 – Diciembre 2021', '## Educación']) expect(trimMarkdown(md, 6)).toContain(keep);
  });
});

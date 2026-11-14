import { describe, it, expect } from 'vitest';
import { parseMarkdownBlocks } from '../features/shared/MarkdownDocument';

describe('MarkdownDocument parser', () => {
  it('parses standard markdown blocks correctly', () => {
    const md = `# Titular
Este es un párrafo normal.

- Elemento 1
- Elemento 2`;

    const blocks = parseMarkdownBlocks(md);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: 'h1', text: 'Titular' });
    expect(blocks[1]).toEqual({ type: 'p', text: 'Este es un párrafo normal.' });
    expect(blocks[2]).toEqual({ type: 'ul', items: ['Elemento 1', 'Elemento 2'] });
  });

  it('normalizes literal escaped \\n sequences into real newlines and blocks', () => {
    const literalEscapedMd = '# Paula Rojas\\n## Perfil Profesional\\nProfesional de salud.\\n- Cuidados intensivos\\n- Administración de medicamentos';

    const blocks = parseMarkdownBlocks(literalEscapedMd);
    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toEqual({ type: 'h1', text: 'Paula Rojas' });
    expect(blocks[1]).toEqual({ type: 'h2', text: 'Perfil Profesional' });
    expect(blocks[2]).toEqual({ type: 'p', text: 'Profesional de salud.' });
    expect(blocks[3]).toEqual({
      type: 'ul',
      items: ['Cuidados intensivos', 'Administración de medicamentos']
    });
  });

  it('handles empty input safely', () => {
    expect(parseMarkdownBlocks('')).toEqual([]);
  });
});

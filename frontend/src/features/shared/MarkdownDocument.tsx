import React from 'react';

/**
 * Renderiza el Markdown simple que genera la IA (CV adaptado / carta) como documento
 * formateado, sin dangerouslySetInnerHTML. Soporta: # ## ### títulos, viñetas (- * •),
 * **negrita**, *cursiva*, separadores --- (se omiten) y párrafos.
 */

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g);
  return parts
    .filter((p) => p !== '')
    .map((part, i) => {
      const key = `${keyPrefix}-${i}`;
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return (
          <strong key={key} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (/^(\*[^*]+\*|_[^_]+_)$/.test(part)) {
        return (
          <em key={key} className="italic text-gray-600">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
};

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul'; items: string[] };

export const parseMarkdownBlocks = (markdown: string): Block[] => {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'ul', items: list });
    list = [];
  };

  // Normalizar secuencias literales de escape '\n' a saltos de línea reales
  let normalized = (markdown || '').replace(/\r\n/g, '\n');
  if (normalized.includes('\\n')) {
    normalized = normalized.replace(/\\n/g, '\n');
  }

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim();
    if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 3);
      blocks.push({ type: (`h${level}` as 'h1' | 'h2' | 'h3'), text: heading[2] });
      continue;
    }
    const bullet = /^([-*•●+]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      list.push(bullet[2]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
};

export const MarkdownDocument: React.FC<{ markdown: string; className?: string; justify?: boolean }> = ({
  markdown,
  className = '',
  justify = false
}) => {
  const blocks = parseMarkdownBlocks(markdown);
  // Las líneas entre el nombre (#) y la primera sección (##) son la cabecera: no se justifican.
  const firstSection = blocks.findIndex((b) => b.type === 'h2');
  const isHeader = (i: number) => blocks[0]?.type === 'h1' && (firstSection === -1 ? i <= 2 : i < firstSection);
  const just = justify ? ' formal-justify' : '';
  return (
    <div className={`space-y-2.5 text-gray-800 ${className}`}>
      {blocks.map((block, i) => {
        const key = `b-${i}`;
        switch (block.type) {
          case 'h1':
            return (
              <h1 key={key} className="cv-h1 text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 pb-1">
                {renderInline(block.text, key)}
              </h1>
            );
          case 'h2':
            return (
              <h2
                key={key}
                className="cv-h2 text-xs font-bold uppercase tracking-wider text-[#173B50] border-b border-gray-200 pb-1 pt-3"
              >
                {renderInline(block.text, key)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={key} className="cv-h3 text-sm font-bold text-gray-900 pt-1">
                {renderInline(block.text, key)}
              </h3>
            );
          case 'ul':
            return (
              <ul key={key} className={`list-disc pl-5 text-xs sm:text-sm text-gray-700 space-y-1${isHeader(i) ? ' cv-header-line' : just}`}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          default:
            return (
              <p
                key={key}
                className={`text-xs sm:text-sm text-gray-700 leading-relaxed${isHeader(i) ? ' cv-header-line' : just}`}
              >
                {renderInline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
};

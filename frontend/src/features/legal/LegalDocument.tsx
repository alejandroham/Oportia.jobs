import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 1.6.3 (DT-08): muestra PRIVACY.md y TERMINOS.md dentro de la app, sin dangerouslySetInnerHTML.
 * Soporta lo que usan esos documentos: títulos (#, ##, ###) con ancla, párrafos, listas (- y 1.),
 * citas (>), tablas (|), separadores (---) y, en línea, **negrita**, *cursiva*, `código` y [enlaces](url).
 * Los enlaces solo pueden ser https://, mailto: o anclas (#…): cualquier otro esquema se muestra como texto.
 */

export type LegalBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string; id: string }
  | { type: 'p' | 'quote'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'hr' };

/** Ancla al estilo de GitHub: "9. Opiniones y contacto voluntario" → "9-opiniones-y-contacto-voluntario". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function parseLegalMarkdown(markdown: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flush(); continue; }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      const text = h[2].trim();
      blocks.push({ type: `h${h[1].length}` as 'h1' | 'h2' | 'h3', text, id: slugify(text) });
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) { flush(); blocks.push({ type: 'hr' }); continue; }
    if (line.startsWith('>')) {
      flush();
      blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') });
      continue;
    }
    if (line.startsWith('|') && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      flush();
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      i--;
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flush();
      const type = ul ? 'ul' : 'ol';
      const last = blocks[blocks.length - 1];
      const item = (ul || ol)![1];
      if (last && last.type === type) last.items.push(item);
      else blocks.push({ type, items: [item] });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/** Los documentos se enlazan entre sí por archivo (así funcionan en GitHub); en la app van a su ruta. */
const DOC_ROUTES: Record<string, string> = { 'PRIVACY.md': '/privacidad', 'TERMINOS.md': '/terminos' };

export function safeHref(url: string): string | null {
  let u = url.trim();
  const doc = u.match(/^(?:\.\/)?([A-Z]+\.md)(#.*)?$/);
  if (doc && DOC_ROUTES[doc[1]]) u = DOC_ROUTES[doc[1]] + (doc[2] || '');
  if (/^https:\/\//i.test(u) || /^mailto:/i.test(u) || u.startsWith('#') || u.startsWith('/')) return u;
  return null;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;

export function renderLegalInline(text: string, keyPrefix = 'i'): React.ReactNode[] {
  return text
    .split(INLINE)
    .filter((p) => p !== '')
    .map((part, i) => {
      const key = `${keyPrefix}-${i}`;
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key} className="font-semibold text-gray-900 dark:text-white">{renderLegalInline(part.slice(2, -2), key)}</strong>;
      if (/^`[^`]+`$/.test(part)) return <code key={key} className="px-1 py-0.5 rounded bg-gray-100 dark:bg-ink-raised text-[0.85em]">{part.slice(1, -1)}</code>;
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) {
        const href = safeHref(link[2]);
        if (!href) return <React.Fragment key={key}>{link[1]}</React.Fragment>;
        if (href.startsWith('/')) {
          return (
            <Link key={key} to={href} className="underline text-brand-700 dark:text-brand-300 hover:text-brand-800">
              {link[1]}
            </Link>
          );
        }
        const external = /^https:/i.test(href);
        return (
          <a key={key} href={href} className="underline text-brand-700 dark:text-brand-300 hover:text-brand-800" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {link[1]}
          </a>
        );
      }
      if (/^\*[^*]+\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
}

export const LegalDocument: React.FC<{ markdown: string }> = ({ markdown }) => {
  const blocks = parseLegalMarkdown(markdown);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-700 dark:text-ink-200">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.type) {
          case 'h1':
            return <h1 key={k} id={b.id} className="text-xl font-bold text-gray-900 dark:text-white scroll-mt-24">{renderLegalInline(b.text, k)}</h1>;
          case 'h2':
            return <h2 key={k} id={b.id} className="pt-4 text-base font-bold text-gray-900 dark:text-white scroll-mt-24">{renderLegalInline(b.text, k)}</h2>;
          case 'h3':
            return <h3 key={k} id={b.id} className="pt-2 text-sm font-bold text-gray-900 dark:text-white scroll-mt-24">{renderLegalInline(b.text, k)}</h3>;
          case 'quote':
            return <blockquote key={k} className="border-l-4 border-brand-500/40 pl-3 italic">{renderLegalInline(b.text, k)}</blockquote>;
          case 'ul':
          case 'ol': {
            const List = b.type;
            return (
              <List key={k} className={`${b.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1.5`}>
                {b.items.map((it, j) => <li key={j}>{renderLegalInline(it, `${k}-${j}`)}</li>)}
              </List>
            );
          }
          case 'table':
            return (
              <div key={k} className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>{b.header.map((c, j) => <th key={j} scope="col" className="text-left p-2 border-b border-gray-200 dark:border-ink-border">{renderLegalInline(c, `${k}-h${j}`)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>{r.map((c, j) => <td key={j} className="align-top p-2 border-b border-gray-100 dark:border-ink-border/60">{renderLegalInline(c, `${k}-${ri}-${j}`)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'hr':
            return <hr key={k} className="border-gray-200 dark:border-ink-border" />;
          default:
            return <p key={k}>{renderLegalInline(b.text, k)}</p>;
        }
      })}
    </div>
  );
};

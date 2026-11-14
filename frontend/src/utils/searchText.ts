/**
 * Filtro de texto local de "Buscar empleo".
 *
 * Antes se exigía la frase exacta en título/empresa/descripción, así que la búsqueda
 * "enfermera" escondía "Técnico en Enfermería" o "Registered Nurse" aunque el servidor
 * las hubiera encontrado. Ahora:
 *  - se ignoran tildes y mayúsculas,
 *  - se compara por raíz de cada palabra ("enfermera" ~ "enfermería"),
 *  - basta que cada palabra significativa aparezca en algún campo.
 * Las ofertas recién traídas por una búsqueda no se vuelven a filtrar (ver JobSearchPage).
 */

const STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'o', 'para', 'con', 'a', 'al',
  'un', 'una', 'por', 'the', 'of', 'and', 'or', 'for', 'in', 'to', 'an'
]);

export const normalizeText = (text: string): string =>
  (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');

export const searchTokens = (text: string): string[] =>
  (normalizeText(text).match(/[a-z0-9]+/g) || []).filter((t) => t.length > 1 && !STOPWORDS.has(t));

export const stemWord = (word: string): string => {
  const w = normalizeText(word);
  if (w.length >= 7) return /(as|os|es)$/.test(w) ? w.slice(0, -2) : w.slice(0, -1);
  if (w.length >= 5 && /[aos]$/.test(w)) return w.slice(0, -1);
  return w;
};

/** True si cada palabra significativa de `query` aparece (por raíz) en `text`. */
export const matchesQuery = (text: string, query: string): boolean => {
  const queryTokens = searchTokens(query);
  if (queryTokens.length === 0) return true;
  const textTokens = searchTokens(text);
  return queryTokens.every((q) => {
    const root = stemWord(q);
    return textTokens.some((t) => t.startsWith(root));
  });
};

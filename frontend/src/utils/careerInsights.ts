import type { CareerInsights, LearnedStarStory, UserPreferences } from '../types';
import { normalizeText } from './searchText';

/**
 * Aplica las sugerencias de la IA a "Qué busco" y "Mis logros" (sin duplicar):
 * - guarda todos los cargos sugeridos (con su resumen) para mostrarlos en "Qué busco";
 * - agrega a tus cargos buscados hasta `addDirect` cargos de tu experiencia directa;
 * - agrega a "Mis logros" los logros STAR nuevos.
 */
export function applyCareerInsights(prefs: UserPreferences, insights: CareerInsights, addDirect = 3) {
  const has = new Set((prefs.target_roles || []).map(normalizeText));
  const roles = insights.roles || [];
  const toAdd = roles.filter((r) => r.category === 'directo' && !has.has(normalizeText(r.title))).slice(0, addDirect).map((r) => r.title);

  const existingStories = prefs.learned_star_stories || [];
  const seen = new Set(existingStories.map((s) => normalizeText(s.title)));
  const newStories: LearnedStarStory[] = (insights.achievements || []).filter((a) => {
    const k = normalizeText(a.title);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const merged = new Map<string, (typeof roles)[number]>();
  for (const r of [...(prefs.suggested_roles || []), ...roles]) merged.set(normalizeText(r.title), r);

  const next: UserPreferences = {
    ...prefs,
    target_roles: [...(prefs.target_roles || []), ...toAdd],
    suggested_roles: Array.from(merged.values()).slice(-16),
    learned_star_stories: [...newStories, ...existingStories],
    updated_at: new Date().toISOString()
  };
  return { next, addedRoles: toAdd, addedStories: newStories.length };
}

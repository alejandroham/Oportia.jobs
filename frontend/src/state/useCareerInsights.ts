import { useCallback, useState } from 'react';
import type { CandidateProfile } from '../types';
import { api, getHumanErrorMessage } from '../api';
import { useAppStore, DEFAULT_EMPTY_PREFERENCES } from './useAppStore';
import { applyCareerInsights } from '../utils/careerInsights';
import { useToast } from '../components/Toast';

/**
 * Cargos afines (con su resumen) y logros STAR desde el CV, con una consulta a la IA.
 * Agrega a "Qué busco" los cargos de tu experiencia directa y a "Mis logros" los logros nuevos.
 */
export function useCareerInsights() {
  const toast = useToast();
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(
    async (profileArg?: CandidateProfile, opts: { addDirect?: number; quiet?: boolean } = {}) => {
      const { profile: stored, preferences, setPreferences } = useAppStore.getState();
      const profile = profileArg || stored;
      if (!profile) return null;
      setIsRunning(true);
      try {
        const insights = await api.careerInsights(profile, preferences);
        const { next, addedRoles, addedStories } = applyCareerInsights(preferences || DEFAULT_EMPTY_PREFERENCES, insights, opts.addDirect ?? 3);
        await setPreferences(next);
        if (!opts.quiet || addedRoles.length || addedStories) {
          const parts = [
            addedRoles.length ? `${addedRoles.length} ${addedRoles.length === 1 ? 'cargo' : 'cargos'} a «Qué busco»` : '',
            addedStories ? `${addedStories} ${addedStories === 1 ? 'logro' : 'logros'} a «Mis logros»` : ''
          ].filter(Boolean);
          if (insights.method === 'ia') {
            toast.success(
              parts.length ? `Agregué ${parts.join(' y ')}. En «Qué busco» te dejé ${insights.roles.length} cargos afines sugeridos, con su resumen.` : `Te dejé ${insights.roles.length} cargos afines sugeridos en «Qué busco».`,
              'Opi analizó tu experiencia'
            );
          } else {
            toast.info(insights.note || 'Sugerencias básicas sin IA.', parts.length ? `Agregué ${parts.join(' y ')}` : 'Sugerencias sin IA');
          }
        }
        return insights;
      } catch (e) {
        if (!opts.quiet) toast.error('No se pudieron sugerir cargos y logros: ' + getHumanErrorMessage(e));
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [toast]
  );

  return { run, isRunning };
}

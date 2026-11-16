import { useCallback, useMemo } from 'react';
import type { JobPosting } from '../types';
import { api } from '../api';
import { useAppStore } from './useAppStore';
import { getAIStatus } from '../utils/aiStatus';
import { isFitStale, profileFingerprint, withFreshFit } from '../utils/fitFreshness';

/** Ofertas por consulta a la IA (igual que RANK_MAX_JOBS en el servidor). */
export const RANK_BATCH = 15;

/**
 * Porcentajes de compatibilidad con IA (una consulta cada 15 ofertas):
 * - `rank`: calcula y guarda el porcentaje con la huella del perfil actual.
 * - `staleJobs`: ofertas cuyo porcentaje se calculó con otro perfil (cambió tu experiencia,
 *   tus habilidades, lo que buscas o lo que Opi sabe de ti).
 */
export function useFitRanking() {
  const profile = useAppStore((s) => s.profile);
  const preferences = useAppStore((s) => s.preferences);
  const settings = useAppStore((s) => s.settings);
  const jobs = useAppStore((s) => s.jobs);

  const fingerprint = useMemo(() => profileFingerprint(profile, preferences), [profile, preferences]);
  const ai = getAIStatus(settings);
  const hasCv = Boolean(
    profile && profile.name?.trim().toLowerCase() !== 'candidato' && (profile.experiences?.length || profile.technical_skills?.length || profile.headline)
  );
  /** IA lista: clave propia, o IA gratuita aceptada y con cupo. */
  const aiReady = Boolean(settings.has_active_key) && ai.ready;
  /** La IA gratuita tiene cupo diario: el orden automático se modera. */
  const usesSharedQuota = ai.kind === 'shared_active';

  const staleJobs = useMemo(() => jobs.filter((j) => isFitStale(j, fingerprint)), [jobs, fingerprint]);

  /** Calcula el porcentaje de hasta `maxBatches` grupos de 15 ofertas. Devuelve cuántas se puntuaron. */
  const rank = useCallback(
    async (toRank: JobPosting[], maxBatches = 1): Promise<number> => {
      const { profile: p, preferences: prefs, setJobs } = useAppStore.getState();
      if (!p || !toRank.length) return 0;
      let done = 0;
      for (let i = 0; i < Math.min(maxBatches, Math.ceil(toRank.length / RANK_BATCH)); i++) {
        const batch = toRank.slice(i * RANK_BATCH, (i + 1) * RANK_BATCH);
        const { results } = await api.rankJobs(batch, p, prefs);
        const scores = new Map(results.map((r) => [r.job_id, r.fit_score]));
        const fp = profileFingerprint(p, prefs);
        const current = useAppStore.getState().jobs;
        await setJobs(current.map((j) => (scores.has(j.id) ? withFreshFit(j, scores.get(j.id) as number, fp) : j)));
        done += results.length;
      }
      return done;
    },
    []
  );

  return { fingerprint, staleJobs, rank, aiReady, hasCv, usesSharedQuota };
}

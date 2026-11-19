import { supabase, publicFile, APP_URL } from './supabase';

export interface DailyStat { day: string; kind: string; category: string; events: number; clients: number }
export interface Feedback {
  id: string; created_at: string; rating: number; liked: string | null; improve: string | null;
  contact_email: string | null; contact_phone: string | null; contact_consent: boolean; trigger: string | null; moment?: string | null; app_version: string | null;
}
export interface AppEvent { id: number; created_at: string; kind: string; category: string; detail: Record<string, unknown>; ip_hash: string | null; app_version: string | null }
export interface HistoryEntry { date: string; count: number; new_today: number; removed_expired: number; removed_unlisted: number; sources: Record<string, number>; areas: Record<string, number> }
export interface RemovedOffer { id: string; title: string; company?: string; source?: string; url?: string; region?: string; removed_at: string; reason: string; expires_at?: string }

export const KIND_LABELS: Record<string, string> = {
  visita: 'Visitas', busqueda: 'Búsquedas', cv_subido: 'CV subidos', cv_reanalizado: 'CV reanalizados', cargos_y_logros: 'Cargos y logros',
  compatibilidad_lote: 'Compatibilidad (lotes)', compatibilidad_detalle: 'Evaluaciones detalladas', brechas: 'Brechas', oferta_pegada: 'Ofertas pegadas',
  oferta_por_enlace: 'Ofertas por enlace', chat_opi: 'Chat con Opi', opinion: 'Opiniones', ia_ocupada: 'IA con alta demanda', cv_adaptado: 'CV adaptados', entrevista_preparada: 'Entrevistas preparadas', entrevista_evaluada: 'Respuestas de entrevista evaluadas', consentimiento_ia: 'Consentimientos de IA gratuita', comprobante_ia: 'Comprobantes descargados', pdf_cv: 'PDF de CV', pdf_carta: 'PDF de carta',
  limite_peticiones: 'Exceso de peticiones', error_servidor: 'Errores del servidor', ssrf_bloqueado: 'SSRF bloqueado',
  prompt_injection: 'Intento de manipular la IA', portal_restringido: 'Portal restringido', bot_opiniones: 'Bot en opiniones'
};

export async function dailyStats(days = 30): Promise<DailyStat[]> {
  const { data, error } = await supabase.rpc('admin_daily_stats', { days });
  if (error) throw error;
  return (data || []).map((r: DailyStat) => ({ ...r, events: Number(r.events), clients: Number(r.clients) }));
}

export async function feedbackList(): Promise<Feedback[]> {
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data || [];
}

export async function securityEvents(days = 30): Promise<AppEvent[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('app_events')
    .select('id, created_at, kind, category, detail, ip_hash, app_version')
    .in('category', ['seguridad', 'error'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data || [];
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  if (url.endsWith('.gz') && res.body && 'DecompressionStream' in window) {
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // Supabase puede servirlo ya descomprimido; solo se descomprime si empieza con la firma gzip.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text()) as T;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }
  return (await res.json()) as T;
}

export const indexHistory = () => getJson<HistoryEntry[]>(publicFile('index-history.json')).then((d) => d || []);
export const removedOffers = () => getJson<RemovedOffer[]>(publicFile('jobs-removed.json.gz')).then((d) => d || []);
export interface IndexJob {
  id: string; title: string; company?: string; location?: string; region?: string; commune?: string; modality?: string;
  is_remote?: boolean; salary_range?: string; contract_type?: string; url?: string; source?: string; posted_at?: string;
  deadline?: string; discovered_at?: string; expires_at?: string; expires_estimated?: boolean; profession_category?: string;
}
export interface IndexFile { generated_at: string; count: number; new_today: number; sources: Record<string, number>; areas: Record<string, number>; jobs: IndexJob[] }
export interface ServiceStatus { version: string; index: Omit<IndexFile, 'jobs'> & { available: boolean }; shared_ai: { available: boolean; daily_limit: number } }

/** Índice completo (ofertas vigentes), directo desde Supabase Storage (público y con CORS). */
export const currentIndex = () => getJson<IndexFile>(publicFile('jobs-index.json.gz'));
/** Resumen público de la app (versión, índice, IA gratuita): /api/status admite CORS. */
export const serviceStatus = () => getJson<ServiceStatus>(`${APP_URL}/api/status`).catch(() => null);
export const workflowRuns = async () => {
  const res = await fetch('https://api.github.com/repos/alejandroham/Oportia.jobs/actions/runs?per_page=10');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.workflow_runs || []).map((r: Record<string, string>) => ({ name: r.name, status: r.status, conclusion: r.conclusion, created_at: r.created_at, url: r.html_url, event: r.event }));
};

/** Agrupa el resumen diario: totales por tipo y serie por día. */
export function summarize(stats: DailyStat[], today = new Date()) {
  const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const todayKey = dayKey(today);
  const weekAgo = dayKey(new Date(today.getTime() - 6 * 86_400_000));
  const totals: Record<string, number> = {};
  const byDay: Record<string, Record<string, number>> = {};
  let activeToday = 0;
  const activeWeekByDay: Record<string, number> = {};
  for (const s of stats) {
    totals[s.kind] = (totals[s.kind] || 0) + s.events;
    (byDay[s.day] ||= {})[s.kind] = s.events;
    if (s.kind === 'visita') {
      if (s.day === todayKey) activeToday = s.clients;
      if (s.day >= weekAgo) activeWeekByDay[s.day] = s.clients;
    }
  }
  const days = Object.keys(byDay).sort();
  const avgActiveWeek = Object.values(activeWeekByDay).length
    ? Math.round(Object.values(activeWeekByDay).reduce((a, b) => a + b, 0) / Object.values(activeWeekByDay).length)
    : 0;
  return { totals, byDay, days, activeToday, avgActiveWeek };
}

export const MOMENT_LABELS: Record<string, string> = {
  busqueda: 'Al buscar ofertas', compatibilidad: 'Compatibilidad', cv_adaptado: 'CV adaptado',
  tarjeta: 'Tarjeta de la esquina', menu: 'Botón Opinión del menú', pie: 'Pie de página', portada: 'Portada',
};

export interface MomentSummary { moment: string; up: number; down: number; total: number }

/** 👍/👎 por momento (votos rápidos: 4-5 cuenta como 👍, 1-2 como 👎). */
export function summarizeMoments(rows: Feedback[]): MomentSummary[] {
  const by = new Map<string, MomentSummary>();
  for (const r of rows) {
    const m = r.moment || (r.trigger === 'auto' ? 'tarjeta' : 'sin_momento');
    const cur = by.get(m) || { moment: m, up: 0, down: 0, total: 0 };
    cur.total += 1;
    if (r.rating >= 4) cur.up += 1;
    else if (r.rating <= 2) cur.down += 1;
    by.set(m, cur);
  }
  return [...by.values()].sort((a, b) => b.total - a.total);
}

/** Personas que opinaron / personas activas (aprox.: cada opinión cuenta como una persona). */
export function responseRate(opinions: number, activeUsers: number): string {
  if (!activeUsers) return '—';
  return `${Math.min(100, Math.round((opinions / activeUsers) * 100))} %`;
}

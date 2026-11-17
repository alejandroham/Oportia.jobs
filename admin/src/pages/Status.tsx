import { useEffect, useState } from 'react';
import { appSettings, appVersion, indexStatus, workflowRuns } from '../data';
import { Kpi } from '../components/Bars';

type Run = { name: string; status: string; conclusion: string | null; created_at: string; url: string; event: string };

export function StatusPage() {
  const [version, setVersion] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [idx, setIdx] = useState<Awaited<ReturnType<typeof indexStatus>>>(null);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof appSettings>>>(null);
  useEffect(() => {
    appVersion().then(setVersion);
    workflowRuns().then(setRuns);
    indexStatus().then(setIdx);
    appSettings().then(setSettings);
  }, []);
  const ageH = idx?.generated_at ? Math.round((Date.now() - new Date(idx.generated_at).getTime()) / 3_600_000) : null;
  return (
    <section>
      <div className="kpis">
        <Kpi label="Versión en producción" value={version || '…'} />
        <Kpi label="Índice diario" value={idx?.available ? 'Disponible' : 'No disponible'} hint={ageH !== null ? `hace ${ageH} h${ageH > 30 ? ' — ¿falló la tarea diaria?' : ''}` : ''} />
        <Kpi label="IA gratuita" value={settings?.shared_ai?.available ? 'Activa' : 'Inactiva'} hint={settings?.shared_ai ? `${settings.shared_ai.daily_limit} consultas por persona al día` : ''} />
      </div>
      <h2>Últimas ejecuciones en GitHub Actions</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Flujo</th><th>Origen</th><th>Resultado</th></tr></thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.url}>
              <td className="small">{new Date(r.created_at).toLocaleString('es-CL')}</td>
              <td><a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a></td>
              <td className="small">{r.event === 'schedule' ? 'programada' : r.event === 'workflow_dispatch' ? 'manual' : r.event}</td>
              <td className={r.conclusion === 'success' ? 'ok' : r.conclusion ? 'error' : 'muted'}>{r.conclusion || r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">Registros detallados: Vercel → Logs y Supabase → Logs.</p>
    </section>
  );
}

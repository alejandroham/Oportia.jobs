import { useEffect, useState } from 'react';
import { dailyStats, summarize, KIND_LABELS, type DailyStat } from '../data';
import { Bars, Kpi } from '../components/Bars';

export function Overview() {
  const [stats, setStats] = useState<DailyStat[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    dailyStats(30).then(setStats).catch((e) => setError(String(e.message || e)));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Cargando…</p>;
  const s = summarize(stats);
  const series = (kind: string, field: 'events' | 'clients' = 'events') =>
    s.days.map((d) => ({ x: d, y: stats.filter((r) => r.day === d && r.kind === kind).reduce((a, r) => a + r[field], 0) }));
  const usage = Object.entries(s.totals).filter(([k]) => !['visita', 'limite_peticiones', 'error_servidor', 'ssrf_bloqueado', 'prompt_injection', 'portal_restringido', 'bot_opiniones'].includes(k));
  return (
    <section>
      <div className="kpis">
        <Kpi label="Usuarios activos hoy" value={s.activeToday} hint="navegadores distintos (huella diaria)" />
        <Kpi label="Promedio diario (7 días)" value={s.avgActiveWeek} />
        <Kpi label="Búsquedas (30 días)" value={s.totals.busqueda || 0} />
        <Kpi label="CV analizados (30 días)" value={(s.totals.cv_subido || 0) + (s.totals.cv_reanalizado || 0)} />
        <Kpi label="Opiniones (30 días)" value={s.totals.opinion || 0} />
      </div>
      <Bars label="Usuarios activos por día" data={series('visita', 'clients')} />
      <Bars label="Búsquedas por día" data={series('busqueda')} />
      <h2>Uso por función (30 días)</h2>
      <table>
        <thead><tr><th>Función</th><th className="num">Veces</th></tr></thead>
        <tbody>
          {usage.sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <tr key={k}><td>{KIND_LABELS[k] || k}</td><td className="num">{v}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">Privacidad: solo se cuentan acciones. No se guarda el CV, el perfil, lo que se escribe en la búsqueda, ni el identificador del navegador; la huella para contar usuarios cambia cada día.</p>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { dailyStats, feedbackList, MOMENT_LABELS, responseRate, summarizeMoments, type Feedback } from '../data';
import { Kpi } from '../components/Bars';

const TRIGGER_LABELS: Record<string, string> = {
  auto: 'invitación automática', manual: 'formulario', rapida: '👍/👎 de un toque', tarjeta: 'tarjeta de la esquina',
};

export function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[] | null>(null);
  const [active7, setActive7] = useState(0);
  const [error, setError] = useState('');
  const [onlyContact, setOnlyContact] = useState(false);
  const [onlyText, setOnlyText] = useState(false);
  useEffect(() => {
    feedbackList().then(setRows).catch((e) => setError(String(e.message || e)));
    // Usuarios activos de los últimos 7 días (suma de activos por día; las huellas cambian cada día).
    dailyStats(7)
      .then((st) => setActive7(st.filter((r) => r.kind === 'visita').reduce((a, r) => a + r.clients, 0)))
      .catch(() => undefined);
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Cargando…</p>;
  const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(1) : '—';
  const since = Date.now() - 7 * 86_400_000;
  const last7 = rows.filter((r) => new Date(r.created_at).getTime() >= since).length;
  const moments = summarizeMoments(rows);
  const hasContact = (r: Feedback) => r.contact_consent && (r.contact_email || r.contact_phone);
  const shown = rows.filter((r) => (!onlyContact || hasContact(r)) && (!onlyText || r.liked || r.improve));
  return (
    <section>
      <div className="kpis">
        <Kpi label="Opiniones" value={rows.length} />
        <Kpi label="Calificación promedio" value={avg} hint="de 1 a 5" />
        <Kpi label="Tasa de respuesta (7 días)" value={responseRate(last7, active7)} hint={`${last7} opiniones / ${active7} usuarios activos`} />
        <Kpi label="Con contacto autorizado" value={rows.filter(hasContact).length} />
      </div>

      {moments.length > 0 && (
        <table className="table small">
          <thead>
            <tr><th>Dónde opinaron</th><th>👍</th><th>👎</th><th>Total</th></tr>
          </thead>
          <tbody>
            {moments.map((m) => (
              <tr key={m.moment}>
                <td>{MOMENT_LABELS[m.moment] || 'Sin dato (antes de 1.4.2)'}</td>
                <td>{m.up}</td><td>{m.down}</td><td>{m.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <label className="inline"><input type="checkbox" checked={onlyText} onChange={(e) => setOnlyText(e.target.checked)} /> Solo con comentarios</label>{' '}
      <label className="inline"><input type="checkbox" checked={onlyContact} onChange={(e) => setOnlyContact(e.target.checked)} /> Solo con contacto autorizado</label>
      <ul className="list">
        {shown.map((r) => (
          <li key={r.id} className="card">
            <div className="row">
              <strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong>
              <span className="muted small">
                {new Date(r.created_at).toLocaleString('es-CL')} · {TRIGGER_LABELS[r.trigger || 'manual'] || r.trigger}
                {r.moment ? ` · ${MOMENT_LABELS[r.moment] || r.moment}` : ''} · v{r.app_version} · código {r.id.slice(0, 8)}
              </span>
            </div>
            {r.liked && <p><b>Le sirvió:</b> {r.liked}</p>}
            {r.improve && <p><b>Mejoraría:</b> {r.improve}</p>}
            {hasContact(r) && (
              <p className="contact">Contacto autorizado (solo mejoras y entrevistas): {[r.contact_email, r.contact_phone].filter(Boolean).join(' · ')}</p>
            )}
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="muted">Aún no hay opiniones.</p>}
      <p className="muted small">Para borrar una opinión (derecho de la persona), usa su código en el editor de Supabase. Se borran solas a los 12 meses.</p>
    </section>
  );
}

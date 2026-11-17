import { useEffect, useState } from 'react';
import { feedbackList, type Feedback } from '../data';
import { Kpi } from '../components/Bars';

export function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[] | null>(null);
  const [error, setError] = useState('');
  const [onlyContact, setOnlyContact] = useState(false);
  useEffect(() => {
    feedbackList().then(setRows).catch((e) => setError(String(e.message || e)));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Cargando…</p>;
  const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(1) : '—';
  const shown = onlyContact ? rows.filter((r) => r.contact_consent && (r.contact_email || r.contact_phone)) : rows;
  return (
    <section>
      <div className="kpis">
        <Kpi label="Opiniones" value={rows.length} />
        <Kpi label="Calificación promedio" value={avg} hint="de 1 a 5" />
        <Kpi label="Con contacto autorizado" value={rows.filter((r) => r.contact_consent && (r.contact_email || r.contact_phone)).length} />
      </div>
      <label className="inline"><input type="checkbox" checked={onlyContact} onChange={(e) => setOnlyContact(e.target.checked)} /> Solo con contacto autorizado</label>
      <ul className="list">
        {shown.map((r) => (
          <li key={r.id} className="card">
            <div className="row">
              <strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong>
              <span className="muted small">
                {new Date(r.created_at).toLocaleString('es-CL')} · {r.trigger === 'auto' ? 'invitación automática' : 'espontánea'} · v{r.app_version} · código {r.id.slice(0, 8)}
              </span>
            </div>
            {r.liked && <p><b>Le sirvió:</b> {r.liked}</p>}
            {r.improve && <p><b>Mejoraría:</b> {r.improve}</p>}
            {r.contact_consent && (r.contact_email || r.contact_phone) && (
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

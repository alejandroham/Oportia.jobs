import { useEffect, useState } from 'react';
import { securityEvents, KIND_LABELS, type AppEvent } from '../data';
import { Kpi } from '../components/Bars';

const HELP: Record<string, string> = {
  limite_peticiones: 'Alguien superó el límite de peticiones por minuto (posible bot o abuso).',
  ssrf_bloqueado: 'Se intentó que el servidor descargara una dirección interna con "Importar oferta por enlace".',
  prompt_injection: 'Un texto de oferta traía instrucciones ocultas para manipular la IA; se neutralizaron.',
  portal_restringido: 'Se intentó importar por enlace una oferta de un portal que no lo permite (Indeed, Computrabajo, Laborum).',
  bot_opiniones: 'Un bot llenó el campo trampa del formulario de opiniones; no se guardó nada.',
  error_servidor: 'Error inesperado del servidor (revisa los registros de Vercel).'
};

export function SecurityPage() {
  const [rows, setRows] = useState<AppEvent[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    securityEvents(30).then(setRows).catch((e) => setError(String(e.message || e)));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Cargando…</p>;
  const counts: Record<string, number> = {};
  rows.forEach((r) => (counts[r.kind] = (counts[r.kind] || 0) + 1));
  const sources: Record<string, number> = {};
  rows.forEach((r) => r.ip_hash && (sources[r.ip_hash] = (sources[r.ip_hash] || 0) + 1));
  const top = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <section>
      <div className="kpis">
        {Object.keys(HELP).map((k) => <Kpi key={k} label={KIND_LABELS[k] || k} value={counts[k] || 0} hint="30 días" />)}
      </div>
      {top.length > 0 && (
        <>
          <h2>Orígenes más activos (huella diaria de red, sin IP)</h2>
          <table><thead><tr><th>Huella</th><th className="num">Eventos</th></tr></thead>
            <tbody>{top.map(([h, n]) => <tr key={h}><td><code>{h}</code></td><td className="num">{n}</td></tr>)}</tbody></table>
        </>
      )}
      <h2>Últimos eventos</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Evento</th><th>Detalle</th></tr></thead>
        <tbody>
          {rows.slice(0, 200).map((r) => (
            <tr key={r.id} title={HELP[r.kind] || ''}>
              <td className="small">{new Date(r.created_at).toLocaleString('es-CL')}</td>
              <td>{KIND_LABELS[r.kind] || r.kind}</td>
              <td className="small"><code>{JSON.stringify(r.detail)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted">Sin eventos de seguridad en 30 días.</p>}
    </section>
  );
}

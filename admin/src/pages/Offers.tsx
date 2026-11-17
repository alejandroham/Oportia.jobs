import { useEffect, useState } from 'react';
import { indexHistory, indexStatus, removedOffers, type HistoryEntry, type RemovedOffer } from '../data';
import { Bars, Kpi } from '../components/Bars';

export function OffersPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [removed, setRemoved] = useState<RemovedOffer[]>([]);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof indexStatus>>>(null);
  const [filter, setFilter] = useState<'todas' | 'vencida' | 'ya no publicada'>('todas');
  useEffect(() => {
    indexHistory().then(setHistory);
    removedOffers().then(setRemoved);
    indexStatus().then(setStatus);
  }, []);
  const shown = filter === 'todas' ? removed : removed.filter((r) => r.reason === filter);
  return (
    <section>
      <div className="kpis">
        <Kpi label="Ofertas vigentes" value={status?.count ?? '—'} hint={status?.generated_at ? `índice del ${new Date(status.generated_at).toLocaleString('es-CL')}` : ''} />
        <Kpi label="Nuevas hoy" value={status?.new_today ?? '—'} />
        <Kpi label="Sacadas (30 días)" value={removed.length} hint={`${removed.filter((r) => r.reason === 'vencida').length} vencidas`} />
      </div>
      <Bars label="Ofertas vigentes por día" data={history.map((h) => ({ x: h.date, y: h.count }))} />
      <Bars label="Ofertas nuevas por día" data={history.map((h) => ({ x: h.date, y: h.new_today }))} />
      <div className="grid2">
        <div>
          <h2>Por fuente</h2>
          <table><tbody>{Object.entries(status?.sources || {}).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>)}</tbody></table>
        </div>
        <div>
          <h2>Por área</h2>
          <table><tbody>{Object.entries(status?.areas || {}).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>)}</tbody></table>
        </div>
      </div>
      <h2>Ofertas sacadas del índice (últimos 30 días)</h2>
      <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filtrar por motivo">
        <option value="todas">Todas</option>
        <option value="vencida">Vencidas</option>
        <option value="ya no publicada">Ya no publicadas</option>
      </select>
      <table>
        <thead><tr><th>Sacada</th><th>Oferta</th><th>Fuente</th><th>Motivo</th></tr></thead>
        <tbody>
          {shown.slice(0, 300).map((r) => (
            <tr key={r.id + r.removed_at}>
              <td className="small">{r.removed_at}</td>
              <td>{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}<span className="muted small"> · {r.company}</span></td>
              <td className="small">{r.source}</td>
              <td className="small">{r.reason}{r.expires_at ? ` (vencía ${r.expires_at})` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {removed.length === 0 && <p className="muted">El historial empieza a llenarse desde la próxima ejecución del índice.</p>}
    </section>
  );
}

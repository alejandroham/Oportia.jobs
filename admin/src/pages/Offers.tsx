import { useEffect, useMemo, useState } from 'react';
import { currentIndex, indexHistory, removedOffers, type HistoryEntry, type IndexFile, type IndexJob, type RemovedOffer } from '../data';
import { Bars, Kpi } from '../components/Bars';

const SOURCE_LABELS: Record<string, string> = {
  empleospublicos: 'Empleos Públicos', getonbrd: 'GetOnBoard', chiletrabajos: 'ChileTrabajos', computrabajo: 'Computrabajo',
  greenhouse: 'Portal empresa (Greenhouse)', lever: 'Portal empresa (Lever)', ashby: 'Portal empresa (Ashby)', smartrecruiters: 'Portal empresa (SmartRecruiters)'
};
const label = (s?: string) => (s ? SOURCE_LABELS[s] || s : '—');
const norm = (t?: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
const daysLeft = (d?: string) => (d ? Math.round((new Date(d.slice(0, 10) + 'T12:00:00').getTime() - new Date(todayKey() + 'T12:00:00').getTime()) / 86_400_000) : null);

type SortKey = 'title' | 'company' | 'source' | 'area' | 'region' | 'discovered_at' | 'expires_at';
const PAGE = 50;

function toCsv(rows: IndexJob[]) {
  const cols: Array<[string, (j: IndexJob) => string]> = [
    ['Cargo', (j) => j.title], ['Empresa', (j) => j.company || ''], ['Fuente', (j) => label(j.source)], ['Área', (j) => j.profession_category || ''],
    ['Región', (j) => j.region || ''], ['Comuna', (j) => j.commune || ''], ['Modalidad', (j) => j.modality || ''], ['Renta', (j) => j.salary_range || ''],
    ['Encontrada', (j) => j.discovered_at || ''], ['Vence', (j) => j.expires_at || j.deadline || ''], ['Vencimiento estimado', (j) => (j.expires_estimated ? 'sí' : 'no')], ['Enlace', (j) => j.url || '']
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return '﻿' + [cols.map(([h]) => esc(h)).join(';'), ...rows.map((r) => cols.map(([, f]) => esc(f(r))).join(';'))].join('\n');
}

export function OffersPage() {
  const [index, setIndex] = useState<IndexFile | null | undefined>(undefined);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [removed, setRemoved] = useState<RemovedOffer[]>([]);
  const [view, setView] = useState<'vigentes' | 'sacadas'>('vigentes');
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');
  const [area, setArea] = useState('');
  const [region, setRegion] = useState('');
  const [modality, setModality] = useState('');
  const [expiry, setExpiry] = useState<'' | 'hoy' | 'semana' | 'estimado' | 'real' | 'nuevas'>('');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'discovered_at', asc: false });
  const [page, setPage] = useState(1);

  useEffect(() => {
    currentIndex().then(setIndex).catch(() => setIndex(null));
    indexHistory().then(setHistory);
    removedOffers().then(setRemoved);
  }, []);

  const jobs = index?.jobs || [];
  const options = useMemo(() => {
    const uniq = (f: (j: IndexJob) => string | undefined) => Array.from(new Set(jobs.map(f).filter(Boolean) as string[])).sort();
    return { sources: uniq((j) => j.source), areas: uniq((j) => j.profession_category), regions: uniq((j) => j.region), modalities: uniq((j) => j.modality) };
  }, [jobs]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    const today = todayKey();
    const rows = jobs.filter((j) => {
      if (nq && !norm(`${j.title} ${j.company} ${j.location}`).includes(nq)) return false;
      if (source && j.source !== source) return false;
      if (area && j.profession_category !== area) return false;
      if (region && j.region !== region) return false;
      if (modality && j.modality !== modality) return false;
      const left = daysLeft(j.expires_at || j.deadline);
      if (expiry === 'hoy' && left !== 0) return false;
      if (expiry === 'semana' && (left === null || left > 7)) return false;
      if (expiry === 'estimado' && !j.expires_estimated) return false;
      if (expiry === 'real' && (j.expires_estimated || !(j.expires_at || j.deadline))) return false;
      if (expiry === 'nuevas' && j.discovered_at !== today) return false;
      return true;
    });
    const val = (j: IndexJob): string => {
      switch (sort.key) {
        case 'area': return j.profession_category || '';
        case 'source': return label(j.source);
        case 'expires_at': return j.expires_at || j.deadline || '9999';
        default: return String(j[sort.key] || '');
      }
    };
    return rows.sort((a, b) => (sort.asc ? 1 : -1) * val(a).localeCompare(val(b), 'es'));
  }, [jobs, q, source, area, region, modality, expiry, sort]);

  useEffect(() => setPage(1), [q, source, area, region, modality, expiry, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);
  const th = (key: SortKey, text: string) => (
    <th>
      <button className="sort" onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : key !== 'discovered_at' }))} aria-sort={sort.key === key ? (sort.asc ? 'ascending' : 'descending') : 'none'}>
        {text} {sort.key === key ? (sort.asc ? '▲' : '▼') : ''}
      </button>
    </th>
  );
  const clear = () => { setQ(''); setSource(''); setArea(''); setRegion(''); setModality(''); setExpiry(''); };
  const download = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ofertas-oportia-${todayKey()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (index === undefined) return <p className="muted">Cargando el índice de ofertas…</p>;
  if (index === null) return <p className="error">No se pudo leer el índice desde Supabase Storage.</p>;

  return (
    <section>
      <div className="kpis">
        <Kpi label="Ofertas vigentes" value={index.count} hint={`índice del ${new Date(index.generated_at).toLocaleString('es-CL')}`} />
        <Kpi label="Nuevas hoy" value={index.new_today} />
        <Kpi label="Vencen en 7 días" value={jobs.filter((j) => { const l = daysLeft(j.expires_at || j.deadline); return l !== null && l <= 7; }).length} />
        <Kpi label="Sacadas (30 días)" value={removed.length} hint={`${removed.filter((r) => r.reason === 'vencida').length} vencidas`} />
      </div>

      <div className="tabs-inline" role="tablist">
        <button role="tab" aria-selected={view === 'vigentes'} className={view === 'vigentes' ? 'tab active' : 'tab'} onClick={() => setView('vigentes')}>Vigentes ({index.count})</button>
        <button role="tab" aria-selected={view === 'sacadas'} className={view === 'sacadas' ? 'tab active' : 'tab'} onClick={() => setView('sacadas')}>Sacadas del índice ({removed.length})</button>
      </div>

      {view === 'vigentes' ? (
        <>
          <div className="filters">
            <input type="search" placeholder="Buscar cargo, empresa o lugar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
            <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Fuente"><option value="">Todas las fuentes</option>{options.sources.map((s) => <option key={s} value={s}>{label(s)} ({jobs.filter((j) => j.source === s).length})</option>)}</select>
            <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área"><option value="">Todas las áreas</option>{options.areas.map((a) => <option key={a}>{a}</option>)}</select>
            <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Región"><option value="">Todas las regiones</option>{options.regions.map((r) => <option key={r}>{r}</option>)}</select>
            <select value={modality} onChange={(e) => setModality(e.target.value)} aria-label="Modalidad"><option value="">Toda modalidad</option>{options.modalities.map((m) => <option key={m}>{m}</option>)}</select>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value as typeof expiry)} aria-label="Vencimiento">
              <option value="">Cualquier vencimiento</option><option value="nuevas">Nuevas hoy</option><option value="hoy">Vencen hoy</option>
              <option value="semana">Vencen en 7 días</option><option value="real">Con fecha de cierre real</option><option value="estimado">Con vencimiento estimado</option>
            </select>
            <button className="link" onClick={clear}>Limpiar</button>
            <button className="primary" onClick={download}>Descargar CSV ({filtered.length})</button>
          </div>
          <p className="muted small">{filtered.length} de {jobs.length} ofertas</p>
          <div className="table-wrap">
            <table>
              <thead><tr>{th('title', 'Cargo')}{th('company', 'Empresa')}{th('source', 'Fuente')}{th('area', 'Área')}{th('region', 'Región')}<th>Modalidad</th>{th('discovered_at', 'Encontrada')}{th('expires_at', 'Vence')}</tr></thead>
              <tbody>
                {shown.map((j) => {
                  const left = daysLeft(j.expires_at || j.deadline);
                  return (
                    <tr key={j.id}>
                      <td>{j.url ? <a href={j.url} target="_blank" rel="noopener noreferrer">{j.title}</a> : j.title}{j.salary_range && <div className="muted small">{j.salary_range}</div>}</td>
                      <td>{j.company || '—'}</td>
                      <td className="small">{label(j.source)}</td>
                      <td className="small">{j.profession_category || '—'}</td>
                      <td className="small">{j.commune ? `${j.commune}, ` : ''}{j.region || j.location || '—'}</td>
                      <td className="small">{j.modality || '—'}</td>
                      <td className="small">{j.discovered_at || '—'}</td>
                      <td className={`small ${left !== null && left <= 3 ? 'warn' : ''}`}>
                        {j.expires_at || j.deadline ? `${(j.expires_at || j.deadline || '').slice(0, 10)}${j.expires_estimated ? ' (estimado)' : ''}` : '—'}
                        {left !== null && <div className="muted">{left < 0 ? 'vencida' : left === 0 ? 'hoy' : `en ${left} d`}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="link" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
            <span className="muted small">Página {page} de {pages}</span>
            <button className="link" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
          </div>
          <Bars label="Ofertas vigentes por día" data={history.map((h) => ({ x: h.date, y: h.count }))} />
        </>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sacada</th><th>Oferta</th><th>Fuente</th><th>Motivo</th></tr></thead>
              <tbody>
                {removed.slice(0, 500).map((r) => (
                  <tr key={r.id + r.removed_at}>
                    <td className="small">{r.removed_at}</td>
                    <td>{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}<span className="muted small"> · {r.company}</span></td>
                    <td className="small">{label(r.source)}</td>
                    <td className="small">{r.reason}{r.expires_at ? ` (vencía ${r.expires_at})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {removed.length === 0 && <p className="muted">El historial de ofertas sacadas empieza con la próxima ejecución del índice (todos los días a las 08:00).</p>}
        </>
      )}
    </section>
  );
}

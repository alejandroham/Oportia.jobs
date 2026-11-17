/** Gráfico de barras simple (SVG), sin librerías externas. */
export function Bars({ data, label }: { data: Array<{ x: string; y: number }>; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.y));
  const w = 640, h = 160, pad = 24;
  const bw = data.length ? (w - pad * 2) / data.length : 0;
  return (
    <figure className="chart">
      <figcaption>{label}</figcaption>
      {data.length === 0 ? (
        <p className="muted">Aún no hay datos.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h + 20}`} role="img" aria-label={label}>
          {data.map((d, i) => {
            const bh = (d.y / max) * (h - pad);
            return (
              <g key={d.x}>
                <rect x={pad + i * bw + 2} y={h - bh} width={Math.max(2, bw - 4)} height={bh} rx={3} className="bar">
                  <title>{`${d.x}: ${d.y}`}</title>
                </rect>
                {(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && (
                  <text x={pad + i * bw + bw / 2} y={h + 14} textAnchor="middle" className="axis">{d.x.slice(5)}</text>
                )}
              </g>
            );
          })}
          <text x={pad} y={12} className="axis">máx. {max}</text>
        </svg>
      )}
    </figure>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

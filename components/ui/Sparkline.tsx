type Props = {
  values: number[];
  color?: string;
  height?: number;
};

// Minimal SVG line chart — renders whatever real series it's given (a
// day-bucketed change count, a rate history) as a polyline. Never fabricates
// points: an empty/flat series renders as a flat/empty line, not a fake
// trend.
export default function Sparkline({ values, color = "#22d3ee", height = 32 }: Props) {
  if (values.length < 2) {
    return <div style={{ height }} className="flex items-center text-xs text-slate-600">Sem histórico suficiente</div>;
  }

  const width = 100;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

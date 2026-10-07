export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  size = 160,
  thickness = 26,
  centerLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 3 : 0;

  let cumulative = 0;
  const arcs = visible.map((s) => {
    const length = (s.value / total) * circumference;
    const visibleLength = Math.max(length - gap, 0);
    const offset = -cumulative;
    cumulative += length;
    return { ...s, length: visibleLength, offset };
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {total === 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-raised)"
            strokeWidth={thickness}
          />
        ) : (
          arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={arc.offset}
            />
          ))
        )}
      </svg>
      {centerLabel ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold text-text">{centerLabel}</div>
        </div>
      ) : null}
    </div>
  );
}

export function ChartLegend({ segments, format }: { segments: DonutSegment[]; format?: (value: number) => string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="flex flex-1 flex-col gap-2">
      {segments.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="min-w-0 flex-1 truncate text-xs text-text">{s.label}</span>
          <span className="text-xs font-semibold text-text-muted">
            {format ? format(s.value) : s.value}
            {total > 0 ? ` · ${Math.round((s.value / total) * 100)}%` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

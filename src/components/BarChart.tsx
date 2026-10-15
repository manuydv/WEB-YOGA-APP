export function LegendRow({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-xs font-semibold text-text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface GroupedBarRow {
  label: string;
  values: number[];
}

/** One row per label, a thin bar per series, all scaled to the same max. */
export function GroupedBarRows({
  rows,
  colors,
  format,
}: {
  rows: GroupedBarRow[];
  colors: string[];
  format: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <div className="w-14 shrink-0 text-xs font-semibold text-text-muted">{row.label}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {row.values.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2.5 min-w-0 flex-1 rounded-full bg-surface-raised">
                  <div
                    className="h-2.5 rounded-r-full"
                    style={{ width: `${Math.max((value / max) * 100, value > 0 ? 2 : 0)}%`, backgroundColor: colors[i] }}
                  />
                </div>
                <div className="w-20 shrink-0 text-right text-[11px] font-semibold text-text-muted">
                  {format(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A single ranked bar per row, longest first. */
export function RankedBarList({
  rows,
  color,
  format,
}: {
  rows: { label: string; value: number }[];
  color: string;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-semibold text-text">{row.label}</span>
            <span className="shrink-0 font-semibold text-text-muted">{format ? format(row.value) : row.value}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-surface-raised">
            <div
              className="h-2.5 rounded-r-full"
              style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

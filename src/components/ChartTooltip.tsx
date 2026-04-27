"use client";

type PayloadItem = {
  name?: string;
  value?: unknown;
  color?: string;
  dataKey?: string;
};

export function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: unknown;
  payload?: PayloadItem[];
}) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .map((p) => ({
      name: p.name ?? String(p.dataKey ?? ""),
      value: p.value,
      color: p.color ?? "rgba(255,255,255,0.6)",
    }))
    .filter((r) => r.name);

  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-zinc-100 shadow-lg backdrop-blur">
      <div className="mb-1 text-[11px] font-semibold text-zinc-200">
        {typeof label === "string" ? label : String(label ?? "")}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r, idx) => (
          <div key={`${r.name}-${idx}`} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              <span className="text-zinc-200">{r.name}</span>
            </div>
            <span className="font-semibold tabular-nums text-zinc-50">
              {typeof r.value === "number" && Number.isFinite(r.value)
                ? r.value.toFixed(2).replace(/\.00$/, "")
                : r.value == null
                  ? "—"
                  : String(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


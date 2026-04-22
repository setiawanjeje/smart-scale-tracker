"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = {
  measuredAt: string;
  weightKg: number;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
};

type Series = {
  key: "weightKg" | "bodyFatPct" | "muscleMassKg";
  label: string;
  unit: string;
};

const SERIES: Record<Series["key"], Series> = {
  weightKg: { key: "weightKg", label: "Weight", unit: "kg" },
  bodyFatPct: { key: "bodyFatPct", label: "Body fat", unit: "%" },
  muscleMassKg: { key: "muscleMassKg", label: "Muscle mass", unit: "kg" },
};

export function TrendChart({
  data,
  series,
}: {
  data: TrendPoint[];
  series: Series["key"];
}) {
  const s = SERIES[series];
  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" opacity={0.25} />
          <XAxis
            dataKey="measuredAt"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis tickLine={false} axisLine={false} width={44} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={s.key}
            name={`${s.label} (${s.unit})`}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


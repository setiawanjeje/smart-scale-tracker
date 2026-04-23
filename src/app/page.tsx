import { prisma } from "@/lib/prisma";
import { TrendChart } from "@/components/TrendChart";
import { UploadSection } from "@/components/UploadSection";
import Link from "next/link";
import { MultiMetricChart } from "@/components/MultiMetricChart";

function formatDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Home() {
  return <Dashboard />;
}

async function Dashboard() {
  const weighIns = await prisma.weighIn.findMany({
    orderBy: { measuredAt: "asc" },
  });

  const latest = weighIns.at(-1) ?? null;
  const data = weighIns.map((w) => ({
    measuredAt: formatDay(w.measuredAt),
    weightKg: w.weightKg,
    bodyFatPct: w.bodyFatPct,
    muscleMassKg: w.muscleMassKg,
  }));

  const segmentalData = weighIns.map((w) => {
    let m: Record<string, unknown> = {};
    try {
      m = w.metricsJson ? (JSON.parse(w.metricsJson) as Record<string, unknown>) : {};
    } catch {
      m = {};
    }
    const seg = (m.segmental ?? {}) as Record<string, unknown>;
    const part = (k: string) => (seg[k] ?? {}) as Record<string, unknown>;

    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

    return {
      measuredAt: formatDay(w.measuredAt),
      rightArmLeanKg: num(part("rightArm").leanKg),
      rightArmFatKg: num(part("rightArm").fatKg),
      leftArmLeanKg: num(part("leftArm").leanKg),
      leftArmFatKg: num(part("leftArm").fatKg),
      rightLegLeanKg: num(part("rightLeg").leanKg),
      rightLegFatKg: num(part("rightLeg").fatKg),
      leftLegLeanKg: num(part("leftLeg").leanKg),
      leftLegFatKg: num(part("leftLeg").fatKg),
      torsoLeanKg: num(part("torso").leanKg),
      torsoFatKg: num(part("torso").fatKg),
      abdominalCircumferenceCm: num(m.abdominalCircumferenceCm),
      waistToHipRatio: num(m.waistToHipRatio),
    };
  });

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 font-sans text-black dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-4xl flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">Smart Scale Tracker</h1>
            <Link
              href="/history"
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              History
            </Link>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload your smart scale PDF export. We&apos;ll extract weight, body fat, muscle
            mass, and date, store it locally, and show trends.
          </p>
        </div>

        <UploadSection />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Latest weight"
            value={latest ? `${latest.weightKg.toFixed(1)} kg` : "—"}
            sub={latest ? formatDay(latest.measuredAt) : "No data yet"}
          />
          <StatCard
            label="Body fat"
            value={latest?.bodyFatPct != null ? `${latest.bodyFatPct.toFixed(1)}%` : "—"}
            sub="Latest"
          />
          <StatCard
            label="Muscle mass"
            value={
              latest?.muscleMassKg != null ? `${latest.muscleMassKg.toFixed(1)} kg` : "—"
            }
            sub="Latest"
          />
        </section>

        <section className="grid grid-cols-1 gap-4">
          <ChartCard title="Weight" subtitle="kg" entries={weighIns.length}>
            {weighIns.length >= 2 ? (
              <TrendChart data={data} series="weightKg" />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
          <ChartCard title="Body fat" subtitle="%" entries={weighIns.length}>
            {weighIns.length >= 2 ? (
              <TrendChart data={data} series="bodyFatPct" />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
          <ChartCard title="Muscle mass" subtitle="kg" entries={weighIns.length}>
            {weighIns.length >= 2 ? (
              <TrendChart data={data} series="muscleMassKg" />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-medium">All metrics (latest scan)</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Everything we extracted from the PDF (plus raw result lines).
              </div>
            </div>
          </div>
          {latest?.metricsJson ? (
            <MetricsTable metricsJson={latest.metricsJson} />
          ) : (
            <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">
              Upload a new PDF to populate the full metrics table.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Segmental + measurements</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Hover any line to see exact values.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChartCard title="Right arm" subtitle="kg" entries={weighIns.length}>
              <MultiMetricChart
                data={segmentalData}
                lines={[
                  { key: "rightArmLeanKg", name: "Lean (kg)" },
                  { key: "rightArmFatKg", name: "Fat (kg)" },
                ]}
              />
            </ChartCard>
            <ChartCard title="Left arm" subtitle="kg" entries={weighIns.length}>
              <MultiMetricChart
                data={segmentalData}
                lines={[
                  { key: "leftArmLeanKg", name: "Lean (kg)" },
                  { key: "leftArmFatKg", name: "Fat (kg)" },
                ]}
              />
            </ChartCard>
            <ChartCard title="Right leg" subtitle="kg" entries={weighIns.length}>
              <MultiMetricChart
                data={segmentalData}
                lines={[
                  { key: "rightLegLeanKg", name: "Lean (kg)" },
                  { key: "rightLegFatKg", name: "Fat (kg)" },
                ]}
              />
            </ChartCard>
            <ChartCard title="Left leg" subtitle="kg" entries={weighIns.length}>
              <MultiMetricChart
                data={segmentalData}
                lines={[
                  { key: "leftLegLeanKg", name: "Lean (kg)" },
                  { key: "leftLegFatKg", name: "Fat (kg)" },
                ]}
              />
            </ChartCard>
            <ChartCard title="Torso" subtitle="kg" entries={weighIns.length}>
              <MultiMetricChart
                data={segmentalData}
                lines={[
                  { key: "torsoLeanKg", name: "Lean (kg)" },
                  { key: "torsoFatKg", name: "Fat (kg)" },
                ]}
              />
            </ChartCard>
            <ChartCard title="Abdominal circumference" subtitle="cm" entries={weighIns.length}>
              <MultiMetricChart
                data={segmentalData}
                lines={[{ key: "abdominalCircumferenceCm", name: "cm" }]}
              />
            </ChartCard>
            <ChartCard title="Waist-to-hip ratio" subtitle="ratio" entries={weighIns.length}>
              <MultiMetricChart
                data={segmentalData}
                lines={[{ key: "waistToHipRatio", name: "WHR" }]}
              />
            </ChartCard>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricsTable({ metricsJson }: { metricsJson: string }) {
  let metrics: Record<string, unknown> = {};
  try {
    metrics = JSON.parse(metricsJson) as Record<string, unknown>;
  } catch {
    metrics = { error: "Failed to decode metricsJson" };
  }

  const entries = Object.entries(metrics).filter(([k]) => k !== "rawResultLines");
  const rawLines = Array.isArray(metrics.rawResultLines) ? metrics.rawResultLines : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
          >
            <div className="font-medium text-zinc-700 dark:text-zinc-200">{k}</div>
            <div className="text-right text-zinc-600 dark:text-zinc-400">
              {typeof v === "number"
                ? Number.isFinite(v)
                  ? v.toString()
                  : "—"
                : v == null
                  ? "—"
                  : String(v)}
            </div>
          </div>
        ))}
      </div>

      {rawLines.length ? (
        <details className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
          <summary className="cursor-pointer font-medium">Raw result lines</summary>
          <div className="mt-3 flex flex-col gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            {rawLines.map((l: unknown, idx: number) => (
              <div key={idx} className="rounded-lg bg-zinc-50 p-2 dark:bg-black">
                {String(l)}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  entries,
  children,
}: {
  title: string;
  subtitle: string;
  entries: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{entries} entries</div>
      </div>
      {children}
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
      Upload at least 2 PDFs to see a trend line.
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sub}</div>
    </div>
  );
}


import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteWeighInButton } from "@/components/DeleteWeighInButton";

function formatDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function HistoryPage() {
  const weighIns = await prisma.weighIn.findMany({
    orderBy: { measuredAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 font-sans text-black dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-5xl flex-1 flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">History</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              All imported scans. Delete an entry to remove it from charts and stats.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Back to dashboard
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="grid grid-cols-12 gap-2 border-b border-black/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Weight</div>
            <div className="col-span-2">Body fat</div>
            <div className="col-span-2">Muscle</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {weighIns.length ? (
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {weighIns.map((w) => (
                <div key={w.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                  <div className="col-span-3 font-medium">{formatDay(w.measuredAt)}</div>
                  <div className="col-span-2">{w.weightKg.toFixed(1)} kg</div>
                  <div className="col-span-2">
                    {w.bodyFatPct != null ? `${w.bodyFatPct.toFixed(1)}%` : "—"}
                  </div>
                  <div className="col-span-2">
                    {w.muscleMassKg != null ? `${w.muscleMassKg.toFixed(1)} kg` : "—"}
                  </div>
                  <div className="col-span-2 truncate text-zinc-600 dark:text-zinc-400">
                    {w.sourceFile ?? "—"}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <DeleteWeighInButton id={w.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
              No entries yet.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


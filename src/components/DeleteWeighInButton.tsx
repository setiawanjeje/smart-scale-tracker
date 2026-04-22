"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteWeighInButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/weighins/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}


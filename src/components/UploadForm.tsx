"use client";

import { useRef, useState } from "react";

export function UploadForm({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return;

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/weighins/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Upload failed");
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium">Upload smart scale PDF</div>
        <button
          type="submit"
          disabled={!file || busy}
          className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Uploading…" : "Import"}
        </button>
      </div>

      <input
        id="scale-pdf-file"
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold dark:file:bg-zinc-800"
      />

      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}
    </form>
  );
}


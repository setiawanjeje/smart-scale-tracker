import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractEvoltFromText } from "@/lib/evoltExtract";

export const runtime = "nodejs";

async function extractTextFromPdf(buf: Buffer) {
  // Polyfill minimal DOM APIs that pdfjs-dist may probe for, even for text extraction.
  // This avoids Vercel runtime crashes like "DOMMatrix is not defined".
  const g = globalThis as unknown as {
    DOMMatrix?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
  };
  if (!g.DOMMatrix) g.DOMMatrix = class DOMMatrix {};
  if (!g.ImageData) g.ImageData = class ImageData {};
  if (!g.Path2D) g.Path2D = class Path2D {};
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.min.mjs");

  // IMPORTANT (Vercel): pre-load the worker module so pdfjs can use its in-process
  // WorkerMessageHandler via `globalThis.pdfjsWorker`, without trying to `import(workerSrc)`.
  try {
    await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  } catch {
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buf),
    disableWorker: true,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  } as never);

  const doc = await loadingTask.promise;
  type TextItem = { str?: string; transform?: number[] };

  const toLines = (items: unknown[]) => {
    const xs: { x: number; y: number; s: string }[] = [];
    for (const it of items) {
      const item = it as TextItem;
      const s = String(item.str ?? "").trim();
      const t = Array.isArray(item.transform) ? item.transform : null;
      if (!s || !t || t.length < 6) continue;
      const x = Number(t[4]);
      const y = Number(t[5]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      xs.push({ x, y, s });
    }

    // Bucket by Y with a small tolerance to reconstruct rows.
    const tol = 2.5;
    const rows: { y: number; cells: { x: number; s: string }[] }[] = [];
    for (const c of xs) {
      let row = rows.find((r) => Math.abs(r.y - c.y) <= tol);
      if (!row) {
        row = { y: c.y, cells: [] };
        rows.push(row);
      }
      row.cells.push({ x: c.x, s: c.s });
    }

    // Sort top-to-bottom (higher Y first), and left-to-right within row.
    rows.sort((a, b) => b.y - a.y);
    const lines: string[] = [];
    for (const r of rows) {
      r.cells.sort((a, b) => a.x - b.x);

      // Avoid extra spaces when PDF splits text into many fragments.
      let line = "";
      for (const cell of r.cells) {
        if (!line) {
          line = cell.s;
          continue;
        }
        const last = line[line.length - 1] ?? "";
        const first = cell.s[0] ?? "";
        const needsSpace =
          last !== " " &&
          first !== " " &&
          last !== "/" &&
          first !== "/" &&
          last !== "-" &&
          first !== "-" &&
          last !== "(" &&
          first !== ")" &&
          last !== "." &&
          first !== "." &&
          last !== "," &&
          first !== "," &&
          last !== ":" &&
          first !== ":" &&
          last !== "%" &&
          first !== "%";
        line += (needsSpace ? " " : "") + cell.s;
      }
      const trimmed = line.replace(/\s+/g, " ").trim();
      if (trimmed) lines.push(trimmed);
    }
    return lines.join("\n");
  };

  let out = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    out += toLines(content.items as unknown[]) + "\n";
    page.cleanup();
  }
  await doc.destroy();
  return out;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a PDF file field named 'file'." },
      { status: 400 },
    );
  }

  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json(
      { error: `Expected a PDF. Received: ${file.type}` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const text = await extractTextFromPdf(buf);

    const extracted = extractEvoltFromText(text ?? "");

    if (extracted.weightKg == null) {
      return NextResponse.json(
        { error: "Could not find weight in the PDF." },
        { status: 422 },
      );
    }

    const measuredAt = extracted.measuredAt ? new Date(extracted.measuredAt) : new Date();
    const weighIn = await prisma.weighIn.create({
      data: {
        measuredAt,
        weightKg: extracted.weightKg,
        bodyFatPct: extracted.bodyFatPct ?? null,
        muscleMassKg: extracted.muscleMassKg ?? null,
        sourceFile: file.name || null,
        rawText: extracted.rawText,
        metricsJson: extracted.metrics ? JSON.stringify(extracted.metrics) : null,
      },
    });

    return NextResponse.json({ weighIn });
  } catch (err) {
    console.error("[upload] parse failed", err);
    return NextResponse.json(
      {
        error: "Failed to parse PDF.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
  // Unreachable: we return inside try/catch.
}


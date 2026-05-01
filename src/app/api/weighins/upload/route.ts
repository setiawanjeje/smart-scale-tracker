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

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buf),
    disableWorker: true,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  } as never);

  const doc = await loadingTask.promise;
  let out = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it: unknown) => (it as { str?: string }).str ?? "")
      .join(" ");
    out += pageText + "\n";
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
    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/da2ec3ea-4c3c-4418-91fd-68c85b934dbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'351efa'},body:JSON.stringify({sessionId:'351efa',runId:'pre-fix',hypothesisId:'H_bundle_missing_dep',location:'src/app/api/weighins/upload/route.ts:beforeParse',message:'upload handler start',data:{bufLen:buf.length},timestamp:Date.now()})}).catch(()=>{});
    console.error("[PDFDBG] upload start", { bufLen: buf.length });
    // #endregion agent log

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
    // #region agent log
    fetch('http://127.0.0.1:7282/ingest/da2ec3ea-4c3c-4418-91fd-68c85b934dbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'351efa'},body:JSON.stringify({sessionId:'351efa',runId:'pre-fix',hypothesisId:'H_bundle_missing_dep',location:'src/app/api/weighins/upload/route.ts:catch',message:'upload parse failed',data:{name:err instanceof Error?err.name:typeof err,message:err instanceof Error?String(err.message).slice(0,250):String(err).slice(0,250)},timestamp:Date.now()})}).catch(()=>{});
    console.error("[PDFDBG] upload parse failed", { name: err instanceof Error ? err.name : typeof err, message: err instanceof Error ? err.message : String(err) });
    // #endregion agent log
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


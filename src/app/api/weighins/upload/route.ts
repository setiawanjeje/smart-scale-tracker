import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractEvoltFromText } from "@/lib/evoltExtract";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

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
    fetch('http://127.0.0.1:7282/ingest/da2ec3ea-4c3c-4418-91fd-68c85b934dbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'351efa'},body:JSON.stringify({sessionId:'351efa',runId:'pre-fix',hypothesisId:'H_bundle_missing_dep',location:'src/app/api/weighins/upload/route.ts:beforeParse',message:'upload handler start',data:{hasPdfParse:typeof PDFParse==='function',bufLen:buf.length},timestamp:Date.now()})}).catch(()=>{});
    console.error("[PDFDBG] upload start", { hasPdfParse: typeof PDFParse === "function", bufLen: buf.length });
    // #endregion agent log

    const parser = new PDFParse({ data: buf });
    const { text } = await parser.getText();
    await parser.destroy();

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


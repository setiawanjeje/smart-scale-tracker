import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseScalePdfText } from "@/lib/parseScalePdf";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function extractTextFromPdfViaScript(buf: Buffer) {
  const tmpPath = path.join(os.tmpdir(), `scale-upload-${randomUUID()}.pdf`);
  try {
    await fs.writeFile(tmpPath, buf);
    const scriptPath = path.join(process.cwd(), "scripts", "parse-evolt-pdf.mjs");
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, tmpPath], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    // The script prints the parsed fields as JSON.
    const parsedFields = JSON.parse(stdout);
    return parsedFields as unknown;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
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
  let rawText = "";
  try {
    // Use a Node subprocess to parse PDFs (avoids Next.js dev bundler worker issues).
    const parsedFields = (await extractTextFromPdfViaScript(buf)) as {
      measuredAt?: string;
      weightKg?: number;
      bodyFatPct?: number;
      muscleMassKg?: number;
      rawText?: string;
      metrics?: unknown;
    };

    rawText = parsedFields.rawText ?? "";

    const extracted = {
      measuredAt: parsedFields.measuredAt ? new Date(parsedFields.measuredAt) : undefined,
      weightKg: parsedFields.weightKg,
      bodyFatPct: parsedFields.bodyFatPct,
      muscleMassKg: parsedFields.muscleMassKg,
    };

    if (extracted.weightKg == null) {
      return NextResponse.json(
        { error: "Could not find weight in the PDF." },
        { status: 422 },
      );
    }

    const measuredAt = extracted.measuredAt ?? new Date();
    const weighIn = await prisma.weighIn.create({
      data: {
        measuredAt,
        weightKg: extracted.weightKg,
        bodyFatPct: extracted.bodyFatPct ?? null,
        muscleMassKg: extracted.muscleMassKg ?? null,
        sourceFile: file.name || null,
        rawText,
        metricsJson: parsedFields.metrics ? JSON.stringify(parsedFields.metrics) : null,
      },
    });

    return NextResponse.json({ weighIn });
  } catch (err) {
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


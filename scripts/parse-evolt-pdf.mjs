import fs from "node:fs";
import { PDFParse } from "pdf-parse";
import { parseScalePdfText } from "../src/lib/parseScalePdf.ts";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/parse-evolt-pdf.mjs /path/to/file.pdf");
  process.exit(1);
}

const buf = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data: buf });
const { text } = await parser.getText();
await parser.destroy();

const rawText = text ?? "";
const parsed = parseScalePdfText(rawText);

const metrics = {};

// Header lines (Evolt format)
const nameAndDate = rawText.match(
  /\b(\d{1,2}-\d{1,2}-20\d{2}\s+\d{1,2}:\d{2})\s+([^\r\n]+)\b/,
);
if (nameAndDate) {
  const m = nameAndDate[1].match(
    /(\d{1,2})-(\d{1,2})-(20\d{2})\s+(\d{1,2}):(\d{2})/,
  );
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const hh = Number(m[4]);
    const min = Number(m[5]);
    metrics.measuredAt = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min)).toISOString();
  }
  metrics.name = nameAndDate[2].trim();
}

const demo = rawText.match(
  /\b(\d{2,3})\s*cm\s+(\d{2,3}(?:[.,]\d)?)\s*kg\s+(\d{1,3})\s+(Female|Male)\b/i,
);
if (demo) {
  metrics.heightCm = Number(demo[1]);
  metrics.weightKg = Number(String(demo[2]).replace(",", "."));
  metrics.age = Number(demo[3]);
  metrics.gender = demo[4];
}

// BMR + TEE appear as kCal values (first is BMR, second is TEE in this export)
const kcals = [...rawText.matchAll(/\b(\d{3,5})\s*kCal\b/g)].map((m) => Number(m[1]));
if (kcals.length) {
  metrics.bmrKcal = kcals[0];
  if (kcals.length > 1) metrics.teeKcal = kcals[1];
}

// Lean body mass, skeletal muscle mass, visceral fat level (same line in the export)
const lbmSmmVfl = rawText.match(
  /\b(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{1,2})\s*\/\s*Over Range\b/i,
);
if (lbmSmmVfl) {
  metrics.leanBodyMassKg = Number(String(lbmSmmVfl[1]).replace(",", "."));
  metrics.skeletalMuscleMassKg = Number(String(lbmSmmVfl[2]).replace(",", "."));
  metrics.visceralFatLevel = Number(lbmSmmVfl[3]);
}

// Total body water + body fat % + TEE line contains these in your sample
const tbwAndBfp = rawText.match(
  /\b(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{1,2}(?:[.,]\d)?)%\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{3,5})\s*kCal\b/i,
);
if (tbwAndBfp) {
  metrics.totalBodyWaterKg = Number(String(tbwAndBfp[1]).replace(",", "."));
  metrics.bodyFatPct = Number(String(tbwAndBfp[2]).replace(",", "."));
}

// Derived fat mass (kg)
if (metrics.weightKg != null && metrics.bodyFatPct != null) {
  metrics.bodyFatMassKg = (metrics.weightKg * metrics.bodyFatPct) / 100;
}

// Keep the 5 result-ish lines so we can display everything even if some fields are unmapped.
metrics.rawResultLines = rawText
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => /\[\s*\d/.test(l) && /Optimal|High|Under|Over Range|Balanced/.test(l))
  .slice(0, 10);

console.log(
  JSON.stringify(
    {
      ...parsed,
      rawText,
      metrics,
    },
    null,
    2,
  ),
);


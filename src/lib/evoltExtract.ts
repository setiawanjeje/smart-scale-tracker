import { parseScalePdfText } from "@/lib/parseScalePdf";

export type EvoltExtractResult = {
  measuredAt?: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  rawText: string;
  metrics: Record<string, unknown>;
};

export function extractEvoltFromText(rawText: string): EvoltExtractResult {
  const parsed = parseScalePdfText(rawText);

  const metrics: Record<string, any> = {};
  const segmental: Record<string, any> = {};

  // Prefer the last line that looks like: "dd-mm-yyyy HH:MM <name>"
  // (pdf text order can include multiple date-like occurrences.)
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(
      /^(\d{1,2})-(\d{1,2})-(20\d{2})\s+(\d{1,2}):(\d{2})\s+(.+)$/,
    );
    if (!m) continue;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const hh = Number(m[4]);
    const min = Number(m[5]);
    metrics.measuredAt = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min)).toISOString();
    metrics.name = m[6].trim();
    break;
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

  const kcals = [...rawText.matchAll(/\b(\d{3,5})\s*kCal\b/g)].map((m) => Number(m[1]));
  if (kcals.length) {
    metrics.bmrKcal = kcals[0];
    if (kcals.length > 1) metrics.teeKcal = kcals[1];
  }

  const lbmSmmVfl = rawText.match(
    /\b(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{1,2})\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b/i,
  );
  if (lbmSmmVfl) {
    metrics.leanBodyMassKg = Number(String(lbmSmmVfl[1]).replace(",", "."));
    metrics.skeletalMuscleMassKg = Number(String(lbmSmmVfl[2]).replace(",", "."));
    metrics.visceralFatLevel = Number(lbmSmmVfl[3]);
  }

  const tbwAndBfp = rawText.match(
    /\b(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{1,2}(?:[.,]\d)?)%\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\s*\[[^\]]+\]\s+(\d{3,5})\s*kCal\b/i,
  );
  if (tbwAndBfp) {
    metrics.totalBodyWaterKg = Number(String(tbwAndBfp[1]).replace(",", "."));
    metrics.bodyFatPct = Number(String(tbwAndBfp[2]).replace(",", "."));
  }

  if (metrics.weightKg != null && metrics.bodyFatPct != null) {
    metrics.bodyFatMassKg = (metrics.weightKg * metrics.bodyFatPct) / 100;
  }

  const armLine = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(
      (l) =>
        /^(\d{1,2}(?:[.,]\d{1,2})?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)/i.test(
          l,
        ) &&
        /(\d{1,2}(?:[.,]\d{1,2})?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)/i.test(
          l,
        ) &&
        (l.match(/\b\d+(?:[.,]\d+)?\s*\//g) ?? []).length >= 4,
    );

  if (armLine) {
    const nums = [...armLine.matchAll(/\b(\d+(?:[.,]\d+)?)\s*\//g)].map((m) =>
      Number(String(m[1]).replace(",", ".")),
    );
    if (nums.length >= 4) {
      segmental.rightArm = { leanKg: nums[0], fatKg: nums[1] };
      segmental.leftArm = { leanKg: nums[2], fatKg: nums[3] };
    }
  }

  const legLine = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(
      (l) =>
        (l.match(/\b\d+(?:[.,]\d+)?\s*\//g) ?? []).length >= 4 &&
        [...l.matchAll(/\b(\d+(?:[.,]\d+)?)\s*\//g)]
          .map((m) => Number(String(m[1]).replace(",", ".")))
          .some((n) => n >= 5 && n <= 15),
    );

  if (legLine) {
    const nums = [...legLine.matchAll(/\b(\d+(?:[.,]\d+)?)\s*\//g)].map((m) =>
      Number(String(m[1]).replace(",", ".")),
    );
    if (nums.length >= 4) {
      segmental.rightLeg = { leanKg: nums[0], fatKg: nums[1] };
      segmental.leftLeg = { leanKg: nums[2], fatKg: nums[3] };
    }
  }

  const torsoLine = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /\bcm\b/i.test(l) && /\b0\.\d+\b/.test(l));

  if (torsoLine) {
    const torsoNums = [...torsoLine.matchAll(/\b(\d+(?:[.,]\d+)?)\s*\//g)].map((m) =>
      Number(String(m[1]).replace(",", ".")),
    );
    if (torsoNums.length >= 2) {
      segmental.torso = { leanKg: torsoNums[0], fatKg: torsoNums[1] };
    }

    const ab = torsoLine.match(/\b(\d+(?:[.,]\d+)?)\s*cm\b/i);
    if (ab) metrics.abdominalCircumferenceCm = Number(String(ab[1]).replace(",", "."));

    const whr = torsoLine.match(
      /\b(0\.\d+)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b/i,
    );
    if (whr) metrics.waistToHipRatio = Number(String(whr[1]).replace(",", "."));
  }

  if (Object.keys(segmental).length) {
    metrics.segmental = segmental;
  }

  metrics.rawResultLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /\[\s*\d/.test(l) && /Optimal|High|Under|Over Range|Balanced/.test(l))
    .slice(0, 10);

  return {
    measuredAt: metrics.measuredAt,
    weightKg: parsed.weightKg,
    bodyFatPct: parsed.bodyFatPct,
    muscleMassKg: parsed.muscleMassKg,
    rawText,
    metrics,
  };
}


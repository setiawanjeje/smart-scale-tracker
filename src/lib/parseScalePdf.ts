export type ParsedWeighIn = {
  measuredAt?: Date;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
};

function toNumber(raw: string) {
  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function parseDate(raw: string) {
  const trimmed = raw.trim();

  // dd-mm-yyyy HH:MM (Evolt exports)
  let m = trimmed.match(
    /\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\s+(\d{1,2}):(\d{2})\b/,
  );
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const dt = new Date(Date.UTC(y, mo - 1, d, hh, mm));
    return Number.isNaN(dt.getTime()) ? undefined : dt;
  }

  // yyyy-mm-dd or yyyy/mm/dd
  m = trimmed.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return Number.isNaN(dt.getTime()) ? undefined : dt;
  }

  // dd/mm/yyyy or dd-mm-yyyy
  m = trimmed.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return Number.isNaN(dt.getTime()) ? undefined : dt;
  }

  return undefined;
}

export function parseScalePdfText(text: string): ParsedWeighIn {
  const original = text;
  const t = text.replace(/\s+/g, " ").trim();

  // Evolt "HEIGHT WEIGHT AGE GENDER" line tends to be the most stable source.
  const evoltWeight =
    original.match(/\b\d{2,3}\s*cm\s+(\d{2,3}(?:[.,]\d)?)\s*kg\b/i)?.[1] ??
    t.match(/\b\d{2,3}\s*cm\s+(\d{2,3}(?:[.,]\d)?)\s*kg\b/i)?.[1];

  const genericWeight =
    t.match(/\bweight\b[^0-9]{0,20}(\d{2,3}(?:[.,]\d)?)\s*kg\b/i)?.[1] ??
    t.match(/\b(\d{2,3}(?:[.,]\d)?)\s*kg\b/i)?.[1];

  const weight = evoltWeight ?? genericWeight;

  // Prefer the LBM/SMM/VFL row when present (this is where Evolt reports skeletal muscle mass).
  // Example:
  // "49.3 / Optimal ... 23.8 / High ... 10 / Over Range"
  // Some PDFs report VFL as "9 / Balanced" instead of "10 / Over Range".
  let evoltSmm: string | undefined;
  {
    const re =
      /(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b[\s\S]{0,160}?(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b[\s\S]{0,160}?(\d{1,2})\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b/gi;
    for (const m of original.matchAll(re)) {
      const smmCandidate = toNumber(m[2] ?? "");
      if (smmCandidate == null) continue;
      if (smmCandidate < 15 || smmCandidate > 70) continue;
      evoltSmm = m[2] ?? undefined;
      break;
    }
  }

  // Evolt often includes a single *line* like: "35.8 / Optimal ... 32.7% / High ..."
  // We intentionally keep this line-scoped so we don't accidentally pair numbers from different rows.
  const lines = original.split(/\r?\n/);
  let evoltLineMuscle: string | undefined;
  let evoltLineFat: string | undefined;
  for (const line of lines) {
    if (!/%\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b/i.test(line)) continue;
    if (!/\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b/i.test(line)) continue;

    const m = line.match(
      /^\s*(\d{1,3}(?:[.,]\d)?)\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b[\s\S]{0,180}?(\d{1,2}(?:[.,]\d)?)\s*%\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b/i,
    );
    if (!m) continue;

    // Prefer plausible skeletal muscle mass values.
    const muscleCandidate = toNumber(m[1]);
    const fatCandidate = toNumber(m[2]);
    if (muscleCandidate == null || fatCandidate == null) continue;
    if (muscleCandidate < 15 || muscleCandidate > 70) continue;
    if (fatCandidate < 3 || fatCandidate > 70) continue;

    evoltLineMuscle = m[1];
    evoltLineFat = m[2];
    break;
  }

  const bodyFat =
    evoltLineFat ??
    t.match(
      /\b(total\s*body\s*fat\s*percentage|body\s*fat|fat)\b[^0-9]{0,20}(\d{1,2}(?:[.,]\d)?)\s*%/i,
    )?.[2] ??
    t.match(/\b(\d{1,2}(?:[.,]\d)?)\s*%\s*\/\s*(?:Optimal|High|Under|Balanced|Over Range)\b/i)?.[1];

  const muscleMass =
    evoltSmm ??
    evoltLineMuscle ??
    t.match(
      /\b(muscle\s*mass|skeletal\s*muscle)\b[^0-9]{0,20}(\d{1,3}(?:[.,]\d)?)\s*kg\b/i,
    )?.[2] ??
    t.match(/\bmuscle\b[^0-9]{0,20}(\d{1,3}(?:[.,]\d)?)\s*kg\b/i)?.[1];

  const dateRaw =
    original.match(/\b(\d{1,2}[-/]\d{1,2}[-/](?:20\d{2}))\s+(\d{1,2}:\d{2})\b/)
      ?.slice(1, 3)
      .join(" ") ??
    t.match(/\b(date|measurement\s*date)\b[^0-9]{0,20}([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|20\d{2}[-/][0-9]{1,2}[-/][0-9]{1,2})\b/i)
      ?.[2] ??
    t.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2})\b/)?.[1];

  return {
    measuredAt: dateRaw ? parseDate(dateRaw) : undefined,
    weightKg: weight ? toNumber(weight) : undefined,
    bodyFatPct: bodyFat ? toNumber(bodyFat) : undefined,
    muscleMassKg: muscleMass ? toNumber(muscleMass) : undefined,
  };
}


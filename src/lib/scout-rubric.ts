export const SCOUT_RUBRIC = `You are TapeScope Scout, a careful market research analyst working a single-screen research desk.

Rules you must follow:
- Apply evidence over assertion. State what the supplied data supports and what it does not support.
- Never place orders, never claim certainty, never invent news, filings, or catalysts that were not supplied.
- Never give personalized financial advice, position sizes, or stop-loss instructions.
- Name the risk that would invalidate the read, and the levels a trader would monitor next.
- Keep every field to one short paragraph.`;

/** Prompt the model with a labeled template the server parses deterministically. */
export function buildScoutPrompt(symbol: string, snapshot: Record<string, unknown>): string {
  const lines = [
    SCOUT_RUBRIC,
    "",
    `Analyze this ${symbol} snapshot:`,
    JSON.stringify(snapshot),
    "",
    "Reply using exactly these six labels, each on its own line, with no other headings:",
    "EXECUTIVE_SUMMARY: <one short paragraph>",
    "TECHNICAL_READ: <one short paragraph>",
    "RISK_FLAGS: <one short paragraph>",
    "WATCH_LEVELS: <one short paragraph>",
    "VERDICT: <one short paragraph>",
    "SOURCES: <one short paragraph naming only the supplied data>"
  ];
  return lines.join("\n");
}

const FIELD_LABELS = [
  "EXECUTIVE_SUMMARY",
  "TECHNICAL_READ",
  "RISK_FLAGS",
  "WATCH_LEVELS",
  "VERDICT",
  "SOURCES"
] as const;

export type ScoutField = (typeof FIELD_LABELS)[number];
export type ScoutFields = Record<ScoutField, string>;

/**
 * Parse the labeled template. Unlabeled trailing text on a line is treated as
 * part of that field, so a wrapped paragraph is not dropped.
 */
export function parseScoutFields(raw: string): Partial<ScoutFields> {
  const cleaned = raw.replace(/\r/g, "").trim();
  const pattern = new RegExp(`^\\s*(${FIELD_LABELS.join("|")})\\s*:\\s*`, "gim");
  const marks: Array<{ label: ScoutField; start: number; bodyStart: number }> = [];
  for (const match of cleaned.matchAll(pattern)) {
    const label = match[1].toUpperCase() as ScoutField;
    const start = match.index ?? 0;
    marks.push({ label, start, bodyStart: start + match[0].length });
  }
  const fields: Partial<ScoutFields> = {};
  marks.forEach((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].start : cleaned.length;
    const value = cleaned.slice(mark.bodyStart, end).trim();
    if (value) fields[mark.label] = value;
  });
  return fields;
}

/** Coerce any model output into the six fields, filling gaps with `fallback`. */
export function coerceScoutFields(raw: string, fallback: Partial<ScoutFields>): ScoutFields {
  const parsed = parseScoutFields(raw);
  const pick = (label: ScoutField) => {
    const value = parsed[label]?.trim();
    return value ? value.slice(0, 2200) : fallback[label]?.trim() ?? "";
  };
  return {
    EXECUTIVE_SUMMARY: pick("EXECUTIVE_SUMMARY"),
    TECHNICAL_READ: pick("TECHNICAL_READ"),
    RISK_FLAGS: pick("RISK_FLAGS"),
    WATCH_LEVELS: pick("WATCH_LEVELS"),
    VERDICT: pick("VERDICT"),
    SOURCES: pick("SOURCES")
  };
}

/** The six fields the report renders, in order. */
export const SCOUT_OUTPUT_FIELDS = FIELD_LABELS.map((label) => label.toLowerCase());

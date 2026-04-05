/**
 * Best-effort parsers for free-form experiment notes (typed or dictated).
 * Used by "Parse notes → fields" on passage, observation, count, treatment, and image forms.
 */

export function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export function parseIsoDateFromText(text: string) {
  const m = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  return m ? m[0] : null;
}

export function parseSplitRatio(text: string) {
  const m = text.match(/\b(\d+)\s*[:\/]\s*(\d+)\b/);
  return m ? `${m[1]}:${m[2]}` : null;
}

export function parseConfluence(text: string) {
  const m = text.match(/\b(\d{1,3})(?:\s*%|\s*percent)?\s*(?:confluence|confluent)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export function parsePassageNumber(text: string) {
  const m = text.match(/\b(?:p|passage)\s*#?\s*(\d+)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseFlaskType(text: string) {
  const m =
    text.match(/\b(t-\s*\d+)\b/i) ||
    text.match(/\b(\d+\s*-\s*well|\d+\s*well)\b/i) ||
    text.match(/\b(flask\s*[a-z0-9-]+)\b/i);
  return m ? normalizeWhitespace(m[1]).toUpperCase().replace(/\s+/g, '') : null;
}

export function parseMedia(text: string) {
  const m = text.match(/\bmedia\s*[:\-]\s*([a-z0-9+ ./_-]{2,40})/i);
  if (m) return normalizeWhitespace(m[1]);

  const common = ['DMEM', 'RPMI', 'DMEM/F12', 'IMDM', 'MEM', 'DMEM F12'];
  for (const c of common) {
    if (text.toUpperCase().includes(c.replace(' ', ''))) return c.replace(' ', '');
  }
  return null;
}

export function parseDose(text: string) {
  const m = text.match(
    /\b(\d+(?:\.\d+)?)\s*(uM|µM|mM|nM|pM|ng\/mL|ug\/mL|µg\/mL|mg\/mL)\b/i,
  );
  return m ? `${m[1]} ${m[2]}`.replace('uM', 'µM').replace('ug', 'µg') : null;
}

export function parseExposureHours(text: string) {
  const m = text.match(/\b(?:for|duration|exposure)\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseConditions(text: string) {
  const parts: string[] = [];
  if (/\b37\s*°?\s*c\b/i.test(text)) parts.push('37°C');
  if (/\b5\s*%?\s*(co2|co₂)\b/i.test(text)) parts.push('5% CO₂');
  if (/\b\d+\s*%?\s*(co2|co₂)\b/i.test(text) && !parts.includes('5% CO₂')) {
    const m = text.match(/\b(\d+)\s*%?\s*(co2|co₂)\b/i);
    if (m) parts.push(`${m[1]}% CO₂`);
  }
  return parts.length ? parts.join(', ') : null;
}

export type ParsedCountInputs = {
  rawCount: number | null;
  dilutionFactor: number | null;
  volumeCountedUl: number | null;
  viablePercent: number | null;
  cultureVolumeMl: number | null;
};

export function parseCountInputs(text: string): ParsedCountInputs {
  const t = text;
  const raw =
    t.match(/\braw\s*count\s*[:\-]?\s*(\d+)\b/i) || t.match(/\bcount\s*[:\-]?\s*(\d+)\b/i);
  const dilution =
    t.match(/\b(?:dilution|diluted)\s*(?:factor)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/i) ||
    t.match(/\bdf\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/i);
  const vol =
    t.match(/\b(?:volume\s*counted|counted\s*volume|volume)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:u?l|µl)\b/i) ||
    t.match(/\b(\d+(?:\.\d+)?)\s*(?:u?l|µl)\s*(?:counted)\b/i);
  const viable = t.match(/\b(\d+(?:\.\d+)?)\s*%?\s*(?:viable|viability)\b/i);
  const cultureVol = t.match(/\b(?:culture|total)\s*volume\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*ml\b/i);

  const parseNum = (m: RegExpMatchArray | null) => (m ? Number(m[1]) : null);

  return {
    rawCount: raw ? Number(raw[1]) : null,
    dilutionFactor: parseNum(dilution),
    volumeCountedUl: parseNum(vol),
    viablePercent: parseNum(viable),
    cultureVolumeMl: parseNum(cultureVol),
  };
}

export function parseTreatmentName(text: string) {
  const m = text.match(/\b(?:treated\s+with|treat(?:ment)?\s*[:\-]?)\s*([a-z0-9 _-]{2,40})/i);
  if (!m) return null;
  const candidate = m[1].split(/\b\d/)[0];
  return normalizeWhitespace(candidate);
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export type ParsedObservationNotes = {
  morphology: string | null;
  confluence: number | null;
  contaminationCheck: string | null;
};

/** Fills morphology, confluence %, and contamination from a single notes blob. */
export function parseObservationFromNotes(text: string): ParsedObservationNotes {
  let morphology: string | null = null;
  const morphLabel = text.match(/\bmorphology\s*[:\-]\s*([a-z0-9 ,/-]{2,50})/i);
  if (morphLabel) morphology = normalizeWhitespace(morphLabel[1]);
  else if (/\bmorphology\s*healthy\b/i.test(text) || /\bhealthy\s+morphology\b/i.test(text)) morphology = 'healthy';
  else if (/\bstressed\b/i.test(text)) morphology = 'stressed';
  else if (/\bconfluent\b/i.test(text) && !/\d+\s*%/.test(text)) morphology = 'confluent';
  else if (/\badherent\b/i.test(text)) morphology = 'adherent';

  const confluence = parseConfluence(text);

  let contaminationCheck: string | null = null;
  const contLabel = text.match(/\bcontamination\s*[:\-]\s*([^.;\n]{2,100})/i);
  if (contLabel) contaminationCheck = normalizeWhitespace(contLabel[1]);
  else if (/\bno\s+contamination\b/i.test(text) || /\bcontamination\s+negative\b/i.test(text))
    contaminationCheck = 'Negative';
  else if (/\bcontamination\s+positive\b/i.test(text) || /\bpositive\s+for\s+contamination\b/i.test(text))
    contaminationCheck = 'Positive';
  else if (/\bmycoplasma\s+negative\b/i.test(text)) contaminationCheck = 'Mycoplasma negative';

  return { morphology, confluence, contaminationCheck };
}

export function parseMagnificationFromNotes(text: string): string | null {
  const m =
    text.match(/\b(?:at|magnification)\s+(\d+)\s*x\b/i) ||
    text.match(/\b(\d+)\s*x\s*(?:magnification)?\b/i);
  return m ? `${m[1]}x` : null;
}

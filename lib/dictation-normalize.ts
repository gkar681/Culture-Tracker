/**
 * Post-process speech-to-text (and typed text) for cell-culture / lab vocabulary.
 * Fixes common ASR splits like "He la" → "HeLa" and biases recognition via contextualStrings.
 */

/** Passed to expo-speech-recognition `contextualStrings` to improve on-device recognition. */
export const SPEECH_CONTEXTUAL_STRINGS: readonly string[] = [
  'HeLa',
  'HEK293',
  'HEK293T',
  'CHO',
  'A549',
  'MCF-7',
  'U2OS',
  'Jurkat',
  'K562',
  'DMEM',
  'RPMI',
  'DMEM/F12',
  'FBS',
  'passage',
  'confluence',
  'split ratio',
  'T-75',
  'T-25',
  'microliter',
  'micromolar',
  'viability',
  'mycoplasma',
  'CO2',
  'confluent',
  'fibroblasts',
  'epithelial',
  'endothelial',
  'trypsin',
  'trypsinization',
  'PBS',
  'incubator',
  'centrifuge',
  'supernatant',
  'pellet',
  'resuspend',
  'cryopreservation',
  'thaw',
  'aliquot',
  'DMSO',
];

/**
 * Ordered replacements: more specific patterns first.
 * Uses word boundaries where possible so we do not corrupt normal English.
 */
const PHRASE_REPLACEMENTS: [RegExp, string][] = [
  [/\bHe\s+la\b/gi, 'HeLa'],
  [/\bH\s*E\s*K\s*293\s*T\b/gi, 'HEK293T'],
  [/\bH\s*E\s*K\s*293\b/gi, 'HEK293'],
  [/\bC\s*H\s*O\b/gi, 'CHO'],
  [/\bA\s*549\b/gi, 'A549'],
  [/\bM\s*C\s*F\s*[- ]?\s*7\b/gi, 'MCF-7'],
  [/\bU\s*2\s*O\s*S\b/gi, 'U2OS'],
  [/\bJ\s*u\s*r\s*k\s*a\s*t\b/gi, 'Jurkat'],
  [/\bK\s*562\b/gi, 'K562'],
  [/\bD\s*M\s*E\s*M\s*\/\s*F\s*12\b/gi, 'DMEM/F12'],
  [/\bD\s*M\s*E\s*M\b/gi, 'DMEM'],
  [/\bR\s*P\s*M\s*I\b/gi, 'RPMI'],
  [/\bI\s*M\s*D\s*M\b/gi, 'IMDM'],
  [/\bT\s*-\s*75\b/gi, 'T-75'],
  [/\bT\s*-\s*25\b/gi, 'T-25'],
  [/\bT\s*-\s*150\b/gi, 'T-150'],
  [/\bT\s*-\s*225\b/gi, 'T-225'],
  [/\b6\s*-\s*well\b/gi, '6-well'],
  [/\b96\s*-\s*well\b/gi, '96-well'],
  [/\b24\s*-\s*well\b/gi, '24-well'],
  [/\b5\s*%\s*C\s*O\s*2\b/gi, '5% CO₂'],
  [/\b37\s*°?\s*C\b/gi, '37°C'],
  [/\btrip\s*sin\b/gi, 'trypsin'],
  [/\bpee\s*bee\s*ess\b/gi, 'PBS'],
  [/\bsuper\s*nait\s*ant\b/gi, 'supernatant'],
  [/\bdim\s*so\b/gi, 'DMSO'],
  [/\bd\s*m\s*s\s*o\b/gi, 'DMSO'],
  [/\bcryo\s*preserve\b/gi, 'cryopreserve'],
  [/\bresus\s*pend\b/gi, 'resuspend'],
];

/**
 * Filler words / disfluencies to drop from speech transcripts.
 * Order: multi-word phrases first, then single-word fillers.
 */
const FILLER_PATTERNS: RegExp[] = [
  /\b(you know|i mean|kind of|sort of|you see|let me see)\b/gi,
  /\b(uh+h*|um+m*|erm+|er+m*|ah+h*|hm+m*|mm+m*|m+hmm*)\b/gi,
  /\b(okay|ok)\s+(so|well|um|uh)\b/gi,
];

/** Phrases tiny.en often hallucinates on short clips — safe to drop in lab forms. */
const WHISPER_ARTIFACT_PATTERNS: RegExp[] = [
  /\b(thank you|thanks for watching|please subscribe|subtitles by)\b/gi,
  /\b(transcribed by|amara\.org community)\b/gi,
  /^\s*(thank you\.?|thanks\.?)\s*$/gi,
];

/** Common tiny.en mis-hearings in lab speech. */
const TINY_ASR_FIXES: [RegExp, string][] = [
  [/\bheela\b/gi, 'HeLa'],
  [/\bheck\s*293\b/gi, 'HEK293'],
  [/\bconfluent\s*percent(age)?\b/gi, 'confluence percent'],
  [/\bcell\s*line\s*name\b/gi, 'cell line name'],
];

function tidySpacing(input: string): string {
  let s = input.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+([.,!?;:])/g, '$1');
  s = s.replace(/([.,!?;:])\s*([.,!?;:])+/g, '$1');
  return s;
}

/** Remove ums/uhs and similar. */
export function stripSpeechFillers(input: string): string {
  let s = input;
  for (const re of FILLER_PATTERNS) {
    s = s.replace(re, ' ');
  }
  return tidySpacing(s);
}

/** Strip filler hallucinations common with tiny Whisper on short recordings. */
export function stripWhisperArtifacts(input: string): string {
  let s = input;
  for (const re of WHISPER_ARTIFACT_PATTERNS) {
    s = s.replace(re, ' ');
  }
  // "the the", "and and"
  s = s.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
  return tidySpacing(s);
}

export function normalizeDictationText(input: string): string {
  let s = stripSpeechFillers(input);
  s = stripWhisperArtifacts(s);
  for (const [re, rep] of TINY_ASR_FIXES) {
    s = s.replace(re, rep);
  }
  for (const [re, rep] of PHRASE_REPLACEMENTS) {
    s = s.replace(re, rep);
  }
  return s.trim();
}

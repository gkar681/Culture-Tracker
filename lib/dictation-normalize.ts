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
];

export function normalizeDictationText(input: string): string {
  let s = input;
  for (const [re, rep] of PHRASE_REPLACEMENTS) {
    s = s.replace(re, rep);
  }
  return s;
}

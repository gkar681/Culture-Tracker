import { normalizeDictationText } from './dictation-normalize';

export function parseTimerCommand(text: string): { durationSeconds: number; label: string } | null {
  const t = normalizeDictationText(text);

  // Check for intents: "timer", "set a timer", "incubate", "alarm", "wash", "stain", "block"
  const hasTimerKeyword = /\b(timer|alarm|incubat|stain|blocking|exposure|countdown|wash)\b/i.test(t);
  if (!hasTimerKeyword) return null;

  // Match numbers and time units: e.g. "5 seconds", "10 min", "2 hours"
  const match = t.match(/\b(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)\b/i);
  
  let durationSeconds = 0;
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('s')) {
      durationSeconds = num;
    } else if (unit.startsWith('m')) {
      durationSeconds = num * 60;
    } else if (unit.startsWith('h')) {
      durationSeconds = num * 3600;
    }
  } else {
    // Check for common expressions like "half an hour", "an hour", "a minute"
    if (/\bhalf\s*an?\s*hour\b/i.test(t)) {
      durationSeconds = 1800;
    } else if (/\ban?\s*hour\b/i.test(t)) {
      durationSeconds = 3600;
    } else if (/\ban?\s*minute\b/i.test(t)) {
      durationSeconds = 60;
    } else {
      return null;
    }
  }

  if (durationSeconds <= 0) return null;

  // Extract a label if present, e.g. "for staining" or "for washing"
  let label = 'Incubation';
  const labelMatch = t.match(/\b(?:for|to)\s+([a-z0-9 _-]{3,20})\b/i);
  if (labelMatch) {
    label = labelMatch[1].trim();
    label = label.charAt(0).toUpperCase() + label.slice(1);
  } else if (t.includes('stain')) {
    label = 'Staining';
  } else if (t.includes('block')) {
    label = 'Blocking';
  } else if (t.includes('wash')) {
    label = 'Washing';
  }

  return { durationSeconds, label };
}

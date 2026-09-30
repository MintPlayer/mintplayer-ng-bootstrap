/** Last-resort tips once every letter of a label is taken. */
const FALLBACK_TIPS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0';

const isLetter = (ch: string) => /[A-Z]/.test(ch);
const isVowel = (ch: string) => 'AEIOU'.includes(ch);

/**
 * Deterministic 1-letter KeyTip allocator (FR-12). Tries, in order:
 * 1. the explicit `data-key-tip` (first character, upper-cased);
 * 2. the label's first character, when it is a letter or digit;
 * 3. the label's later consonants;
 * 4. any letter of the label;
 * 5. digits 1-9, then the alphabet, then 0.
 * Returns '?' when all of those are taken. The chosen tip is added to `used`.
 */
export function allocateKeyTip(label: string, explicit: string | null, used: Set<string>): string {
  const normalized = [...(label ?? '').toUpperCase()];
  const first = normalized.slice(0, 1).filter((ch) => /[A-Z0-9]/.test(ch));
  const consonants = normalized.slice(1).filter((ch) => isLetter(ch) && !isVowel(ch));
  const letters = normalized.filter(isLetter);
  const candidates = explicit
    ? [explicit.toUpperCase().slice(0, 1)]
    : [...first, ...consonants, ...letters, ...FALLBACK_TIPS].filter((ch) => !used.has(ch));
  const tip = candidates[0] ?? '?';
  if (tip !== '?') used.add(tip);
  return tip;
}

/**
 * Caret arithmetic for a value that reformats under the user (PRD D10, spike S7).
 *
 * The whole trick is rule 1: a caret is anchored to a DIGIT COUNT, never a string
 * index. Formatting inserts and removes separators anywhere, so indexes are
 * meaningless across a reformat — but the number of digits before the caret is
 * exactly what the user perceives as their position.
 */

const DIGIT = /\d/;

/** How many digits sit before `index` in `text`. */
export function digitsBefore(text: string, index: number): number {
  let count = 0;
  const end = Math.min(index, text.length);
  for (let i = 0; i < end; i++) if (DIGIT.test(text[i])) count++;
  return count;
}

/**
 * The caret index that sits immediately after the `n`-th digit of `text`.
 * `n === 0` is index 0 — BEFORE any leading separator, so Backspace there is a
 * no-op instead of eating a `(` (S7 rule 1).
 */
export function indexAfterDigits(text: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (DIGIT.test(text[i])) {
      seen++;
      if (seen === n) return i + 1;
    }
  }
  return text.length;
}

/**
 * For an intercepted Backspace/Delete over a separator (S7 rule 4): the index of
 * the digit that must die instead, or -1 when there is none in that direction.
 * Without this the browser deletes the separator, the reformat immediately puts
 * it back, and the control is visibly stuck — one keypress, nothing happens.
 */
export function nearestDigitIndex(text: string, from: number, direction: -1 | 1): number {
  let i = direction === -1 ? from - 1 : from;
  while (i >= 0 && i < text.length) {
    if (DIGIT.test(text[i])) return i;
    i += direction;
  }
  return -1;
}

/** `'470 12 34 56'` → `'470123456'`. */
export function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

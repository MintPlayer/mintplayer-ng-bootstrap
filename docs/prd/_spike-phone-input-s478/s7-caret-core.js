// S7 — the caret-preservation core. Pure functions over (string, caretIndex);
// no DOM, so the same code is exercised by the browser rig and could be unit
// tested. This IS the spec M5 has to implement, so it is written to be read.
//
// The invariant: the user's caret is anchored to a DIGIT COUNT, never to a string
// index. Reformatting inserts and removes separators at will; the number of digits
// to the left of the caret is the only thing that survives it.

/** Digits only. */
export const digitsOf = (s) => s.replace(/\D/g, '');

/** How many digits sit to the left of `caret` in `value`. */
export function digitsBefore(value, caret) {
  return digitsOf(value.slice(0, caret)).length;
}

/**
 * The index in `formatted` that sits immediately after its `n`-th digit.
 * n === 0 → index 0 (before everything, not after leading separators: a caret
 * parked left of a leading "(" must stay left of it so Backspace there is a no-op
 * rather than eating the separator).
 */
export function caretAfterDigit(formatted, n) {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === n) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * Reformat + caret placement for a value the browser has ALREADY mutated
 * (the `input` event path). `format` maps a digit string to a display string.
 *
 * `previous` is the state this control last committed. It exists for one case:
 * `<input type="tel">` happily accepts letters and punctuation, so an edit can
 * leave the DIGITS unchanged. Digit-index mapping then legitimately computes a
 * caret for a digit count that never moved, which drifts the caret left across a
 * separator. When nothing digit-wise happened, the previous caret is the answer.
 */
export function reformatWithCaret(value, caret, format, previous) {
  const digits = digitsOf(value);
  if (previous && digits === previous.digits) {
    return { value: previous.value, caret: previous.caret };
  }
  const n = digitsBefore(value, caret);
  const formatted = format(digits);
  return { value: formatted, caret: caretAfterDigit(formatted, n) };
}

/**
 * Backspace / Delete over a formatting character (S7.4).
 *
 * Rule: a deletion must always remove a DIGIT. If the character the key would
 * remove is a separator, the browser's edit is a no-op after reformatting (the
 * separator is re-inserted), so the control feels stuck. We therefore intercept
 * the key, delete the nearest digit in the direction of travel, and reformat.
 *
 * Returns null when the key needs no interception (a digit is adjacent, or the
 * selection is a range — deleting a range always removes digits).
 */
export function deleteAcrossSeparators(value, selStart, selEnd, direction, format) {
  if (selStart !== selEnd) return null; // range delete: let the browser do it
  if (direction === 'backward') {
    if (selStart === 0) return null;
    if (/\d/.test(value[selStart - 1])) return null; // adjacent digit: browser is fine
    // Walk left past separators to the first digit and remove it.
    let i = selStart - 1;
    while (i >= 0 && !/\d/.test(value[i])) i--;
    if (i < 0) return null; // nothing but separators to the left
    const stripped = value.slice(0, i) + value.slice(i + 1);
    const n = digitsBefore(value, i); // digits left of the removed digit
    const formatted = format(digitsOf(stripped));
    return { value: formatted, caret: caretAfterDigit(formatted, n) };
  }
  if (selStart >= value.length) return null;
  if (/\d/.test(value[selStart])) return null;
  let i = selStart;
  while (i < value.length && !/\d/.test(value[i])) i++;
  if (i >= value.length) return null;
  const stripped = value.slice(0, i) + value.slice(i + 1);
  const n = digitsBefore(value, i);
  const formatted = format(digitsOf(stripped));
  return { value: formatted, caret: caretAfterDigit(formatted, n) };
}

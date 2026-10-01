/**
 * Attribute parsing shared by the chart elements' `attributeChangedCallback`s.
 *
 * Each arm used to restate its own `Number(newValue ?? d)` / `!== 'false' &&
 * !== null`, and two failure modes followed: an unparseable number reached the
 * setter as `NaN` (a `y-min="auto"` typo turned the axis into NaN), and a
 * default-ON flag read "attribute removed" as OFF, so clearing a framework
 * binding disabled the feature instead of restoring it.
 */

/** A numeric attribute: removed (`null`) or unparseable falls back to `fallback`. */
export function numberAttribute(value: string | null, fallback: number): number {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** An optional numeric attribute: removed or unparseable reads as `undefined` (unset). */
export function optionalNumberAttribute(value: string | null): number | undefined {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * A boolean attribute with a default: removed restores `defaultValue`, the
 * literal "false" switches it off, any other value (including `""`) switches it on.
 */
export function booleanAttribute(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  return value !== 'false';
}

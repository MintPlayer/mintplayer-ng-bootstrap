/**
 * Proportionally rescale stored panel sizes so they fill `availableSpace`
 * (the container minus dividers and their overlap margins), preserving the
 * ratios between panels.
 *
 * Returns null when there is nothing to do, so the caller writes nothing:
 * - no stored sizes, or they sum to zero or less (no ratio to preserve);
 * - `availableSpace` is not a finite number (a style read failed);
 * - the change is below 1 px. Applying the sizes can itself nudge the
 *   container by a subpixel, and rescaling on that would chase our own writes.
 *
 * A negative `availableSpace` is treated as 0.
 */
export function rescalePanelSizes(stored: readonly number[], availableSpace: number): number[] | null {
  if (stored.length === 0 || !Number.isFinite(availableSpace)) return null;
  const previousTotal = stored.reduce((a, b) => a + b, 0);
  if (!(previousTotal > 0)) return null;
  const target = Math.max(0, availableSpace);
  if (Math.abs(target - previousTotal) < 1) return null;
  const scale = target / previousTotal;
  return stored.map((s) => s * scale);
}

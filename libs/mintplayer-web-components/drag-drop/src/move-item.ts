/**
 * Immutable CDK-parity array helpers. CDK's `moveItemInArray` mutates in place;
 * these return a fresh array instead, which suits signal/`@property` setters that
 * compare by reference. Semantics (clamping, final-index meaning) match CDK so
 * `SortDropEvent` indices are interchangeable with CDK consumers.
 */

const clamp = (value: number, max: number): number => Math.max(0, Math.min(max, value));

/**
 * Move an item to a new index, returning a new array. Indices are clamped to the
 * array bounds (out-of-range never throws — the error is defined out of existence).
 */
export function moveItemInArray<T>(array: readonly T[], fromIndex: number, toIndex: number): T[] {
  const result = array.slice();
  const from = clamp(fromIndex, result.length - 1);
  const to = clamp(toIndex, result.length - 1);
  if (from === to) return result;
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/**
 * Move an item from one array to another, returning fresh copies of both.
 * Declared for future cross-list drags; not yet wired to a UI consumer.
 */
export function transferArrayItem<T>(
  source: readonly T[],
  target: readonly T[],
  fromIndex: number,
  toIndex: number,
): { source: T[]; target: T[] } {
  const src = source.slice();
  const tgt = target.slice();
  if (src.length === 0) return { source: src, target: tgt };
  const from = clamp(fromIndex, src.length - 1);
  const [item] = src.splice(from, 1);
  const to = clamp(toIndex, tgt.length); // target can grow, so clamp to length (append allowed)
  tgt.splice(to, 0, item);
  return { source: src, target: tgt };
}

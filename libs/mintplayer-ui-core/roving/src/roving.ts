export type RovingOrientation = 'vertical' | 'horizontal' | 'both';

/**
 * Index arithmetic for roving navigation, with no DOM and no framework in it.
 *
 * A core keeps its tab stop as an index in its snapshot and asks
 * {@link rovingTarget} where a key moves it; the front renders `tabindex` from
 * the bags and focuses the node the core names. One copy of the wrap/clamp,
 * disabled-skip and RTL rules for every composite widget (PRD #437 D8): the
 * hand-rolled copies had drifted on exactly those.
 *
 * @param count      number of candidate items
 * @param from       current index
 * @param delta      +1 or -1
 * @param wrap       pass the ends, or stop at them
 * @param isDisabled by index, so callers can consult state or attributes
 * @returns the next enabled index, or `-1` when there is nowhere to go
 */
export function nextEnabledIndex(
  count: number,
  from: number,
  delta: 1 | -1,
  wrap: boolean,
  isDisabled: (index: number) => boolean,
): number {
  if (count === 0) return -1;

  let cursor = from;
  for (let attempt = 0; attempt < count; attempt++) {
    cursor += delta;
    if (cursor < 0) {
      if (!wrap) return -1;
      cursor = count - 1;
    } else if (cursor >= count) {
      if (!wrap) return -1;
      cursor = 0;
    }
    if (!isDisabled(cursor)) return cursor;
  }
  return -1;
}

/** First enabled index, or `-1` when every item is disabled. */
export function firstEnabledIndex(count: number, isDisabled: (index: number) => boolean): number {
  for (let i = 0; i < count; i++) {
    if (!isDisabled(i)) return i;
  }
  return -1;
}

/** Last enabled index, or `-1` when every item is disabled. */
export function lastEnabledIndex(count: number, isDisabled: (index: number) => boolean): number {
  for (let i = count - 1; i >= 0; i--) {
    if (!isDisabled(i)) return i;
  }
  return -1;
}

export interface RovingKeyOptions {
  count: number;
  /** The current tab stop. */
  from: number;
  /** Which arrow keys navigate. Default `'vertical'`. */
  orientation?: RovingOrientation;
  /** Wrap past the ends. Default false: clamping is the APG default for grids and trees; menus opt in. */
  wrap?: boolean;
  /** Mirror Left/Right, for a container whose direction is rtl. */
  rtl?: boolean;
  isDisabled?: (index: number) => boolean;
}

/** Modifier state of a key event, so a core never sees a DOM event. */
export interface KeyModifiers {
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

/**
 * Where a key moves the tab stop: the new index, or `null` when the key is not
 * navigation (the caller must then NOT consume it). Browser and OS chords
 * (Alt/Ctrl/Meta + key) are never navigation. A move that cannot happen (the
 * end of a clamped list) still returns `from`, consumed, so an arrow key at the
 * end does not scroll the page.
 */
export function rovingTarget(key: string, options: RovingKeyOptions, modifiers: KeyModifiers = {}): number | null {
  if (modifiers.altKey || modifiers.ctrlKey || modifiers.metaKey) return null;
  const { count, from, orientation = 'vertical', wrap = false, rtl = false } = options;
  if (count === 0) return null;
  const isDisabled = options.isDisabled ?? (() => false);
  const horizontal = orientation !== 'vertical';
  const vertical = orientation !== 'horizontal';
  const step = (delta: 1 | -1): number => {
    const next = nextEnabledIndex(count, from, delta, wrap, isDisabled);
    return next < 0 ? from : next;
  };
  const edge = (index: number): number => (index < 0 ? from : index);

  switch (key) {
    case 'ArrowDown':
      return vertical ? step(1) : null;
    case 'ArrowUp':
      return vertical ? step(-1) : null;
    case 'ArrowRight':
      return horizontal ? step(rtl ? -1 : 1) : null;
    case 'ArrowLeft':
      return horizontal ? step(rtl ? 1 : -1) : null;
    case 'Home':
      return edge(firstEnabledIndex(count, isDisabled));
    case 'End':
      return edge(lastEnabledIndex(count, isDisabled));
    default:
      return null;
  }
}

/**
 * APG type-to-select: the next enabled item, after `from` and wrapping, whose
 * label starts with `char` (case- and accent-insensitive). `-1` when none does,
 * or when `char` is not a single printable character.
 */
export function matchByLetter(
  labels: readonly string[],
  from: number,
  char: string,
  isDisabled: (index: number) => boolean = () => false,
): number {
  if ([...char].length !== 1 || char.trim() === '') return -1;
  const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  const wanted = fold(char);
  const count = labels.length;
  const order = Array.from({ length: count }, (_, i) => (from + 1 + i) % count);
  return order.find((i) => !isDisabled(i) && fold(labels[i].trimStart()).startsWith(wanted)) ?? -1;
}

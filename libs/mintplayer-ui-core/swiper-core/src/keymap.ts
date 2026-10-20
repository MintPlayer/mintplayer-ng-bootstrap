import { SwipeIntent, SwipeOrientation } from './models';

/**
 * Orientation-aware key → intent table (APG carousel/slider keys). Returns
 * `null` for keys the consumer must NOT preventDefault() — a cross-axis arrow
 * still scrolls the page.
 */
const KEYMAP: Record<SwipeOrientation, Readonly<Record<string, SwipeIntent>>> = {
  horizontal: {
    ArrowLeft: 'previous',
    ArrowRight: 'next',
    Home: 'first',
    End: 'last',
  },
  vertical: {
    ArrowUp: 'previous',
    ArrowDown: 'next',
    Home: 'first',
    End: 'last',
  },
};

export function keyToIntent(key: string, orientation: SwipeOrientation): SwipeIntent | null {
  return KEYMAP[orientation][key] ?? null;
}

/**
 * Bootstrap's colour names, shared by every core that takes a `color` input
 * (#458: the Angular `Color` enum is gone; every front passes the name).
 */

/** The eight theme colours: Bootstrap has `text-bg-*`, `border-*`, `alert-*` … for each. */
export const THEME_COLORS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'] as const;

/** The theme colours plus the three surfaces Bootstrap has no `text-bg-*` for. */
export const COLORS = [...THEME_COLORS, 'body', 'white', 'transparent'] as const;

export type ThemeColor = (typeof THEME_COLORS)[number];
export type BsColor = (typeof COLORS)[number];

export function isThemeColor(value: string | null | undefined): value is ThemeColor {
  return value != null && (THEME_COLORS as readonly string[]).includes(value);
}

export function isColor(value: string | null | undefined): value is BsColor {
  return value != null && (COLORS as readonly string[]).includes(value);
}

/**
 * Background classes for a filled surface. Bootstrap's `text-bg-*` pairs each
 * theme colour with the text colour color-contrast() picks (white on warning
 * was 1.63:1 with `bg-*` alone); `body` and `white` pair a background utility
 * with a contrasting text colour; `transparent` only clears the background.
 * An unknown name yields nothing.
 */
export function fillClasses(color: string | null | undefined): string[] {
  if (!isColor(color)) return [];
  switch (color) {
    case 'body':
      return ['bg-body', 'text-body'];
    case 'white':
      return ['bg-white', 'text-black'];
    case 'transparent':
      return ['bg-transparent'];
    default:
      return [`text-bg-${color}`];
  }
}

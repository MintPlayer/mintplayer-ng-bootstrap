/**
 * The card has no machine (PRD #437 §8, wave A): every front renders plain
 * Bootstrap card markup and the page baseline styles it. What the four fronts
 * share is the mapping from the public `color` / `outline` / `position`
 * inputs to Bootstrap classes, so it lives here once.
 */

/**
 * Registry key of the card sheet (styles/card.scoped.scss), which gives the
 * Angular part hosts a block display of their own (#452).
 */
export const CARD_SCOPE = 'card';

/** The colour names a card, header or footer accepts. */
export const CARD_COLORS = [
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
  'light',
  'dark',
  'body',
  'white',
  'transparent',
] as const;

export type CardColor = (typeof CARD_COLORS)[number];

export type CardImagePosition = 'top' | 'bottom' | 'overlay';

const THEME_COLORS: readonly string[] = CARD_COLORS.slice(0, 8);

export function isCardColor(value: string | null | undefined): value is CardColor {
  return value != null && (CARD_COLORS as readonly string[]).includes(value);
}

/**
 * Background classes for a filled surface. Bootstrap has `text-bg-*` for the
 * theme colours only; `body`, `white` and `transparent` pair a background
 * utility with a contrasting text colour.
 */
function fillClasses(color: CardColor): string[] {
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

/**
 * Classes for the card root, beside `card` itself. A filled card takes the
 * colour as its background and border; an outline card keeps a transparent
 * background, follows the surrounding text and colours only its border.
 */
export function cardColorClasses(color: string | null | undefined, outline = false): string[] {
  if (!isCardColor(color)) return [];
  const border = THEME_COLORS.includes(color) || color === 'white' ? [`border-${color}`] : [];
  return outline ? ['bg-transparent', ...border] : [...fillClasses(color), ...border];
}

/** Classes for a header or footer cap. */
export function capColorClasses(color: string | null | undefined): string[] {
  return isCardColor(color) ? fillClasses(color) : [];
}

/** The Bootstrap class an image carries for its position. */
export function cardImgClass(position: CardImagePosition = 'top'): string {
  switch (position) {
    case 'overlay':
      return 'card-img';
    case 'bottom':
      return 'card-img-bottom';
    default:
      return 'card-img-top';
  }
}

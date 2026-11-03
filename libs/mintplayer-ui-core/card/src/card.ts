import { COLORS, fillClasses, isColor, isThemeColor, type BsColor } from '@mintplayer/ui-core/color';
import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * The card group (#458 M4, one D10 source): `card`, its caps, body, texts,
 * image, link and `card-group`. Every core is presentational: it maps the
 * public `color` / `outline` / `position` / `level` inputs to Bootstrap's
 * classes and ARIA, and each front renders Bootstrap's own card markup, which
 * the card part (#452) styles with JS off.
 */

/** The colour names a card, header or footer accepts. */
export const CARD_COLORS = COLORS;

export type CardColor = BsColor;

export type CardImagePosition = 'top' | 'bottom' | 'overlay';

export const isCardColor = isColor;

/**
 * Classes for the card root, beside `card` itself. A filled card takes the
 * colour as its background and border; an outline card keeps a transparent
 * background, follows the surrounding text and colours only its border.
 */
export function cardColorClasses(color: string | null | undefined, outline = false): string[] {
  if (!isCardColor(color)) return [];
  const border = isThemeColor(color) || color === 'white' ? [`border-${color}`] : [];
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

const join = (classes: readonly (string | false | null | undefined)[]): string => classes.filter(Boolean).join(' ');

/** The bag every single-node part of the card renders: its root. */
export interface CardPartProps {
  readonly root: CoreBag;
}

// ---------------------------------------------------------------- card

export interface CardInputs {
  /** Card colour; filled by default, border-only with `outline`. */
  color: CardColor | null;
  /** Colour the border only. */
  outline: boolean;
}

export function connectCard(inputs: CardInputs): CoreBag {
  return { class: join(['card', ...cardColorClasses(inputs.color, !!inputs.outline)]) };
}

export const cardCore = defineCore<CardInputs, object, CardPartProps>({
  view: ({ inputs }) => ({ root: connectCard(inputs) }),
});

// ---------------------------------------------------------------- caps

export interface CardCapInputs {
  /** Cap colour: a fill, no border. */
  color: CardColor | null;
}

export function connectCardCap(kind: 'header' | 'footer', inputs: CardCapInputs): CoreBag {
  return { class: join([`card-${kind}`, ...capColorClasses(inputs.color)]) };
}

/** A header cap. A nav inside it takes Bootstrap's `card-header-tabs` / `-pills` (the nav's `cardHeader`). */
export const cardHeaderCore = defineCore<CardCapInputs, object, CardPartProps>({
  view: ({ inputs }) => ({ root: connectCardCap('header', inputs) }),
});

export const cardFooterCore = defineCore<CardCapInputs, object, CardPartProps>({
  view: ({ inputs }) => ({ root: connectCardCap('footer', inputs) }),
});

// ---------------------------------------------------------------- plain parts

const plainPart = (className: string) =>
  defineCore<object, object, CardPartProps>({ view: () => ({ root: { class: className } }) });

export const cardBodyCore = plainPart('card-body');
export const cardSubtitleCore = plainPart('card-subtitle');
export const cardTextCore = plainPart('card-text');
/** Cards side by side with joined borders: Bootstrap's `.card-group > .card` rules. */
export const cardGroupCore = plainPart('card-group');

// ---------------------------------------------------------------- title

export interface CardTitleInputs {
  /** Heading level in the page outline. Defaults to 5, matching Bootstrap's visual h5. */
  level: number;
}

/**
 * `role=heading` + `aria-level` rather than a real `h1`–`h6`: the tag cannot
 * change at runtime without destroying projected content, and the pair is
 * exactly equivalent in the accessibility tree.
 */
export function connectCardTitle(inputs: CardTitleInputs): CoreBag {
  return { class: 'card-title', role: 'heading', 'aria-level': String(inputs.level ?? 5) };
}

export const cardTitleCore = defineCore<CardTitleInputs, object, CardPartProps>({
  view: ({ inputs }) => ({ root: connectCardTitle(inputs) }),
});

// ---------------------------------------------------------------- image

export interface CardImgInputs {
  /** Where the image sits: `top`, `bottom`, or `overlay` behind the content. */
  position: CardImagePosition;
  src: string | null;
  /** The image's text alternative. Absent means decorative (`alt=""`), never unlabelled. */
  alt: string | null;
}

export interface CardImgView {
  /** A block box carrying the position class, so `.card-group > .card > .card-img-top` corner rules match. */
  readonly root: CoreBag;
  readonly img: CoreBag;
  /** The image URL, bound by the template itself: bags never carry a URL (the fronts' prop setters refuse one). */
  readonly src: string | undefined;
  /** `card-img-overlay` around the content; null unless `overlay`. */
  readonly overlay: CoreBag | null;
}

export function connectCardImg(inputs: CardImgInputs): CardImgView {
  const position = inputs.position ?? 'top';
  const positionClass = cardImgClass(position);
  return {
    root: { class: `${positionClass} card-img-box` },
    // The <img> carries the class too, so Bootstrap's `width: 100%` sizes the image itself.
    img: { class: positionClass, alt: inputs.alt ?? '' },
    src: inputs.src ?? undefined,
    overlay: position === 'overlay' ? { class: 'card-img-overlay' } : null,
  };
}

export const cardImgCore = defineCore<CardImgInputs, object, { view: CardImgView }>({
  view: ({ inputs }) => ({ view: connectCardImg(inputs) }),
});

// ---------------------------------------------------------------- link

export interface CardLinkInputs {
  href: string | null;
}

export interface CardLinkView {
  /** Carries `card-link` so Bootstrap's `.card-link + .card-link` spacing matches sibling links. */
  readonly root: CoreBag;
  /** The link itself; `card-link` here gives it Bootstrap's hover rule. */
  readonly link: CoreBag;
  /** Bound by the template itself: bags never carry a URL. `undefined` renders no attribute. */
  readonly href: string | undefined;
}

export function connectCardLink(inputs: CardLinkInputs): CardLinkView {
  return { root: { class: 'card-link' }, link: { class: 'card-link' }, href: inputs.href ?? undefined };
}

export const cardLinkCore = defineCore<CardLinkInputs, object, { view: CardLinkView }>({
  view: ({ inputs }) => ({ view: connectCardLink(inputs) }),
});

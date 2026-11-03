import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's nav (`.nav`, `.nav-item`, `.nav-link`) as a D10 group (#452): the
 * component ships the `nav` part, so raw `<ul class="nav">` markup needs no
 * page-wide install. The links are the consumer's own `<a>`s (a router link
 * included); each front marks an item's link as a `.nav-link` of this scope:
 * Angular `BsNavLinkDirective`, React and Vue the item's `Children` extension,
 * Lit its `children` extension.
 */

/** The class every front writes on a nav item's link. */
export const NAV_LINK_CLASS = 'nav-link';

export type NavVariant = 'tabs' | 'pills' | 'underline';

export interface NavInputs {
  /** `nav-tabs`, `nav-pills` or `nav-underline`; `null` is the plain nav. */
  variant: NavVariant | null;
  /** The items fill the width (`nav-fill`). */
  fill: boolean;
  /** The items fill the width in equal parts (`nav-justified`). */
  justified: boolean;
  /** Tabs or pills in a card header (`card-header-tabs` / `-pills`, which the card ships). */
  cardHeader: boolean;
}

export interface NavProps {
  root: CoreBag;
}

export function connectNav(inputs: NavInputs): CoreBag {
  const { variant, fill, justified, cardHeader } = inputs;
  const headerVariant = cardHeader && (variant === 'tabs' || variant === 'pills') ? `card-header-${variant}` : null;
  return { class: ['nav', variant && `nav-${variant}`, fill && 'nav-fill', justified && 'nav-justified', headerVariant].filter(Boolean).join(' ') };
}

export const navCore = defineCore<NavInputs, object, NavProps>({
  view: ({ inputs }) => ({ root: connectNav(inputs) }),
});

export const navItemCore = defineCore<object, object, NavProps>({
  view: () => ({ root: { class: 'nav-item' } }),
});

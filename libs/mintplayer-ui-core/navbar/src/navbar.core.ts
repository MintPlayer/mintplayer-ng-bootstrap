import { defineContext, defineCore } from '@mintplayer/ui-core/component';
import {
  attachNavbar,
  connectNavbar,
  connectNavbarBrand,
  connectNavbarContents,
  connectNavbarDropdown,
  connectNavbarItem,
  connectNavbarNav,
  setNavbarExpanded,
  type NavbarBag,
  type NavbarBreakpoint,
  type NavbarDropdownView,
  type NavbarExpandedChangeEventDetail,
  type NavbarLabels,
  type NavbarView,
} from './navbar';

/**
 * The navbar group's cores (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `navbar.component.ts` is their manifest and
 * `templates/` their markup.
 */

/** How many dropdowns a node is authored inside: -1 for none. */
export interface NavbarNesting {
  readonly depth: number;
}

export const NAVBAR_NESTING = defineContext<NavbarNesting>('navbar-nesting', { depth: -1 });

const BREAKPOINTS = new Set<string>(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
const BRAND = connectNavbarBrand();
const CONTENTS = connectNavbarContents();

export interface NavbarInputs {
  /** Bootstrap breakpoint the navbar expands at (`xs`…`xxl`); it collapses below it. */
  breakpoint: NavbarBreakpoint;
  /** Background: a theme color (`primary`…`dark`) or adaptive `body` / `body-secondary` / `body-tertiary`. */
  color?: string | null;
  /** Whether the collapse is expanded (narrow mode). Written through when it changes. */
  expanded: boolean;
  /** `fixed` pins the bar to the top of the viewport, full width; omit for in-flow. */
  positioning?: 'fixed' | null;
  /** Localized accessible names; an `aria-label` on the component names the landmark too. */
  labels?: Partial<NavbarLabels> | null;
}

export interface NavbarState {
  /** The live collapse state: the input, until the user toggles the checkbox. */
  expanded: boolean;
}

export interface NavbarEvents {
  expandedChange: NavbarExpandedChangeEventDetail;
}

export interface NavbarProps {
  view: NavbarView;
  brand: NavbarBag;
}

export interface NavbarMethods {
  /** Opens or closes the collapse (flips it without an argument), and reports it. */
  toggle(force?: boolean): void;
}

export const navbarCore = defineCore<NavbarInputs, NavbarState, NavbarProps, NavbarEvents, undefined, undefined, NavbarMethods>({
  state: (inputs) => ({ expanded: inputs.expanded }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectNavbar({
      id,
      breakpoint: BREAKPOINTS.has(inputs.breakpoint) ? inputs.breakpoint : 'md',
      color: inputs.color,
      positioning: inputs.positioning,
      expanded: state.expanded,
      hydrated,
      labels: { ...(label ? { nav: label } : {}), ...(inputs.labels ?? {}) },
    }),
    brand: BRAND,
  }),
  attach: (api) =>
    attachNavbar(api.host, {
      onExpandedChange: (expanded) => {
        api.setState({ expanded });
        api.emit('expandedChange', { expanded });
      },
    }),
  // The bag only seeds the checkbox; a changed input must also reach one the
  // user already flipped, whose `checked` attribute no longer applies.
  inputsChanged: (api, prev) => {
    const { expanded } = api.inputs();
    if (expanded !== prev.expanded && setNavbarExpanded(api.host, expanded) !== null) api.setState({ expanded });
  },
  methods: {
    /** Opens or closes the collapse (flips it without an argument), and reports it. */
    toggle: (api, force?: boolean) => {
      const next = force ?? !api.state().expanded;
      if (setNavbarExpanded(api.host, next) === null) return;
      api.setState({ expanded: next });
      api.emit('expandedChange', { expanded: next });
    },
  },
});

export interface NavbarNavInputs {
  /** `end` pushes the group to the far side when the bar is wide. */
  align: 'start' | 'end';
}

export const navbarNavCore = defineCore<NavbarNavInputs, object, { bag: NavbarBag }>({
  view: ({ inputs }) => ({ bag: connectNavbarNav(inputs.align) }),
});

export interface NavbarItemInputs {
  /** Marks the current page (`aria-current`). */
  active: boolean;
  disabled: boolean;
}

export const navbarItemCore = defineCore<NavbarItemInputs, object, { bag: NavbarBag }, Record<never, never>, NavbarNesting>({
  consume: NAVBAR_NESTING,
  view: ({ inputs, context }) => ({
    bag: connectNavbarItem({ inMenu: context.depth >= 0, active: inputs.active, disabled: inputs.disabled }),
  }),
});

export interface NavbarDropdownInputs {
  /** The trigger text; the `label` slot replaces it with rich content. */
  label?: string | null;
  /** A descendant link's route is active (Angular derives it from the router). */
  active: boolean;
}

export const navbarDropdownCore = defineCore<
  NavbarDropdownInputs,
  object,
  { view: NavbarDropdownView; label?: string },
  Record<never, never>,
  NavbarNesting,
  NavbarNesting
>({
  consume: NAVBAR_NESTING,
  provides: NAVBAR_NESTING,
  view: ({ inputs, context }) => ({
    view: connectNavbarDropdown({ depth: context.depth + 1, active: inputs.active }),
    label: inputs.label ?? undefined,
  }),
  // Angular's and Lit's own host element sits around the <details>: out of the layout.
  host: () => CONTENTS,
  provide: ({ context }) => ({ depth: context.depth + 1 }),
});

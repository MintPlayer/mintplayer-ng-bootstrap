import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { h, type Component } from 'vue';

import { mountWrapper } from './behaviour/harness';

/**
 * The Vue half of the wrapper-transparency guard (Angular:
 * `mintplayer-ng-bootstrap/_conformance/aria-passthrough.spec.ts`, React:
 * `mintplayer-react-bootstrap/_conformance/attribute-passthrough.spec.tsx`).
 *
 * Vue is the framework where transparency holds **by construction**: a
 * non-prop attribute lands on the single root element automatically, and every
 * wrapper that opts out with `inheritAttrs: false` re-binds `v-bind="$attrs"` on
 * its `mp-*` root. The audit measured 47/48 correct, and the 48th (the navbar
 * `ariaLabel` ordering concern) was disproven by a spike — Vue normalises
 * kebab-case attributes onto declared camelCase props, so a same-named prop and
 * attribute are one channel, not two.
 *
 * Two halves, each catching what the other cannot:
 *
 *  1. Statically: every SFC that declares `inheritAttrs: false` must contain
 *     `v-bind="$attrs"`. Forgetting either half is the only way a Vue wrapper
 *     can silently stop forwarding, and a new wrapper that forgets fails here.
 *  2. At runtime, **every** SFC (PRD P2-D3). This used to mount five
 *     representatives and trust the static rule for the rest — but a
 *     `v-bind="$attrs"` on the WRONG element of a multi-root SFC (the accordion
 *     item's header `<span>` rather than its `<mp-accordion-tab>`, the card
 *     image's overlay `<div>` rather than its `<img>`) satisfies the static rule
 *     and forwards to the wrong node. Each SFC is now mounted and the probe must
 *     land on exactly the element named below, and on nothing outside it.
 *
 * Mounting every SFC is also what makes the Vue coverage figure honest: v8
 * counts a `.vue` file only once it is compiled and executed, so before this
 * sweep 43 of 56 SFCs reported no lines at all and the percentage covered only
 * the wrappers some spec happened to import (PRD F22).
 */

// Vite resolves the globs at transform time; `query: '?raw'` keeps the SFC as text.
// Both depths are swept: `<entry>/src/*.vue` and the namespaced
// `<namespace>/<entry>/src/*.vue` (charts/), or a whole namespace would opt out
// of the invariant below by being invisible to it.
const SFC_SOURCES = {
  ...(import.meta.glob('../*/src/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
  ...(import.meta.glob('../*/*/src/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
};

/** The same files, compiled — keyed by SFC name (`BsCheckbox`). */
const SFC_COMPONENTS: Record<string, Component> = Object.fromEntries(
  Object.entries({
    ...(import.meta.glob('../*/src/*.vue', { import: 'default', eager: true }) as Record<string, Component>),
    ...(import.meta.glob('../*/*/src/*.vue', { import: 'default', eager: true }) as Record<string, Component>),
  }).map(([path, component]) => [path.split('/').pop()!.replace(/\.vue$/, ''), component]),
);

describe('Vue wrapper attribute passthrough — the invariant, statically', () => {
  it('found the wrapper sources at all', () => {
    // Guards the glob itself: a path change that silences the sweep must fail
    // loudly, not pass an empty loop.
    expect(Object.keys(SFC_SOURCES).length).toBeGreaterThanOrEqual(40);
  });

  it('every inheritAttrs:false wrapper re-binds v-bind="$attrs"', () => {
    const offenders = Object.entries(SFC_SOURCES)
      .filter(([, source]) => source.includes('inheritAttrs: false'))
      .filter(([, source]) => !source.includes('v-bind="$attrs"'))
      .map(([path]) => path);

    expect(offenders, 'these SFCs opt out of automatic forwarding and forward nothing').toEqual([]);
  });
});

/** SFC name → CSS selector of the element a consumer's attributes must land on. */
const TARGETS: Record<string, string> = {
  BsAccordion: 'mp-accordion',
  BsAccordionItem: 'mp-accordion-tab',
  BsCalendar: 'mp-calendar',
  BsCard: 'mp-card',
  BsCardBody: 'div.card-body',
  BsCardFooter: 'div.card-footer',
  BsCardGroup: 'div.card-group',
  BsCardHeader: 'div.card-header',
  BsCardImg: 'img.card-img-top',
  BsCardLink: 'a.card-link',
  BsCardSubtitle: 'div.card-subtitle',
  BsCardText: 'div.card-text',
  BsCardTitle: 'div.card-title',
  BsCarousel: 'mp-carousel',
  BsHierarchyChart: 'mp-hierarchy-chart',
  BsSparkline: 'mp-sparkline',
  BsTrendChart: 'mp-trend-chart',
  BsCheckbox: 'mp-checkbox',
  BsCodeSnippet: 'mp-code-snippet',
  BsDatatable: 'mp-datatable',
  BsDatepicker: 'mp-datepicker',
  BsDatetimePicker: 'mp-datetime-picker',
  BsDockManager: 'mint-dock-manager',
  BsDropdownDivider: 'li.dropdown-divider',
  BsDropdownHeader: 'li.dropdown-header',
  BsDropdownItem: 'li.dropdown-item',
  BsDropdownMenu: 'mp-dropdown-menu',
  BsFileManager: 'mp-file-manager',
  BsInputGroup: 'mp-input-group',
  BsMultiRange: 'mp-multi-range',
  BsNavbar: 'mp-navbar',
  BsNavbarBrand: 'mp-navbar-brand',
  BsNavbarDropdown: 'mp-navbar-dropdown',
  BsNavbarItem: 'mp-navbar-item',
  BsOtpInput: 'mp-otp-input',
  BsPagination: 'mp-pagination',
  BsPhoneInput: 'mp-phone-input',
  BsQueryBuilder: 'mp-query-builder',
  BsRadio: 'mp-radio',
  BsRadioGroup: 'mp-radio-group',
  BsRibbon: 'mp-ribbon',
  BsScheduler: 'mp-scheduler',
  BsSelect: 'mp-select',
  BsShell: 'mp-shell',
  BsSignaturePad: 'mp-signature-pad',
  BsSplitter: 'mp-splitter',
  BsTabControl: 'mp-tab-control',
  BsThemeToggle: 'mp-theme-toggle',
  BsTileManager: 'mp-tile-manager',
  BsTimeline: 'mp-timeline',
  BsTimelineItem: 'mp-timeline-item',
  BsTimeList: 'mp-time-list',
  BsTimepicker: 'mp-timepicker',
  BsToggleButton: 'mp-toggle-button',
  BsTreeSelect: 'mp-tree-select',
  BsTreeview: 'mp-treeview',
};

/**
 * Children that must NOT be the probe's destination: the multi-root and
 * child-bearing SFCs render a sibling or descendant that `v-bind="$attrs"` could
 * mistakenly land on. Rendered with default-slot content so those nodes exist.
 */
const slots = { default: () => h('span', { class: 'slot-content' }, 'content') };

const PROBE = { 'aria-label': 'probe-name', 'data-probe': 'x', id: 'probe-id' };

const CASES = Object.entries(TARGETS).map(([name, target]) => ({ name, target }));

/* jsdom has no ResizeObserver, and several elements (datatable, tree-select,
   treeview) construct one on connect. An inert stand-in lets them mount;
   nothing here depends on a resize ever being observed. */
const originalResizeObserver = globalThis.ResizeObserver;
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe(): void { /* inert */ }
    unobserve(): void { /* inert */ }
    disconnect(): void { /* inert */ }
  } as unknown as typeof ResizeObserver;
});
afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

describe('Vue wrapper attribute passthrough — every SFC, at runtime', () => {
  it('has a target for every SFC, and every target names a real SFC', () => {
    // A new SFC with no entry here fails, so it cannot ship unguarded.
    expect(Object.keys(SFC_COMPONENTS).filter((name) => !TARGETS[name]), 'SFCs with no passthrough case').toEqual([]);
    expect(Object.keys(TARGETS).filter((name) => !SFC_COMPONENTS[name]), 'cases for SFCs that do not exist').toEqual([]);
  });

  it.each(CASES)('$name forwards consumer attributes to $target', ({ name, target }) => {
    const wrapper = mountWrapper(SFC_COMPONENTS[name], { attrs: PROBE, slots });
    const host: HTMLElement = (wrapper.element as Node).parentElement ?? document.body;
    const el = host.querySelector<HTMLElement>(target);

    expect(el, `${target} was not rendered by ${name}`).not.toBeNull();
    expect(el!.getAttribute('aria-label')).toBe('probe-name');
    expect(el!.getAttribute('data-probe')).toBe('x');
    expect(el!.id).toBe('probe-id');
    // Nothing outside the target carries the probe too. The target's own
    // descendants are excluded: a light-tier element mirrors its host label onto
    // the inner role-bearing node it renders.
    const outside = [...host.querySelectorAll('[data-probe]')].filter((node) => node !== el && !el!.contains(node));
    expect(outside, `${name} also forwarded the probe to a node outside ${target}`).toEqual([]);
  });
});

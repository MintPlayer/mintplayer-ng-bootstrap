import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import { BsCalendar } from '@mintplayer/react-bootstrap/calendar';
import {
  BsCard,
  BsCardBody,
  BsCardFooter,
  BsCardGroup,
  BsCardHeader,
  BsCardImg,
  BsCardLink,
  BsCardSubtitle,
  BsCardText,
  BsCardTitle,
} from '@mintplayer/react-bootstrap/card';
import { BsCarousel, BsCarouselItem } from '@mintplayer/react-bootstrap/carousel';
import { BsHierarchyChart } from '@mintplayer/react-bootstrap/charts/hierarchy';
import { BsSparkline } from '@mintplayer/react-bootstrap/charts/sparkline';
import { BsTrendChart } from '@mintplayer/react-bootstrap/charts/trend';
import { BsCheckbox } from '@mintplayer/react-bootstrap/checkbox';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';
import { BsDatetimePicker } from '@mintplayer/react-bootstrap/datetime-picker';
import { BsDockManager } from '@mintplayer/react-bootstrap/dock';
import {
  BsDropdownDivider,
  BsDropdownHeader,
  BsDropdownItem,
  BsDropdownMenu,
} from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsFileManager } from '@mintplayer/react-bootstrap/file-manager';
import { BsInputGroup } from '@mintplayer/react-bootstrap/input-group';
import { BsMultiRange } from '@mintplayer/react-bootstrap/multi-range';
import { BsNavbar, BsNavbarDropdown, BsNavbarItem, BsNavbarNav } from '@mintplayer/react-bootstrap/navbar';
import { BsOtpInput } from '@mintplayer/react-bootstrap/otp-input';
import { BsPagination } from '@mintplayer/react-bootstrap/pagination';
import { BsPhoneInput } from '@mintplayer/react-bootstrap/phone-input';
import { BsQueryBuilder } from '@mintplayer/react-bootstrap/query-builder';
import { BsRadio } from '@mintplayer/react-bootstrap/radio';
import { BsRadioGroup } from '@mintplayer/react-bootstrap/radio-group';
import {
  BsQuickAccessToolbar,
  BsRibbon,
  BsRibbonButton,
  BsRibbonCheckBox,
  BsRibbonColorPicker,
  BsRibbonComboBox,
  BsRibbonContextualTabSet,
  BsRibbonDropdownButton,
  BsRibbonGallery,
  BsRibbonGalleryItem,
  BsRibbonGroup,
  BsRibbonGroupButton,
  BsRibbonMenuItem,
  BsRibbonMenuSeparator,
  BsRibbonSplitButton,
  BsRibbonTab,
  BsRibbonTemplateItem,
  BsRibbonToggleButton,
} from '@mintplayer/react-bootstrap/ribbon';
import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';
import { BsSelect } from '@mintplayer/react-bootstrap/select';
import { BsShell } from '@mintplayer/react-bootstrap/shell';
import { BsSignaturePad } from '@mintplayer/react-bootstrap/signature-pad';
import { BsSplitter, BsSplitterPanel } from '@mintplayer/react-bootstrap/splitter';
import { BsTabControl, BsTabPage } from '@mintplayer/react-bootstrap/tab-control';
import { BsThemeToggle } from '@mintplayer/react-bootstrap/theming';
import { BsTileManager } from '@mintplayer/react-bootstrap/tile-manager';
import { BsTimeline, BsTimelineItem } from '@mintplayer/react-bootstrap/timeline';
import { BsTimeList, BsTimepicker } from '@mintplayer/react-bootstrap/timepicker';
import { BsToggleButton } from '@mintplayer/react-bootstrap/toggle-button';
import { BsTreeSelect } from '@mintplayer/react-bootstrap/tree-select';
import { BsTypeahead } from '@mintplayer/react-bootstrap/typeahead';
import { BsTreeview } from '@mintplayer/react-bootstrap/treeview';

/**
 * The React half of the wrapper-transparency guard. Its Angular counterpart is
 * `libs/mintplayer-ng-bootstrap/_conformance/aria-passthrough.spec.ts`, and this
 * lives in `_conformance/` for the same reason: the folder has no `src/index.ts`, so
 * `vite.config.mts`'s entry discovery ignores it and it can never be published.
 *
 * **Two defects, and one test kind cannot see both.** The compile-time half —
 * whether `role`/`id`/`tabIndex` are *accepted* by the props type — is
 * `attribute-passthrough.types.tsx`, checked by `tsc --noEmit`. This file is the
 * runtime half: whether the attributes actually reach the custom element. They are
 * independent failures. `BsTimeline` and `BsAccordionItem` destructure every prop
 * they know and never spread the remainder, so a consumer's attributes are dropped
 * on the floor *even if* the types were widened to allow them.
 *
 * **The probe covers `aria-label` AND the bare names `role`/`id`/`tabIndex`.**
 * It did not always: these three used to read back `null` here, and the file
 * carried a long note saying jsdom could not observe `@lit/react`'s
 * element-property path. That diagnosis was wrong. `@lit/react` publishes two
 * builds, and its `node` export condition compiles the property/event runtime
 * away entirely (it exists for `@lit/ssr-react`, which sets properties on the
 * server instead). Vitest resolves dependencies through the SSR pipeline, so it
 * picked the node build even under `environment: 'jsdom'` — nothing was
 * applied, for any wrapper, and it looked like a jsdom limitation because it
 * was uniform. `vite.config.mts` now pins the browser build for tests, and all
 * four attributes arrive exactly as they do in Chromium.
 *
 * The bare names are the ones that matter most. TypeScript exempts hyphenated
 * JSX attribute names from excess-property checking, so an `aria-*`-only probe
 * compiles against a props type that rejects everything else — which is how the
 * original audit reported these wrappers as fine. `aria-label` still earns its
 * place: it is the one name that can never be captured by a declared prop, so
 * it proves the rest-spread independently of any prototype lookup.
 *
 * **Every exported wrapper, not a sample (PRD P2-D11).** This used to cover the 16
 * wrappers the ARIA audit touched. The one-line `createComponent` wrappers forward
 * by construction, but "by construction" is exactly the claim the audit got wrong
 * for `BsTimeline` and `BsAccordionItem`, so each one is now rendered and read
 * back. The plain-element helpers (`BsCard*`, `BsDropdownItem/Header/Divider`) are
 * included too: they render a light-DOM `div`/`li`/`img`/`a` rather than an `mp-*`
 * element, and the same rule applies to that element. The completeness check at
 * the bottom enumerates the published entry points, so a new wrapper without a
 * case here fails rather than going unguarded.
 */

const PROBE = { 'aria-label': 'probe-name', role: 'none', id: 'probe-id', tabIndex: -1 } as const;

interface Case {
  name: string;
  /** CSS selector of the element that must receive the consumer's attributes. */
  target: string;
  render: (probe: Record<string, unknown>) => React.ReactElement;
  /**
   * Set when the target's role is part of the component's contract and a
   * consumer role must NOT override it: a headless-core front whose
   * role-bearing node is a combobox input (#436). Everything else in the probe
   * must still arrive.
   */
  fixedRole?: string;
  /**
   * Set when the target is a box around the role-bearing node, which is what
   * `aria-label` names: the sparkline's sized span holds a role=img svg.
   */
  labelTarget?: string;
}

/** A case whose wrapper can be rendered bare, with nothing but the probe. */
const bare = (name: string, target: string, Component: React.ElementType): Case => ({
  name,
  target,
  render: (p) => <Component {...p} />,
});

/** Every exported React wrapper, and the element its attributes must land on. */
const CASES: Case[] = [
  bare('BsAccordion', 'div.accordion', BsAccordion),
  {
    name: 'BsAccordionItem',
    target: 'details.accordion-item',
    render: (p) => (
      <BsAccordion>
        <BsAccordionItem header="Header" {...p} />
      </BsAccordion>
    ),
  },
  bare('BsCalendar', 'div.mp-calendar', BsCalendar),
  bare('BsCard', 'div.card', BsCard),
  bare('BsCardBody', 'div.card-body', BsCardBody),
  bare('BsCardFooter', 'div.card-footer', BsCardFooter),
  bare('BsCardGroup', 'div.card-group', BsCardGroup),
  bare('BsCardHeader', 'div.card-header', BsCardHeader),
  bare('BsCardImg', 'img.card-img-top', BsCardImg),
  bare('BsCardLink', 'a.card-link', BsCardLink),
  bare('BsCardSubtitle', 'div.card-subtitle', BsCardSubtitle),
  bare('BsCardText', 'div.card-text', BsCardText),
  bare('BsCardTitle', 'div.card-title', BsCardTitle),
  { ...bare('BsCarousel', 'div.carousel', BsCarousel), fixedRole: 'region' },
  { ...bare('BsCarouselItem', 'div.carousel-item', BsCarouselItem), fixedRole: 'group' },
  bare('BsHierarchyChart', 'div.hierarchy-chart', BsHierarchyChart),
  // No points, no svg: the probe needs data for its labelled node to exist.
  { name: 'BsSparkline', target: 'span.sparkline', render: (p) => <BsSparkline {...p} points={[1, 3, 2]} />, labelTarget: 'svg[role=img]' },
  bare('BsTrendChart', 'div.trend-chart', BsTrendChart),
  bare('BsCheckbox', 'input[type=checkbox]', BsCheckbox),
  bare('BsCodeSnippet', 'div.code-snippet', BsCodeSnippet),
  { ...bare('BsDatatable', 'div.datatable', BsDatatable), labelTarget: 'table' },
  bare('BsDatepicker', 'div.mp-datepicker', BsDatepicker),
  bare('BsDatetimePicker', 'div.mp-datetime-picker', BsDatetimePicker),
  bare('BsDockManager', 'mint-dock-manager', BsDockManager),
  bare('BsDropdownMenu', 'ul.dropdown-menu', BsDropdownMenu),
  /* Rendered outside a menu on purpose: inside one, the hydrated menu assigns
     the item roles itself (`menuitem`, `separator`), which would overwrite the
     probe's `role` and test the menu instead of the wrapper's rest-spread. */
  bare('BsDropdownItem', 'li.dropdown-item', BsDropdownItem),
  bare('BsDropdownHeader', 'li.dropdown-header', BsDropdownHeader),
  bare('BsDropdownDivider', 'li.dropdown-divider', BsDropdownDivider),
  bare('BsFileManager', 'mp-file-manager', BsFileManager),
  bare('BsInputGroup', 'div.input-group', BsInputGroup),
  { ...bare('BsMultiRange', 'div.mp-multi-range', BsMultiRange), fixedRole: 'group' },
  bare('BsNavbar', 'nav.navbar', BsNavbar),
  {
    name: 'BsNavbarDropdown',
    target: 'details.dropdown',
    render: (p) => <BsNavbar><BsNavbarNav><BsNavbarDropdown label="Menu" {...p} /></BsNavbarNav></BsNavbar>,
  },
  {
    name: 'BsNavbarItem',
    target: 'div.nav-item',
    render: (p) => <BsNavbar><BsNavbarNav><BsNavbarItem {...p} /></BsNavbarNav></BsNavbar>,
  },
  bare('BsNavbarNav', 'div.navbar-nav', BsNavbarNav),
  bare('BsOtpInput', 'input', BsOtpInput),
  bare('BsPagination', 'nav', BsPagination),
  bare('BsPhoneInput', 'input[type=tel]', BsPhoneInput),
  bare('BsQueryBuilder', 'div.query-builder', BsQueryBuilder),
  bare('BsRadio', 'input[type=radio]', BsRadio),
  { ...bare('BsRadioGroup', 'div', BsRadioGroup), fixedRole: 'radiogroup' },
  bare('BsRibbon', 'mp-ribbon', BsRibbon),
  bare('BsQuickAccessToolbar', 'mp-quick-access-toolbar', BsQuickAccessToolbar),
  bare('BsRibbonTab', 'mp-ribbon-tab', BsRibbonTab),
  bare('BsRibbonContextualTabSet', 'mp-ribbon-contextual-tab-set', BsRibbonContextualTabSet),
  bare('BsRibbonGroup', 'mp-ribbon-group', BsRibbonGroup),
  bare('BsRibbonButton', 'mp-ribbon-button', BsRibbonButton),
  bare('BsRibbonSplitButton', 'mp-ribbon-split-button', BsRibbonSplitButton),
  bare('BsRibbonDropdownButton', 'mp-ribbon-dropdown-button', BsRibbonDropdownButton),
  bare('BsRibbonMenuItem', 'mp-ribbon-menu-item', BsRibbonMenuItem),
  bare('BsRibbonMenuSeparator', 'mp-ribbon-menu-separator', BsRibbonMenuSeparator),
  bare('BsRibbonToggleButton', 'mp-ribbon-toggle-button', BsRibbonToggleButton),
  bare('BsRibbonCheckBox', 'mp-ribbon-checkbox', BsRibbonCheckBox),
  bare('BsRibbonComboBox', 'mp-ribbon-combobox', BsRibbonComboBox),
  bare('BsRibbonColorPicker', 'mp-ribbon-color-picker', BsRibbonColorPicker),
  bare('BsRibbonGroupButton', 'mp-ribbon-group-button', BsRibbonGroupButton),
  bare('BsRibbonGallery', 'mp-ribbon-gallery', BsRibbonGallery),
  bare('BsRibbonGalleryItem', 'mp-ribbon-gallery-item', BsRibbonGalleryItem),
  bare('BsRibbonTemplateItem', 'mp-ribbon-template-item', BsRibbonTemplateItem),
  bare('BsScheduler', 'mp-scheduler', BsScheduler),
  bare('BsSelect', 'select', BsSelect),
  bare('BsShell', 'div.shell', BsShell),
  bare('BsSignaturePad', 'div.mp-signature-pad', BsSignaturePad),
  bare('BsSplitter', 'div.splitter', BsSplitter),
  bare('BsSplitterPanel', 'div.splitter-panel', BsSplitterPanel),
  bare('BsTabControl', 'div.tab-control', BsTabControl),
  {
    // A marker: BsTabControl renders its pane and forwards the page's attributes there.
    name: 'BsTabPage',
    target: 'div.tab-pane',
    render: (p) => <BsTabControl><BsTabPage header="Tab" {...p} /></BsTabControl>,
    fixedRole: 'tabpanel',
  },
  bare('BsThemeToggle', 'span.theme-toggle', BsThemeToggle),
  {
    name: 'BsTileManager',
    target: '.mp-tile-manager',
    render: (p) => <BsTileManager tiles={[{ id: 'a' }]} {...p} />,
    fixedRole: 'region',
  },
  { ...bare('BsTimeline', 'div.timeline', BsTimeline), fixedRole: 'list' },
  { ...bare('BsTimelineItem', 'div.timeline-item', BsTimelineItem), fixedRole: 'listitem' },
  { ...bare('BsTimeList', 'div.mp-time-list', BsTimeList), fixedRole: 'listbox' },
  bare('BsTimepicker', 'div.mp-timepicker', BsTimepicker),
  bare('BsToggleButton', 'input[type=checkbox]', BsToggleButton),
  bare('BsTreeSelect', 'div.tree-select', BsTreeSelect),
  {
    name: 'BsTreeview',
    target: 'ul.treeview-tree',
    render: (p) => <BsTreeview items={[{ id: 'a', label: 'A' }]} {...p} />,
    fixedRole: 'tree',
  },
  { ...bare('BsTypeahead', 'input', BsTypeahead), fixedRole: 'combobox' },
];

/*
 * Every published entry point (`<entry>/src/index.ts`, one level deeper for a
 * namespace such as `charts/`), evaluated so the completeness check can list what
 * the package actually exports rather than what this file remembers.
 */
const ENTRY_MODULES = import.meta.glob<Record<string, unknown>>(
  ['../*/src/index.ts', '../*/*/src/index.ts'],
  { eager: true },
);

/** A `Bs*` export that React can render: a function or a forwardRef/memo object. */
const isWrapperExport = ([name, value]: [string, unknown]): boolean =>
  /^Bs[A-Z]/.test(name) && (typeof value === 'function' || (typeof value === 'object' && value !== null));

let container: HTMLElement;
let root: Root;

/* jsdom has no ResizeObserver, and the datatable, tree-select and treeview
   construct one on connect. An inert stand-in lets them render; nothing here
   depends on a resize ever being observed. */
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

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function mount(entry: Case): Promise<HTMLElement | null> {
  await act(async () => {
    root.render(entry.render({ ...PROBE }));
  });
  return container.querySelector<HTMLElement>(entry.target);
}

describe('React wrapper attribute passthrough', () => {
  describe.each(CASES)('$name', (entry) => {
    it(`forwards a consumer attribute to ${entry.target}`, async () => {
      const target = await mount(entry);

      expect(target, `${entry.target} was not rendered by <${entry.name}>`).not.toBeNull();
      // Proves the wrapper spreads its rest props at all. A wrapper that
      // destructures every known prop and forgets `...rest` fails here.
      const labelled = entry.labelTarget ? target!.querySelector(entry.labelTarget) : target;
      expect(labelled?.getAttribute('aria-label')).toBe(PROBE['aria-label']);
      // The bare names travel a different road — `@lit/react` routes any name
      // it finds on the element prototype through a property rather than an
      // attribute — so they are a genuinely separate failure, not a repeat.
      expect(target!.getAttribute('role')).toBe(entry.fixedRole ?? PROBE.role);
      expect(target!.getAttribute('id')).toBe(PROBE.id);
      expect(target!.tabIndex).toBe(PROBE.tabIndex);
      // Nothing OUTSIDE the target carries the probe too: an attribute duplicated
      // onto a wrapping element would give the page two nodes with one id. The
      // target's own descendants are excluded — a light-tier component (datatable,
      // tree-select, treeview) legitimately mirrors its host label onto the inner
      // role-bearing node it renders in the light DOM.
      const outside = [...container.querySelectorAll('[aria-label="probe-name"]')]
        .filter((el) => el !== target && !target!.contains(el));
      expect(outside).toEqual([]);
    });
  });

  it('found the published entry points at all', () => {
    // Guards the glob: a layout change that empties it must fail, not pass the
    // completeness check below vacuously.
    expect(Object.keys(ENTRY_MODULES).length).toBeGreaterThanOrEqual(35);
  });

  it('covers every Bs* component exported by any entry point', () => {
    const exported = Object.values(ENTRY_MODULES)
      .flatMap((mod) => Object.entries(mod).filter(isWrapperExport).map(([name]) => name));
    const covered = new Set(CASES.map((c) => c.name));

    expect(new Set(CASES.map((c) => c.name)).size, 'duplicate case names').toBe(CASES.length);
    expect(exported.filter((name) => !covered.has(name)), 'exported wrappers with no passthrough case').toEqual([]);
    expect([...covered].filter((name) => !exported.includes(name)), 'cases for wrappers nothing exports').toEqual([]);
  });
});

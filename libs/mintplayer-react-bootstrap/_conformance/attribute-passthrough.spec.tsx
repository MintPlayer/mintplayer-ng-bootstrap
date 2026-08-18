import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
import { BsHierarchyChart } from '@mintplayer/react-bootstrap/charts/hierarchy';
import { BsSparkline } from '@mintplayer/react-bootstrap/charts/sparkline';
import { BsTrendChart } from '@mintplayer/react-bootstrap/charts/trend';
import { BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsNavbar, BsNavbarBrand, BsNavbarDropdown, BsNavbarItem } from '@mintplayer/react-bootstrap/navbar';
import { BsInputGroup } from '@mintplayer/react-bootstrap/input-group';
import { BsPhoneInput } from '@mintplayer/react-bootstrap/phone-input';
import { BsShell } from '@mintplayer/react-bootstrap/shell';
import { BsTimeline } from '@mintplayer/react-bootstrap/timeline';

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
 */

const PROBE = { 'aria-label': 'probe-name', role: 'none', id: 'probe-id', tabIndex: -1 } as const;

interface Case {
  name: string;
  tag: string;
  render: (probe: Record<string, unknown>) => React.ReactElement;
}

/**
 * Every React wrapper whose rendered root is an `mp-*` custom element. Kept in step
 * with the Angular inventory by the completeness check at the bottom.
 */
const CASES: Case[] = [
  { name: 'BsAccordion', tag: 'mp-accordion', render: (p) => <BsAccordion {...p} /> },
  {
    name: 'BsAccordionItem',
    tag: 'mp-accordion-tab',
    render: (p) => (
      <BsAccordion>
        <BsAccordionItem header="Header" {...p} />
      </BsAccordion>
    ),
  },
  { name: 'BsCarousel', tag: 'mp-carousel', render: (p) => <BsCarousel {...p} /> },
  { name: 'BsDropdownMenu', tag: 'mp-dropdown-menu', render: (p) => <BsDropdownMenu {...p} /> },
  { name: 'BsHierarchyChart', tag: 'mp-hierarchy-chart', render: (p) => <BsHierarchyChart {...p} /> },
  { name: 'BsSparkline', tag: 'mp-sparkline', render: (p) => <BsSparkline {...p} /> },
  { name: 'BsTrendChart', tag: 'mp-trend-chart', render: (p) => <BsTrendChart {...p} /> },
  { name: 'BsNavbar', tag: 'mp-navbar', render: (p) => <BsNavbar {...p} /> },
  {
    name: 'BsNavbarBrand',
    tag: 'mp-navbar-brand',
    render: (p) => <BsNavbar><BsNavbarBrand {...p} /></BsNavbar>,
  },
  {
    name: 'BsNavbarDropdown',
    tag: 'mp-navbar-dropdown',
    render: (p) => <BsNavbar><BsNavbarDropdown {...p}><span slot="label">Menu</span></BsNavbarDropdown></BsNavbar>,
  },
  {
    name: 'BsNavbarItem',
    tag: 'mp-navbar-item',
    render: (p) => <BsNavbar><BsNavbarItem {...p} /></BsNavbar>,
  },
  { name: 'BsInputGroup', tag: 'mp-input-group', render: (p) => <BsInputGroup {...p} /> },
  { name: 'BsPhoneInput', tag: 'mp-phone-input', render: (p) => <BsPhoneInput {...p} /> },
  { name: 'BsShell', tag: 'mp-shell', render: (p) => <BsShell {...p} /> },
  { name: 'BsTimeline', tag: 'mp-timeline', render: (p) => <BsTimeline {...p} /> },
];

let container: HTMLElement;
let root: Root;

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
  return container.querySelector(entry.tag);
}

describe('React wrapper attribute passthrough', () => {
  describe.each(CASES)('$name', (entry) => {
    it(`forwards a consumer attribute to <${entry.tag}>`, async () => {
      const target = await mount(entry);

      expect(target, `<${entry.tag}> was not rendered by <${entry.name}>`).not.toBeNull();
      // Proves the wrapper spreads its rest props at all. A wrapper that
      // destructures every known prop and forgets `...rest` fails here.
      expect(target!.getAttribute('aria-label')).toBe(PROBE['aria-label']);
      // The bare names travel a different road — `@lit/react` routes any name
      // it finds on the element prototype through a property rather than an
      // attribute — so they are a genuinely separate failure, not a repeat.
      expect(target!.getAttribute('role')).toBe(PROBE.role);
      expect(target!.getAttribute('id')).toBe(PROBE.id);
      expect((target as HTMLElement).tabIndex).toBe(PROBE.tabIndex);
    });
  });

  it('covers every React wrapper with a custom-element root', () => {
    // Mirrors the Angular guard's completeness check. If a new wrapper appears, add
    // a case rather than raising the number.
    expect(CASES).toHaveLength(15);
    expect(new Set(CASES.map((c) => c.name)).size).toBe(CASES.length);
  });
});

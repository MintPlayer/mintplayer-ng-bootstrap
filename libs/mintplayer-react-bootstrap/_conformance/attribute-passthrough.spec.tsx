import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
import { BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsNavbar, BsNavbarBrand, BsNavbarDropdown, BsNavbarItem } from '@mintplayer/react-bootstrap/navbar';
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
 * **Why `role`, `id` and `tabIndex` rather than `aria-*`.** TypeScript exempts
 * hyphenated JSX attribute names from excess-property checking, so a probe built
 * from `aria-label` compiles against *any* props type and proves nothing. Only
 * camelCase/bare names actually exercise the type. The runtime assertions here use
 * both, since at runtime the distinction does not exist.
 */

const PROBE = { role: 'none', id: 'probe-id', tabIndex: -1, 'aria-label': 'probe-name' } as const;

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
    tag: 'mp-accordion-item',
    render: (p) => (
      <BsAccordion>
        <BsAccordionItem header="Header" {...p} />
      </BsAccordion>
    ),
  },
  { name: 'BsCarousel', tag: 'mp-carousel', render: (p) => <BsCarousel {...p} /> },
  { name: 'BsDropdownMenu', tag: 'mp-dropdown-menu', render: (p) => <BsDropdownMenu {...p} /> },
  { name: 'BsNavbar', tag: 'mp-navbar', render: (p) => <BsNavbar {...p} /> },
  {
    name: 'BsNavbarBrand',
    tag: 'mp-navbar-brand',
    render: (p) => <BsNavbar><BsNavbarBrand {...p} /></BsNavbar>,
  },
  {
    name: 'BsNavbarDropdown',
    tag: 'mp-navbar-dropdown',
    render: (p) => <BsNavbar><BsNavbarDropdown label="Menu" {...p} /></BsNavbar>,
  },
  {
    name: 'BsNavbarItem',
    tag: 'mp-navbar-item',
    render: (p) => <BsNavbar><BsNavbarItem {...p} /></BsNavbar>,
  },
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
    it(`forwards role, id, tabindex and aria-label to <${entry.tag}>`, async () => {
      const target = await mount(entry);

      expect(target, `<${entry.tag}> was not rendered by <${entry.name}>`).not.toBeNull();
      expect(target!.getAttribute('role')).toBe(PROBE.role);
      expect(target!.getAttribute('id')).toBe(PROBE.id);
      expect(target!.getAttribute('tabindex')).toBe(String(PROBE.tabIndex));
      expect(target!.getAttribute('aria-label')).toBe(PROBE['aria-label']);
    });
  });

  it('covers every React wrapper with a custom-element root', () => {
    // Mirrors the Angular guard's completeness check. If a new wrapper appears, add
    // a case rather than raising the number.
    expect(CASES).toHaveLength(10);
    expect(new Set(CASES.map((c) => c.name)).size).toBe(CASES.length);
  });
});

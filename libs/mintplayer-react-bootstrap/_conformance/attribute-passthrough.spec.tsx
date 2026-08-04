import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
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
 * **This file asserts `aria-label` ONLY, and that is a hard constraint rather than
 * a shortcut.** jsdom cannot see the other attributes arrive. `@lit/react` routes any
 * prop whose name is also a property on `HTMLElement` — `role`, `id`, `tabIndex` —
 * through an element-*property* path in a layout effect, and that path does not take
 * effect under jsdom even though the effect runs and the element upgrades. Measured
 * in `_spike-passthrough/`: in real Chromium every one of those attributes arrives
 * correctly, while in jsdom all three read back `null`. A guard asserting them here
 * would fail permanently against working code — which it did, on all ten wrappers,
 * before the spike caught it.
 *
 * `aria-label` is exempt from that routing precisely because it is hyphenated and so
 * cannot be a property name; it goes to React and becomes an attribute. That makes it
 * the one probe jsdom can trust — and it is still sufficient for the defect this file
 * exists to catch, because a wrapper that never spreads its rest props drops
 * `aria-label` along with everything else.
 *
 * The bare-name half therefore lives at the type level (`.types.tsx`, where the
 * defect actually was) and in the browser spike. Do not "strengthen" this file by
 * adding `role`/`id`/`tabIndex` back.
 */

const PROBE = { 'aria-label': 'probe-name' } as const;

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
    });
  });

  it('covers every React wrapper with a custom-element root', () => {
    // Mirrors the Angular guard's completeness check. If a new wrapper appears, add
    // a case rather than raising the number.
    expect(CASES).toHaveLength(12);
    expect(new Set(CASES.map((c) => c.name)).size).toBe(CASES.length);
  });
});

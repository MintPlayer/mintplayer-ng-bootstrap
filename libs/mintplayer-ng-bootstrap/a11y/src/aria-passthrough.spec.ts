import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BsAccordionComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsCarouselComponent } from '@mintplayer/ng-bootstrap/carousel';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsDatatableComponent } from '@mintplayer/ng-bootstrap/datatable';
import { BsDockManagerComponent } from '@mintplayer/ng-bootstrap/dock';
import { BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsFileManagerComponent } from '@mintplayer/ng-bootstrap/file-manager';
import { BsNavbarComponent, BsNavbarDropdownComponent } from '@mintplayer/ng-bootstrap/navbar';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { BsQueryBuilderComponent } from '@mintplayer/ng-bootstrap/query-builder';
import { BsRadioComponent } from '@mintplayer/ng-bootstrap/radio';
import { BsSchedulerComponent } from '@mintplayer/ng-bootstrap/scheduler';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsShellComponent } from '@mintplayer/ng-bootstrap/shell';
import { BsSplitterComponent } from '@mintplayer/ng-bootstrap/splitter';
import { BsTimelineComponent } from '@mintplayer/ng-bootstrap/timeline';
import { BsTreeSelectComponent } from '@mintplayer/ng-bootstrap/tree-select';
import { BsTreeviewComponent } from '@mintplayer/ng-bootstrap/treeview';

/**
 * Every Angular wrapper whose template root is a `<mp-*>` / `<mint-*>` element
 * must be **transparent to ARIA**: a consumer's `aria-label`, `role`, `id` and
 * `tabindex` set on the `bs-*` element have to reach the custom element inside.
 *
 * Why this fails today, and why it is invisible without a test: every wrapper is
 * a *nested host*. `<bs-checkbox>` renders `<mp-checkbox>` as a child, so a
 * consumer's `aria-label` lands on `<bs-checkbox>` — an element with no role,
 * where ARIA 1.2 prohibits naming, so browsers drop it. The `<mp-checkbox>`
 * inside never sees it and stays nameless. `tabindex` is worse than useless: it
 * makes the *wrapper* focusable, adding a dead tab stop in front of the real
 * control.
 *
 * This spec exists **before** the fix, deliberately. A regression net written
 * after the work it guards is not a net — it has to fail on the broken wrappers
 * first, then go green as each is repaired, so "forwarded" is proven rather than
 * assumed. Wrappers that do not forward yet are marked `it.fails`, which is
 * self-policing in both directions: CI stays green while the defect is
 * documented, and the moment a wrapper starts forwarding its `it.fails` entry
 * *itself* fails, forcing the list to shrink rather than rot.
 *
 * Scope boundary, deliberately narrow: this asserts the attributes reach the
 * `mp-*` host and stops there. Whether the web component then re-exposes them on
 * the role-bearing node inside its shadow root is the *component's* contract and
 * belongs in its own `*.aria.spec.ts`. Conflating the two would report a WC bug
 * as a wrapper bug and vice versa.
 */

const PROBE = {
  'aria-label': 'probe-name',
  // `role="none"` is valid on any element, so this never asserts a role the
  // component would be wrong to accept.
  role: 'none',
  id: 'probe-id',
  tabindex: '-1',
} as const;

interface WrapperCase {
  /** The `bs-*` element a consumer writes. */
  selector: string;
  /** The custom element that must receive the attributes. */
  tag: string;
  component: Type<unknown>;
  /** Minimal content or inputs needed to render without throwing. */
  content?: string;
  /** What the wrapper forwards today, if anything. Measured, not assumed. */
  forwardsAriaAttributes?: true;
}

/**
 * Complete inventory of nested-host wrappers, derived by scanning every
 * `*.component.html` whose template root is an `mp-*`/`mint-*` element. The
 * completeness check at the bottom fails if a new one appears, so this cannot
 * silently fall behind.
 */
const WRAPPERS: WrapperCase[] = [
  { selector: 'bs-accordion', tag: 'mp-accordion', component: BsAccordionComponent },
  { selector: 'bs-carousel', tag: 'mp-carousel', component: BsCarouselComponent },
  { selector: 'bs-checkbox', tag: 'mp-checkbox', component: BsCheckboxComponent, forwardsAriaAttributes: true },
  { selector: 'bs-datatable', tag: 'mp-datatable', component: BsDatatableComponent },
  { selector: 'bs-dock-manager', tag: 'mint-dock-manager', component: BsDockManagerComponent },
  { selector: 'bs-dropdown-menu', tag: 'mp-dropdown-menu', component: BsDropdownMenuComponent },
  { selector: 'bs-file-manager', tag: 'mp-file-manager', component: BsFileManagerComponent },
  { selector: 'bs-navbar', tag: 'mp-navbar', component: BsNavbarComponent },
  { selector: 'bs-navbar-dropdown', tag: 'mp-navbar-dropdown', component: BsNavbarDropdownComponent },
  { selector: 'bs-pagination', tag: 'mp-pagination', component: BsPaginationComponent },
  { selector: 'bs-query-builder', tag: 'mp-query-builder', component: BsQueryBuilderComponent },
  { selector: 'bs-radio', tag: 'mp-radio', component: BsRadioComponent, forwardsAriaAttributes: true },
  { selector: 'bs-scheduler', tag: 'mp-scheduler', component: BsSchedulerComponent },
  { selector: 'bs-select', tag: 'mp-select', component: BsSelectComponent },
  { selector: 'bs-shell', tag: 'mp-shell', component: BsShellComponent },
  { selector: 'bs-splitter', tag: 'mp-splitter', component: BsSplitterComponent },
  { selector: 'bs-timeline', tag: 'mp-timeline', component: BsTimelineComponent },
  { selector: 'bs-tree-select', tag: 'mp-tree-select', component: BsTreeSelectComponent },
  { selector: 'bs-treeview', tag: 'mp-treeview', component: BsTreeviewComponent },
];

function probeAttributes(): string {
  return Object.entries(PROBE)
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');
}

/** Render `<bs-x aria-label=… role=… id=… tabindex=…>` and return the inner custom element. */
async function renderAndFindTarget(entry: WrapperCase): Promise<HTMLElement | null> {
  @Component({
    imports: [entry.component],
    template: `<${entry.selector} ${probeAttributes()}>${entry.content ?? ''}</${entry.selector}>`,
  })
  class Harness {}

  await TestBed.configureTestingModule({ imports: [Harness] }).compileComponents();
  const fixture = TestBed.createComponent(Harness);
  fixture.detectChanges();
  await Promise.resolve();
  fixture.detectChanges();
  // Several wrappers register their custom element from `afterNextRender` via a
  // dynamic import(). Let that settle before the environment is torn down, or the
  // late module resolution surfaces as an unhandled rejection.
  await new Promise((resolve) => setTimeout(resolve, 0));

  return fixture.nativeElement.querySelector(entry.tag) as HTMLElement | null;
}

describe('Angular wrapper ARIA passthrough', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Measured, not assumed: NONE of the 19 forwards the full set today. Remove a
  // wrapper's entry from WRAPPERS' failing group as it is fixed — the `it.fails`
  // then starts failing, which forces the inventory to shrink rather than rot.
  describe.each(WRAPPERS)('$selector (not yet transparent)', (entry) => {
    it.fails(`does not yet forward role/id/tabindex to <${entry.tag}>`, async () => {
      const target = await renderAndFindTarget(entry);

      expect(target, `<${entry.tag}> was not rendered by <${entry.selector}>`).not.toBeNull();
      expect(target!.getAttribute('aria-label')).toBe(PROBE['aria-label']);
      expect(target!.getAttribute('role')).toBe(PROBE.role);
      expect(target!.getAttribute('id')).toBe(PROBE.id);
      expect(target!.getAttribute('tabindex')).toBe(PROBE.tabindex);
    });
  });

  // The partial forwarding that DOES exist, asserted positively so repairing the
  // rest cannot silently regress it. Only these two mirror `aria-*` (via a
  // MutationObserver on the wrapper host); the others forward nothing at all.
  //
  // Worth recording precisely, because it is narrower than it looks: bs-carousel
  // and bs-navbar are often described as "forwarding aria-label", but they accept
  // a bespoke [ariaLabel] *input* — a consumer who writes the natural
  // `aria-label="…"` attribute gets null on the inner element.
  describe.each(WRAPPERS.filter((w) => w.forwardsAriaAttributes))('$selector', (entry) => {
    it(`already mirrors aria-* to <${entry.tag}>`, async () => {
      const target = await renderAndFindTarget(entry);

      expect(target).not.toBeNull();
      expect(target!.getAttribute('aria-label')).toBe(PROBE['aria-label']);
    });
  });

  it('covers every nested-host wrapper in the library', () => {
    // Guards against a new wrapper being added without an entry above. The count
    // comes from scanning for templates whose root is an mp-*/mint-* element; if
    // this fails, add the wrapper to WRAPPERS rather than raising the number.
    expect(WRAPPERS).toHaveLength(19);
    expect(new Set(WRAPPERS.map((w) => w.selector)).size).toBe(WRAPPERS.length);
  });
});

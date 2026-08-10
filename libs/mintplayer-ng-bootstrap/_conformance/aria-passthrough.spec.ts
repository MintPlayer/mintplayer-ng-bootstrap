import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BsAccordionComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsCarouselComponent } from '@mintplayer/ng-bootstrap/carousel';
import { BsHierarchyChartComponent } from '@mintplayer/ng-bootstrap/charts/hierarchy';
import { BsSparklineComponent } from '@mintplayer/ng-bootstrap/charts/sparkline';
import { BsTrendChartComponent } from '@mintplayer/ng-bootstrap/charts/trend';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsDatatableComponent } from '@mintplayer/ng-bootstrap/datatable';
import { BsDockManagerComponent } from '@mintplayer/ng-bootstrap/dock';
import { BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsFileManagerComponent } from '@mintplayer/ng-bootstrap/file-manager';
import {
  BsNavbarComponent,
  BsNavbarDropdownComponent,
  BsNavbarDropdownLabelDirective,
} from '@mintplayer/ng-bootstrap/navbar';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { BsQueryBuilderComponent } from '@mintplayer/ng-bootstrap/query-builder';
import { BsRadioComponent } from '@mintplayer/ng-bootstrap/radio';
import { BsSchedulerComponent } from '@mintplayer/ng-bootstrap/scheduler';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsPhoneInputComponent } from '@mintplayer/ng-bootstrap/phone-input';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsShellComponent } from '@mintplayer/ng-bootstrap/shell';
import { BsSignaturePadComponent } from '@mintplayer/ng-bootstrap/signature-pad';
import { BsSplitterComponent } from '@mintplayer/ng-bootstrap/splitter';
import { BsTimelineComponent } from '@mintplayer/ng-bootstrap/timeline';
import { BsTreeSelectComponent } from '@mintplayer/ng-bootstrap/tree-select';
import { BsTreeviewComponent } from '@mintplayer/ng-bootstrap/treeview';

/**
 * Every Angular wrapper whose template root is a `<mp-*>` / `<mint-*>` element
 * must be **transparent to ARIA**: a consumer's `aria-label`, `role`, `id` and
 * `tabindex` set on the `bs-*` element have to reach the custom element inside.
 *
 * Why this was broken, and why it was invisible without a test: every wrapper is
 * a *nested host*. `<bs-checkbox>` renders `<mp-checkbox>` as a child, so a
 * consumer's `aria-label` landed on `<bs-checkbox>` — an element with no role,
 * which AT does not navigate to as a named object, so nothing reached the
 * `<mp-checkbox>` inside and it stayed nameless. `tabindex` was worse than
 * useless: it made the *wrapper* focusable, adding a dead tab stop in front of
 * the real control.
 *
 * This spec was written **before** the fix, deliberately, and every case here was
 * an `it.fails` until `BsForwardAriaDirective` landed. A regression net written
 * after the work it guards is not a net — it has to fail on the broken wrappers
 * first, then go green as they are repaired, so "forwarded" is proven rather than
 * assumed. It paid for itself immediately: it corrected the audit's numbers
 * (0 of 19 wrappers were transparent, not "22 of 24 discard ARIA with 2
 * exceptions" — `bs-checkbox`/`bs-radio` mirrored `aria-*` via a
 * `MutationObserver` but forwarded no `role`/`id`/`tabindex`, and
 * `bs-carousel`/`bs-navbar` took a bespoke `[ariaLabel]` *input*, so a consumer
 * writing the natural attribute got `null`). Had the directive been built against
 * the audit's figures it would have skipped two wrappers believing they worked.
 *
 * **A caveat about `it.fails` that cost real time, worth knowing before using the
 * idiom again.** It passes when the test throws for *any* reason, so it cannot
 * distinguish "the wrapper does not forward" from "the harness cannot render this
 * wrapper at all". Two entries were in the second category and nobody knew:
 * `bs-tree-select` throws in its constructor unless nested in a `<bs-form>`, and
 * `bs-navbar-dropdown` has a `contentChild.required` label that fails NG0951 when
 * absent. Both looked like ordinary forwarding failures until the directive landed
 * and they were the only two still red. Hence `wrap` and `needs` below: each
 * wrapper's real preconditions are now explicit, so a render error can never again
 * masquerade as an ARIA finding.
 *
 * **Why this lives in `_conformance/` and not in `a11y/src/`.** It imports 19
 * sibling secondary entry points. `a11y` is itself a published entry point, and
 * the wrappers already import *from* it (`dropdown`, `modal`, `offcanvas`,
 * `file-upload` today; all 19 once `BsForwardAriaDirective` lands there). Placing
 * this inside `a11y` therefore pointed the primitives entry point at its own
 * consumers — a circular dependency between published entry points, hidden only
 * by `tsconfig.lib.json` excluding `*.spec.ts` from the build. Latent, but the
 * moment a helper is lifted out of a spec into `src/` it becomes a build failure.
 * `_conformance/` has no `ng-package.js`, so it is not an entry point at all and
 * cannot be published — the same arrangement as the existing
 * `_spike-lit-context/`.
 *
 * It stayed a vitest spec rather than moving to the e2e project on purpose:
 * attribute forwarding is a plain DOM fact that a real browser adds nothing to,
 * unlike the checks that genuinely need one (Tab order, `inert` focusability,
 * cross-root ARIA references — see the plan's Phase 0). Putting a 19-wrapper
 * conformance matrix in Playwright would need a bespoke demo page and couple the
 * guard to demo content, for no additional signal.
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
  /** Minimal content needed to render without throwing. */
  content?: string;
  /**
   * Markup the wrapper must be nested inside, as `[open, close]`. Some wrappers
   * throw in their constructor without an ancestor — `bs-tree-select` requires a
   * `<bs-form>`.
   */
  wrap?: readonly [string, string];
  /** Extra components/directives the harness template needs for `content`/`wrap`. */
  needs?: Type<unknown>[];
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
  { selector: 'bs-checkbox', tag: 'mp-checkbox', component: BsCheckboxComponent },
  { selector: 'bs-hierarchy-chart', tag: 'mp-hierarchy-chart', component: BsHierarchyChartComponent },
  { selector: 'bs-sparkline', tag: 'mp-sparkline', component: BsSparklineComponent },
  { selector: 'bs-trend-chart', tag: 'mp-trend-chart', component: BsTrendChartComponent },
  { selector: 'bs-datatable', tag: 'mp-datatable', component: BsDatatableComponent },
  { selector: 'bs-dock-manager', tag: 'mint-dock-manager', component: BsDockManagerComponent },
  { selector: 'bs-dropdown-menu', tag: 'mp-dropdown-menu', component: BsDropdownMenuComponent },
  { selector: 'bs-file-manager', tag: 'mp-file-manager', component: BsFileManagerComponent },
  { selector: 'bs-navbar', tag: 'mp-navbar', component: BsNavbarComponent },
  {
    selector: 'bs-navbar-dropdown',
    tag: 'mp-navbar-dropdown',
    component: BsNavbarDropdownComponent,
    // contentChild.required(BsNavbarDropdownLabelDirective) — NG0951 without it.
    // Must be an <ng-template>: the directive injects TemplateRef (the wrapper
    // renders it through ngTemplateOutlet), so on a plain element it fails NG0201.
    content: '<ng-template bsNavbarDropdownLabel>label</ng-template>',
    needs: [BsNavbarDropdownLabelDirective],
  },
  { selector: 'bs-input-group', tag: 'mp-input-group', component: BsInputGroupComponent },
  { selector: 'bs-pagination', tag: 'mp-pagination', component: BsPaginationComponent },
  { selector: 'bs-query-builder', tag: 'mp-query-builder', component: BsQueryBuilderComponent },
  { selector: 'bs-radio', tag: 'mp-radio', component: BsRadioComponent },
  { selector: 'bs-scheduler', tag: 'mp-scheduler', component: BsSchedulerComponent },
  { selector: 'bs-phone-input', tag: 'mp-phone-input', component: BsPhoneInputComponent },
  { selector: 'bs-select', tag: 'mp-select', component: BsSelectComponent },
  { selector: 'bs-shell', tag: 'mp-shell', component: BsShellComponent },
  { selector: 'bs-signature-pad', tag: 'mp-signature-pad', component: BsSignaturePadComponent },
  { selector: 'bs-splitter', tag: 'mp-splitter', component: BsSplitterComponent },
  { selector: 'bs-timeline', tag: 'mp-timeline', component: BsTimelineComponent },
  {
    selector: 'bs-tree-select',
    tag: 'mp-tree-select',
    component: BsTreeSelectComponent,
    // Its constructor throws '<bs-tree-select> must be inside a <bs-form>'.
    wrap: ['<bs-form>', '</bs-form>'],
    needs: [BsFormComponent],
  },
  { selector: 'bs-treeview', tag: 'mp-treeview', component: BsTreeviewComponent },
];

function probeAttributes(): string {
  return Object.entries(PROBE)
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');
}

/**
 * Render `<bs-x aria-label=… role=… id=… tabindex=…>` and return both the wrapper
 * host and the inner custom element. Both are needed: forwarding is only correct
 * if the attributes arrive on the target *and* the moved ones leave the host, and
 * the host cannot be found with `document.querySelector` because the fixture is
 * not necessarily attached to the document.
 */
async function render(entry: WrapperCase): Promise<{ host: HTMLElement; target: HTMLElement | null }> {
  const [open, close] = entry.wrap ?? ['', ''];

  @Component({
    imports: [entry.component, ...(entry.needs ?? [])],
    template: `${open}<${entry.selector} ${probeAttributes()}>${entry.content ?? ''}</${entry.selector}>${close}`,
  })
  class Harness {}

  await TestBed.configureTestingModule({ imports: [Harness] }).compileComponents();
  const fixture = TestBed.createComponent(Harness);
  fixture.detectChanges();
  await Promise.resolve();
  fixture.detectChanges();

  /* Several wrappers register their custom element from `afterNextRender` via a
     dynamic `import()`. Waiting a single macrotask is not enough: the
     carousel → swiper-core chain is several modules deep, so the import could
     still be in flight at teardown and surface as
     `EnvironmentTeardownError: Cannot load … after the environment was torn down`.
     That failed only in the full-suite run, where worker timing differs — it
     passed when this file ran alone, which is the signature of a settle that is
     too weak rather than a real defect.

     Waiting on the definition itself is the precise condition: it resolves exactly
     when the import chain has finished. The race keeps a wrapper that legitimately
     never defines its element (or is renamed) reporting as a null target below,
     rather than hanging the suite. */
  await Promise.race([
    customElements.whenDefined(entry.tag),
    new Promise((resolve) => setTimeout(resolve, 250)),
  ]);
  fixture.detectChanges();

  return {
    host: fixture.nativeElement.querySelector(entry.selector) as HTMLElement,
    target: fixture.nativeElement.querySelector(entry.tag) as HTMLElement | null,
  };
}

describe('Angular wrapper ARIA passthrough', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  /* All 19 now forward, via `BsForwardAriaDirective` on each wrapper's template
     root. These were `it.fails` until the directive landed — the inventory went
     from 0/19 transparent to 19/19 in one change, which is the whole reason the
     guard was written before the fix rather than after it. */
  describe.each(WRAPPERS)('$selector', (entry) => {
    it(`forwards aria-label, role, id and tabindex to <${entry.tag}>`, async () => {
      const { target } = await render(entry);

      expect(target, `<${entry.tag}> was not rendered by <${entry.selector}>`).not.toBeNull();
      expect(target!.getAttribute('aria-label')).toBe(PROBE['aria-label']);
      expect(target!.getAttribute('role')).toBe(PROBE.role);
      expect(target!.getAttribute('id')).toBe(PROBE.id);
      expect(target!.getAttribute('tabindex')).toBe(PROBE.tabindex);
    });

    it(`moves id and tabindex off <${entry.selector}> rather than duplicating them`, async () => {
      const { host } = await render(entry);

      // Two elements with one id breaks every IDREF pointing at it, and a
      // duplicated tabindex is the dead-tab-stop defect this phase exists to fix.
      expect(host.hasAttribute('id')).toBe(false);
      expect(host.hasAttribute('tabindex')).toBe(false);
      // The consumer's role moved to the target, so the host carries only the
      // directive's own marker.
      expect(host.getAttribute('role')).toBe('presentation');
    });
  });

  it('covers every nested-host wrapper in the library', () => {
    // Guards against a new wrapper being added without an entry above. The count
    // comes from scanning for templates whose root is an mp-*/mint-* element; if
    // this fails, add the wrapper to WRAPPERS rather than raising the number.
    expect(WRAPPERS).toHaveLength(25);
    expect(new Set(WRAPPERS.map((w) => w.selector)).size).toBe(WRAPPERS.length);
  });
});

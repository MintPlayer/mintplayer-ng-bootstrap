# PRD — restore `bs-splitter` over `<mp-splitter>` + migrate the accordion to `<mp-accordion>`

Status: **approved, NOT yet implemented** (docs only as of 2026-07-26) — executes on
**`feat/carousel-wc` (PR #392)**; explicitly NO new branch/PR (user directive). User confirmed:
the pilot branch's request-time lit-labs SSR is ignored; the accordion reuses the SSR machinery
already merged to master (build-time chrome + injector), per §5.2. Companion plan:
`docs/prd/splitter-accordion-wc-plan.md`. Shared doctrine (two-tier
no-JS, count-variant DSD chrome, attribute-only config, wrapper anatomy) is established in
`docs/prd/carousel-wc.md` and is referenced rather than repeated.

## 1. Problem

Both components violate the "WC-backed `bs-*` wrapper in every framework" contract, each in its
own way:

- **Splitter**: commit `eb645e53` (#269) introduced `<mp-splitter>` and deleted the whole
  Angular library in the same PR. It is the only WC in the catalog with React and Vue wrappers
  but **no Angular one** — the ng demo renders the raw tag with `CUSTOM_ELEMENTS_SCHEMA`, and a
  hand-copied `mp-splitter:not(:defined)` fallback block is stranded in the demo page's SCSS.
  The WC's real API (`min-panel-size`, `touch-mode`, three resize events, the size methods, full
  APG Window Splitter ARIA) is unreachable from Angular today.
- **Accordion**: still a pure Angular component (`SlideUpDownAnimation`, `BsNoNoscriptDirective`
  radio fork). A near-complete migration exists on the unmerged branch
  `feat/wc-ssr-accordion-pilot` (`d0f1c0c6`): a 303-line `MpAccordion`, styles, and an Angular
  wrapper rewrite — but its SSR strategy (per-request `@lit-labs/ssr` middleware, per-tab-id
  slot names) predates and contradicts the house pattern and is unshippable as-is.

## 2. Goals

1. **`bs-splitter` restored** as a thin attribute-bridging wrapper over `<mp-splitter>`,
   exposing the full WC API to Angular (attributes, events, size methods, pane projection).
2. **`<mp-accordion>` + wrappers in all three frameworks**, salvaging the pilot branch's element
   and Angular wrapper, redesigned onto the house SSR pattern.
3. **Interactive no-JS tier for the accordion** (it has one today — losing it is a regression):
   radio machine for single-open, checkbox machine for `multi`, in-shadow, DSD-delivered.
4. Behavior contracts preserved (accordion §5.2); demo pages under **Enterprise** per the
   WC-backed taxonomy; react/vue splitter demo bugs fixed in passing.

## 3. Non-goals

- Per-panel splitter sizing (`PanelInfo.minSize/maxSize/initialSize` exist but nothing reads
  them) — if it lands later it's a `[bsSplitPanel]` attribute directive, not a new element. No
  `bs-split-panel` component is restored (the old one existed only to feed a CDK `DomPortal`).
- A splitter no-JS *interactive* tier: a pointer-driven divider cannot be a CSS state machine.
  Its no-JS story is the `:not(:defined)` static-layout fallback, which moves out of the demo
  and into the shipped wrapper styles.
- Accordion `<details>/<summary>`: rejected — hands shadow-owned Bootstrap chrome to a UA
  widget, and `<details name>` exclusivity has the same single-tree restriction as radios.

## 4. Splitter: restored wrapper design

`libs/mintplayer-ng-bootstrap/splitter/` (new secondary entry, `ng-package.json` copied
verbatim — all 94 entries use `.json`):

- **Inputs → attributes**: `orientation` (`horizontal`|`vertical`), `minPanelSize` (px, →
  `min-panel-size`), `touchMode` (presence → `touch-mode`). All three WC properties are thin
  `setAttribute` accessors, so `[attr.x]` bindings are the whole bridge.
- **Outputs**: `resizeStart` / `resizing` / `resizeEnd` re-emitting the WC's typed
  `{sizes, orientation}` details. **Guard on `event.target === nativeElement` instead of
  `stopPropagation()`** — nested splitters are the normal case and the dock's delegation
  depends on bubbling; bs-navbar's swallow-the-event idiom would break the inner splitter.
- **Methods**: `getPanelSizes()` / `setPanelSizes()` / `resizeDividerBy()` delegated via
  `viewChild`.
- **Panes**: plain `<ng-content>` — the WC slots direct element children itself (`panel-N`).
- **Registration: eager side-effect import**, not `afterNextRender` — there is no DSD path to
  protect, and deferring flashes the `:not(:defined)` fallback.
- **The stranded fallback CSS ships with the wrapper** (component stylesheet), so every Angular
  consumer gets the pre-upgrade layout, not just the demo page.
- In passing: react/vue demos bind `direction="horizontal"`, an attribute the WC never observes
  (the React page casts away the type error that was telling the truth) — fix to `orientation`,
  and correct both wrappers' JSDoc (they describe `mp-splitter-panel-` data attributes and a
  `:panels` prop that don't exist).

## 5. Accordion: salvage + redesign

### 5.1 What's salvaged from `feat/wc-ssr-accordion-pilot` (`d0f1c0c6`)

Render logic and the grid-rows collapse animation (`grid-template-rows: 0fr ↔ 1fr`), the
`mp-accordion-tab-toggle` event contract (`{tabId, active, originalEvent}`), the
`part="header|button|content"` names, the hand-written SCSS on top of `bootstrap/scss/accordion`,
the Angular wrapper rewrite (`bs-accordion` / `bs-accordion-tab` / `*bsAccordionTabHeader`
structural directive replacing the header component).

### 5.2 What's redesigned (doctrine alignment)

- **Index-based slot names** (`h0`/`c0`, …) instead of per-tab-id names — the one decision that
  forced the pilot's per-request lit-ssr middleware. With indexes, the chrome pre-generates as
  count-parameterized variants exactly like `MP_CAROUSEL_DSD_CHROME_BY_COUNT`, keyed
  `[multi][count]` (radio vs checkbox machine differs in input `type`/`name`).
- **Composite element + inert marker children**: `<mp-accordion>` owns the whole shadow
  (headers, inputs, ARIA, animation); `<mp-accordion-tab>` is a marker child with a trivial
  `:host{display:block}` shadow — the `mp-tab-page` precedent. Forced by no-JS single-open:
  radio groups only form within one node tree, so per-item shadow roots can't be exclusive
  without JS. The wrapper (or the element, CSR) stamps `slot="hN"/"cN"` on header/body content.
- Drop entirely: `isServerSide` dual templates, the `createRenderRoot` hydration bypass,
  `snapshotSsrCheckedState`, all middleware wiring. Tier gating is `:host(:not([data-js]))`;
  the checked radio/checkbox state is read before chrome replacement (carousel precedent).
- **Injector** `injectMpAccordionDsd`: counts `<mp-accordion-tab>` children (the carousel's
  attribute-value-safe depth-scan counter generalizes), reads `multi` off the tag, splices the
  matching variant. `codegen-accordion-chrome` joins the `codegen-ssr-chrome` aggregate.

### 5.3 Behavior contracts to preserve (from the current Angular component)

1. Opening a tab closes siblings unless `multi`; two-way `isActive` per tab.
2. **Closing a tab recursively closes accordions nested inside it** — nesting is first-class
   (offcanvas nests four levels deep). WC realization: on close, the element queries
   `mp-accordion` within the closing tab's slotted light DOM and calls a public
   `closeAll()`. This is the **#1 risk** — validated early by a dedicated vitest with nested
   structure before the rest of Phase B proceeds.
3. `highlightActiveTab`; arbitrary projected header content (slots, not strings).
4. Tolerates children with no tab identity (offcanvas uses `bs-accordion` as a bare link
   container with zero tabs).
5. Reduced-motion: the only real assertions in the old Angular specs (live `matchMedia`
   tracking) — re-expressed against the WC.
6. In-lib consumers keep compiling: `sticky-footer`, `offcanvas`, `shell` components author
   `bs-accordion` internally; the wrapper API stays shape-compatible (header component →
   structural directive is the one breaking change, as on the pilot branch).

### 5.4 ARIA

APG accordion pattern as today, plus the audit's noted gaps as value-add: `Home`/`End` and
`ArrowUp`/`ArrowDown` between headers (`docs/prd/aria-accessibility-audit.md:122`).

### 5.5 Bootstrap SCSS

`bootstrap/scss/accordion` behind the config partials, inside the shadow only. The pilot's
approach (un-commenting accordion in the global `_bootstrap.scss` + 23 lines of
`--bs-accordion-*: inherit`) is rejected: it ships the whole module globally for a theming
side-effect and the inherit-list rots. Instead the defaults live on `:host` — shadow `:host`
declarations naturally lose to light-DOM rules targeting the host, so consumer theming
(`.multi-level { --bs-accordion-btn-bg: … }`) wins without any global import (the
`tab-control.styles.scss` idiom). Utilities that don't cross the boundary (`d-none`, `d-block`,
`overflow-hidden`, `p-0`, reboot box-sizing) get explicit shadow rules; consumer content
utilities (`px-3`, `me-2`) are slotted light DOM and safe.

### 5.6 Demo impact

The ng accordion demo's `.multi-level ::ng-deep .accordion-body/.accordion-button` rules stop
matching (those classes move into the shadow) — rewritten against `::part(header|button|content)`.
Accordion and splitter demo pages move to **Enterprise** (WC-backed taxonomy), with the
cross-framework path caveat already noted on the carousel move. The splitter demo gains a second
example exercising `min-panel-size`, `touch-mode`, the events and the size API — the gap runs
that way, not the other.

## 6. Testing

- **Splitter**: Angular wrapper unit spec (attribute bridging, event re-emit with the
  target guard, method delegation); one ng e2e spec (keyboard resize per APG + event assertion);
  the WC itself already has 20 ARIA vitest cases.
- **Accordion**: WC vitest replacing the thin Angular specs (which die with the header
  component): open/close, single vs multi, nested recursive close (early risk gate), no-tab
  tolerance, ARIA incl. new keyboard, reduced-motion contract. e2e via a shared suite in
  `tools/e2e-shared/` (carousel pattern): JS tier + no-JS tier (radio/checkbox machines,
  DSD attach, independence) across all three demo apps.

## 7. References

- Investigation reports (this session): splitter (deletion evidence `eb645e53`, WC API map,
  react/vue wrapper audit), accordion (pilot-branch salvage inventory, no-JS tier analysis,
  three-way design verdict).
- `docs/prd/carousel-wc.md` (shared doctrine, count-variant chrome, injector counting,
  attribute-only config), `docs/prd/accordion-multi.md`, `docs/prd/splitter-1.md`,
  `docs/prd/wc-aria-accessibility.md`.
- Pilot branch: `feat/wc-ssr-accordion-pilot` @ `d0f1c0c6` (salvage source — cherry-pick
  nothing wholesale; port files individually).

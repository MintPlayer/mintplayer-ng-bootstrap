# PRD — restore `bs-splitter` over `<mp-splitter>` + migrate the accordion to `<mp-accordion>`

Status: **as built, 2026-07-27** — implemented on **`feat/carousel-wc` (PR #392)**; no new
branch/PR (user directive). The pilot branch's request-time lit-labs SSR was dropped as
planned; the accordion reuses the build-time chrome + injector machinery already on master,
per §5.2. Companion plan: `docs/prd/splitter-accordion-wc-plan.md`. Shared doctrine (two-tier
no-JS, count-variant DSD chrome, attribute-only config, wrapper anatomy) is established in
`docs/prd/carousel-wc.md` and is referenced rather than repeated.

**Deviations from the plan** are recorded inline where they belong (§4 event handling, §5.2
markers/slots) and summarised in §8.

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
  `{sizes, orientation}` details. **Guard on `event.target === nativeElement`, then
  `stopPropagation()`** — claim-then-stop (amended during implementation from guard-only;
  the accordion wrapper follows the same rule for `mp-accordion-tab-toggle`).
  The guard keeps the bs-navbar swallow-everything idiom's failure away (an outer wrapper
  never claims a nested splitter's bubbled events); the stop after it is required because
  Angular registers BOTH a DOM listener and the output subscription for an element event
  binding (verified in `listenerInternal`/`listenToDomEvent`, core), so a consumer's
  `(resizing)` handler would otherwise fire twice — typed detail plus the identically-named
  raw CustomEvent. Unclaimed events (nested *raw* `mp-splitter`) still bubble untouched, and
  the dock is unaffected either way: its splitters live inside its own shadow root with no
  wrapper attached.
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
  - **As built:** markers are identified by the `accordion-tab` / `accordion-header`
    ATTRIBUTES, not by tag name. Named slots only accept direct children of the shadow host,
    and an Angular component can only render inside its own host element — so requiring an
    `<mp-accordion-tab>` tag would put every Angular marker one level too deep to ever be
    slotted. `<bs-accordion-tab>`'s host IS the marker; `<mp-accordion-tab>` stays as the
    vanilla convenience element and tags itself. Because children connect *after* their
    parent, the accordion also watches its children for that attribute arriving a tick late.
  - **As built:** the same constraint means a tab's header cannot live inside the tab. It is
    authored with `*bsAccordionTabHeader` (React/Vue: a `header` prop/slot) and **hoisted** by
    the parent into a sibling of the tab. Pairing is by position: i-th header ↔ i-th tab.
- Drop entirely: `isServerSide` dual templates, `snapshotSsrCheckedState` as a separate mode,
  all middleware wiring. Tier gating is `:host(:not([data-js]))`; the checked radio/checkbox
  state is read before chrome replacement (carousel precedent).
  - **As built:** the `createRenderRoot` hydration bypass is KEPT, not dropped. The server
    chrome is the input-driven no-JS tier and the client render is the button-driven JS tier,
    so the handoff is necessarily destructive and hydration would bind parts to the wrong
    nodes — exactly the carousel's situation.
- **Injector** `injectMpAccordionDsd`: counts tab markers (the carousel's attribute-value-safe
  depth-scan counter generalizes), reads `multi` off the tag, splices the matching variant.
  `codegen-accordion-chrome` joins the `codegen-ssr-chrome` aggregate.
  - **As built:** attribute *names* are read with a tokenizer rather than searched for in the
    raw attribute text. A substring search made `aria-label="multi tabs"` turn an accordion
    into a checkbox machine — caught by its own unit test.
  - **Known limitation** (shared with the carousel, which always parks on slide 0): the
    pre-generated chrome renders every tab collapsed, so a tab declared open renders closed
    until JS upgrades. No-JS visitors simply start from a fully collapsed accordion.

### 5.3 Behavior contracts to preserve (from the current Angular component)

1. Opening a tab closes siblings unless `multi`; two-way `isActive` per tab.
2. **Closing a tab recursively closes accordions nested inside it** — nesting is first-class
   (offcanvas nests four levels deep). WC realization: on close, the element queries
   `mp-accordion` within the closing tab's slotted light DOM and calls a public
   `closeAll()`. This is the **#1 risk** — validated early by a dedicated vitest with nested
   structure before the rest of Phase B proceeds.
   - **As built:** the risk did not materialise. Nested accordions sit in the closing tab's
     own light-DOM subtree, so one `querySelectorAll('mp-accordion')` reaches every depth
     with no shadow-piercing at all, and each nested `closeAll()` recurses in turn. The
     bubbling-event fallback design was not needed. The cascade also runs for closes written
     straight to the marker by a framework binding, which never pass through the click path.
3. `highlightActiveTab`; arbitrary projected header content (slots, not strings).
4. Tolerates children with no tab identity (offcanvas uses `bs-accordion` as a bare link
   container with zero tabs).
5. Reduced-motion: the only real assertions in the old Angular specs (live `matchMedia`
   tracking) — re-expressed against the WC.
   - **As built:** this is now a `@media (prefers-reduced-motion: reduce)` rule in the
     shadow stylesheet, so there is no signal left to assert and no `BsReducedMotionDirective`
     on the wrapper. CSS tracks the preference live, which is what the old specs checked for.
6. In-lib consumers keep compiling: `sticky-footer`, `offcanvas`, `shell` components author
   `bs-accordion` internally; the wrapper API stays shape-compatible (header component →
   structural directive is the one breaking change, as on the pilot branch).
   - **Correction:** those three are **demo pages**, not library components — no library code
     consumes the accordion. Four demo pages were migrated (sticky-footer, offcanvas, shell,
     and the accordion page itself).

### 5.4 ARIA

APG accordion pattern as today, plus the audit's noted gaps as value-add: `Home`/`End` and
`ArrowUp`/`ArrowDown` between headers (`docs/prd/aria-accessibility-audit.md:122`).

### 5.5 Bootstrap SCSS

`bootstrap/scss/accordion` behind the config partials, inside the shadow only. The pilot's
approach (un-commenting accordion in the global `_bootstrap.scss` + 23 lines of
`--bs-accordion-*: inherit`) is rejected: it ships the whole module globally for a theming
side-effect and the inherit-list rots. Instead the defaults live on `:host`, and the container
is `.accordion-root` so Bootstrap's own `.accordion { --bs-accordion-*: … }` block never
matches inside the shadow. Utilities that don't cross the boundary (`d-none`, `d-block`,
`overflow-hidden`, `p-0`, reboot box-sizing) get explicit shadow rules; consumer content
utilities (`px-3`, `me-2`) are slotted light DOM and safe.

**Where a custom property may be set — and where it silently does nothing.** A value set
*directly on an element* always beats one *inherited from an ancestor*, and `:host` declares
these ON the host. So:

| Consumer writes | Works? |
|---|---|
| `mp-accordion { --bs-accordion-btn-bg: … }` (a light-DOM rule matching the host) | ✅ an outer tree context outranks the shadow's `:host` |
| `.wrapper mp-accordion { … }` | ✅ same — still matches the host |
| `.wrapper { … }` on an ANCESTOR of the accordion | ❌ only an inherited value; the `:host` default wins |

React and Vue put the consumer's class straight onto `<mp-accordion>`, so the natural thing
works there. **Angular does not** — `bs-accordion` is a separate host element, so a class on it
is an ancestor, and page CSS must name the inner element AND use `::ng-deep` (the element
carries the *wrapper's* emulated-encapsulation attribute, not the page's). This bit the
multi-level demo, whose theming was silently inert until it was rewritten to
`.multi-level ::ng-deep mp-accordion { … }`.

**Theme-dependent Bootstrap rules do not survive the move into a shadow root.** Bootstrap
themes the chevron with `[data-bs-theme="dark"] .accordion-button::after`, an ANCESTOR
selector — and the themed `<html>` is outside the shadow, so it can never match (`:host-context()`
is the usual escape hatch and Firefox does not implement it). The chevron stayed dark-on-dark in
dark mode. Fixed by painting it as a `mask-image` filled with `currentColor`, which needs no
knowledge of the theme at all; the `--bs-accordion-btn-icon` properties remain the *shape* knob.
**Rule for future migrations: grep the Bootstrap partial you are importing for `color-mode`
/ `data-bs-theme` before assuming it works inside a shadow root.**

### 5.5b Body spacing is the CONSUMER's, and the collapse clipper must stay bare

Two rules that the first implementation broke, both worth stating explicitly because neither is
visible from the element's own code:

1. **The tab body has NO padding by default.** The pre-WC template hard-coded
   `<div class="accordion-body p-0">` and every consumer pads its own projected content
   (`class="d-block px-3 py-2"`). Adopting Bootstrap's `1rem` here doubled every inset and
   compounded at each nesting level. `--bs-accordion-body-padding-x/y` therefore default to
   **0**, and remain available for consumers who want Bootstrap's spacing.
2. **Never put padding on the element that clips the collapse.** The grid-rows trick sizes the
   row to `0fr`, but an element's own padding still occupies its border box and is *not* clipped
   by its own `overflow: hidden` — so a closed tab kept showing a padding strip with the body
   behind it. The structure must stay three deep:
   `.accordion-collapse` (the animating grid) → `.accordion-clip` (`min-height: 0; overflow:
   hidden`, no spacing ever) → `.accordion-content` (the only box allowed to have padding).
   Guarded by a unit test on the structure and an e2e assertion that a closed tab measures
   exactly 0px in a real browser — jsdom has no layout, so only the e2e catches a regression.

### 5.6 Demo impact

The ng accordion demo's `.multi-level ::ng-deep .accordion-body/.accordion-button` rules stop
matching (those classes move into the shadow) — rewritten against `::part(header|button|content)`
plus the custom properties, with the Angular-specific selector caveat from §5.5.

Anything the page styled that is now *slotted* keeps working, because slotted content stays in
the light DOM — but only if the page actually defines the rule. The demo's
`<span class="triangle">`, there to show a header can carry arbitrary content rather than a
string, was styled only in the **tab-control** page's stylesheet and so had never rendered on
the accordion page at all; it is now defined locally (and centred with `vertical-align: middle`
rather than the tab-control page's font-size-specific `float` + `margin-top` hack).
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

## 8. As built

Three commits on `feat/carousel-wc` (PR #392): the splitter restore, the accordion element +
SSR pipeline, then the accordion wrappers/demos/SSR wiring.

**Deviations from the plan**, each detailed in place above:

1. **Splitter events are claim-then-stop, not guard-only** (§4). Angular registers *both* a DOM
   listener and the output subscription for an element event binding, so without the stop a
   consumer's `(resizing)` handler fires twice — once with the typed detail, once with the raw
   CustomEvent. The guard alone was not enough.
2. **Markers are attributes, not tags** (§5.2). `accordion-tab` / `accordion-header` on any
   direct child, because an Angular component cannot render a tag as a direct child of the
   element it wraps, and named slots accept nothing else. This also forced header **hoisting**
   into the parent's template, and index pairing by position.
3. **The `createRenderRoot` hydration bypass is kept, not dropped** (§5.2) — the two tiers
   render different markup, so the DSD handoff is necessarily destructive.
4. **Reduced motion is CSS-only** (§5.3.5); `BsReducedMotionDirective` is gone from the
   accordion wrapper and there is no signal left to assert.
5. **The nested-close risk did not materialise** (§5.3.2). A plain `querySelectorAll` over the
   closing tab's light-DOM subtree reaches every depth; no shadow-piercing, no event-based
   fallback. The cascade also covers closes written straight to the marker by a framework.
6. **No library code consumed the accordion** (§5.3.6) — the three named "in-lib consumers" are
   demo pages.

**Bugs the new tests caught during the sweep**, worth remembering:

- The element scanned for markers before its children had connected (parents connect first), so
  a self-tagging `<mp-accordion-tab>` was invisible. Fixed by observing every child for the
  attribute arriving late.
- The injector read `multi` by substring, so `aria-label="multi tabs"` silently switched an
  accordion to the checkbox machine. Attribute *names* are now read with a tokenizer.
- The no-JS `multi` e2e reproduced the carousel's Chromium/no-JS hang (two click targets in one
  test). Every no-JS test is now one click at most, then focus + keyboard.

**Verification:** 864 WC vitest, 466 ng-bootstrap vitest, 97 ng-demo unit, all four library
builds and all three demo app builds green; ng e2e green for splitter and accordion on Chromium
and Firefox (the suite's 10 unrelated pre-existing failures — stale visual baselines and
Firefox `networkidle` timeouts — are untouched by this work).

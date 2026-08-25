# Plan — per-component Bootstrap CSS, and the shadow boundary

PRD: [per-component-bootstrap-css.md](./per-component-bootstrap-css.md)
Status: **Proposed** (2026-08-25) — nothing implemented.
Supersedes: `docs/prd/shadow-boundary-css-plan.md` (deleted).

**W0 and W1 stand alone.** They fix the reported bug, close five premise
violations, and reclaim ~10.8 KB gzip, with no open spike gating them. Everything
from W2 on is component conversion, which is a programme.

| Wave | Milestone | State |
|---|---|---|
| — | S1 Firefox + WebKit parity | ⏳ |
| **W0** | M0 Regression spec + D9 conformance guard | ⏳ |
| **W0** | M1 `_bootstrap.scss` dedup (−10.8 KB gz) | ⏳ |
| **W0** | M2 Close the four remaining premise violations | ⏳ |
| **W0** | M3 Self-inflicted bugs + orphans | ⏳ |
| **W0** | M4 Shared `_styles` hoists (buttons −37 KB, utilities mixins) | ⏳ |
| **W0** | M5 Write the rules down (`CLAUDE.md`, stale comments) | ⏳ |
| **W1** | M6 Slot projection — the five exposures | ⏳ |
| **W2** | M7 `mp-badge` + 3 wrappers | ⏳ |
| **W3** | M8 One-element components | ⏳ |
| **W4** | M9 Small families | ⏳ |
| **W5** | M10 Card, then nav/navbar | ⏳ |
| **W6** | M11 Overlay family off CDK — **gated on Q1** | ⏳ |
| — | M12 Batched verification sweep | ⏳ |

## Conventions (these bite here specifically)

- **Assert on `background-color` only** in any spike or style spec. `padding`
  gets supplied by harness rules; `outline-width` reports `3px` from its initial
  `medium` even when `outline-style: none`. Both produced wrong verdicts during
  investigation.
- **Never name an `mp-*` tag in `::slotted()`** and **never use
  `:host(:first-of-type)`** — both are framework-conditional and invisible in
  React/Vue (PRD §4.1).
- **`@keyframes` are tree-scoped** — duplicate into every animating shadow root.
- **Batch the suites.** Verify by reading + `tsc --noEmit`. One sweep at M12.
- **Commit per milestone, push once.** Every push is billed and cancels
  in-flight runs.
- After any `.styles.scss` edit: `npx nx run mintplayer-web-components:codegen-wc`.
  Generated `*.styles.ts` is gitignored — never stage it.
- Windows/Nx: `NX_ISOLATE_PLUGINS=false`, `NX_DAEMON=false`, vitest `--pool=threads`.
- The demo dev server is host-managed — don't run `ng serve`/`ng build` against it.
- Validate slot behaviour **per framework, three times** (PRD R3).
- No new branch or PR without explicit permission.

## Ordering rationale

M0 first, and it deliberately fails. A spec asserting that `p-2` / `d-none` /
`visually-hidden` behave the same inside a row template as outside is the
executable statement of the bug; written after the fix it proves nothing. The
D9 guard ships with it because it is the only thing standing between this class
of bug and silent recurrence — the original survived precisely because one
utility worked by accident.

M1–M5 are free wins with no dependency on anything else, and M1 is the single
largest measured improvement in the PRD for a one-line change.

M6 (slot projection) before any conversion: four of the five exposures need **no
layout change**, so they prove the mechanism cheaply in three frameworks before
the component work bets on it.

M7 (`mp-badge`) is the smallest possible full conversion — 564 B partial, one
element, no descendant selectors — so it establishes the WC + 3-wrapper routine
on the cheapest case, and it is the reported bug's component.

M8–M10 ascend by structural difficulty: one-element, then small family, then
card/nav/navbar. Card is deliberately late: it is both the largest family and
premise violation V2, so it should be done once the family pattern is proven,
not while inventing it.

M11 is a parity project, not a styling one, and is gated on Q1.

---

## S1 — Spike: Firefox + WebKit parity [PRD R7]

- [ ] Re-run the PRD §15 mechanism table in Firefox and WebKit: `::slotted()`
      depth-1, `:host()` compound, custom-property inheritance across boundaries,
      `:has()` failing inside `:host`, `@keyframes` tree-scoping, the positional
      trap, and the table-parser findings.
- [ ] Record per-engine results in PRD §15. Any divergence changes D2–D6.

## M0 — The regression spec, and the guard that prevents recurrence [PRD D9, §11]

Files: `libs/mintplayer-web-components/datatable/src/components/mp-datatable.slotted-styles.spec.ts` (new),
`libs/mintplayer-web-components/_conformance/consumer-content-root.spec.ts` (new).

- [ ] Regression spec: mount a datatable whose row template contains probes
      classed `p-2`, `d-none`, `visually-hidden`, `text-danger`; assert each
      computed style equals the same node's in the light DOM. Confirm it **fails**
      on `master`; skip it with a comment naming this PRD until M6.
- [ ] **D9 guard:** for every renderer-bearing WC (`mp-datatable`,
      `mp-treeview`, `mp-tree-select`, `mp-query-builder`, `mp-select`,
      `mp-file-manager`), pass in a probe node and assert
      `probe.getRootNode() === document`. Asserts the *cause*.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M1 — `_bootstrap.scss` dedup [PRD D10, V1]

Files: `libs/mintplayer-ng-bootstrap/_bootstrap.scss`.

- [ ] `:2` currently pulls `bootstrap-utilities.scss`, which already emits
      `root` + `helpers` + `utilities/api`; `:32`, `:93`, `:96` emit them again.
      Replace `:2` with config-only imports so each is emitted **once**.
- [ ] **Keep the ordering**: the second `utilities/api` pass is currently the
      only complete one, because the four custom utility sheets at `:7-10` merge
      into `$utilities` *after* the first pass. Emitting once must happen after
      those merges.
- [ ] Add a size assertion on the built global sheet so this cannot regress.
- [ ] Expected: **189,014 → 104,936 B min, 25,388 → 14,608 B gz.**
- [ ] Verify by reading + a real sass build. **Commit.**

## M2 — Close the remaining premise violations [PRD V2–V5]

Files: `libs/mintplayer-ng-bootstrap/form/src/form/form.component.scss`,
`libs/mintplayer-ng-bootstrap/dropdown-menu/src/dropdown-menu/dropdown-menu.component.ts`,
`libs/mintplayer-react-bootstrap/dropdown-menu/src/dropdown-menu.css`,
`libs/mintplayer-vue-bootstrap/dropdown-menu/src/dropdown-menu.css`,
`libs/mintplayer-ng-bootstrap/splitter/src/splitter/splitter.component.ts`,
`libs/mintplayer-ng-bootstrap/sticky-footer/src/sticky-footer/sticky-footer.component.scss`.

- [ ] **V3:** `form.component.scss:1` is `/*:host*/ ::ng-deep` — `:host` is
      commented out, shipping the whole Bootstrap forms family (10,924 B min)
      unprefixed. Uncomment it. Check nothing depended on the leak; the
      `.form-control` stamping directive targets `bs-form` descendants, which
      stay in scope.
- [ ] **V4:** `.dropdown-item > a` is unnamespaced and maintained in three
      places. It exists because `::slotted()` cannot reach a nested anchor and
      the rule must survive with JS off. Design a single answer — most likely
      `mp-dropdown-item` as a real element owning its own anchor styling — and
      delete all three copies.
- [ ] **V2** is deferred to M10 (it is the card family).
- [ ] `sticky-footer.component.scss:7` permanently restyles `<html>` and never
      undoes it. Document or fix.
- [ ] `splitter`'s `ViewEncapsulation.None` is namespaced to the library's own
      tags with a `:not(:defined)` guard — leave, but add it to the rules list
      as a sanctioned exception.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M3 — Self-inflicted bugs and orphans [PRD §3.3]

- [ ] **`mp-timeline-item.icon`** renders a Bootstrap-icons class into a shadow
      root (`mp-timeline-item.ts:233`), shipped live in all three demos. Route it
      through the existing light-DOM `slot="marker"` path.
- [ ] **`TimelineItem.cssClass`** (`mp-timeline.ts:331`) — applied to a shadow
      node; structurally dead. Fix or delete.
- [ ] **`mp-file-manager`** `cellRenderer`s use its own sheet's classes inside
      `mp-datatable`'s shadow root, plus `cellClass: 'text-nowrap'`. Fix under
      the M6 contract.
- [ ] **Tooltip/popover dead IDREFs** — `tooltip.directive.ts:136` and
      `popover.directive.ts:133-135` write `aria-describedby`/`aria-controls`
      onto a consumer trigger pointing into `document.body`; dead whenever the
      trigger is in a shadow root. Real a11y bug.
- [ ] **`[bsFormGroup]`** stamps `.form-group`, removed in Bootstrap 5 and
      defined nowhere. Define or delete the directive.
- [ ] **`libs/mintplayer-ng-bootstrap/dropdown-divider/`** — orphan duplicate of
      the one in `dropdown-menu/`; only the latter is styled. Delete.
- [ ] **`mp-select.optionRenderer`** — correct the earlier claim that it has no
      consumers. `mp-phone-input.ts:400` uses it and the classes are deliberately
      declared in `select.styles.scss:88-151`. **Do not delete it.**
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M4 — Shared `_styles` hoists [PRD D8, D12, V5, F4]

Files: `libs/mintplayer-web-components/_styles/buttons.styles.scss` (new),
`_styles/utilities.styles.scss` (new), the four `buttons` importers, the nine
files with hand-copied utilities.

- [ ] **`_styles/buttons.styles.scss`** — pass-through to
      `bootstrap/scss/buttons`, plus the `--bs-primary` rebind from
      `_bootstrap.scss:46-68` so runtime theming works in-shadow too. Adopted by
      `mp-query-builder`, `mp-query-condition`, `mp-query-group`,
      `mp-toggle-button`, replacing four independent imports. **Net −37 KB.**
      **No `mp-button`** — the `[color]`-on-a-plain-`<button>` API stands (D11).
- [ ] **`_styles/utilities.styles.scss`** — Sass **mixins**, not classes (a
      class-based sheet inside a shadow root reintroduces inward leakage). Cover
      the 13 utilities currently hand-copied. Model:
      `_styles/focus-ring.styles.scss`.
- [ ] Replace all **19 drifted copies**. Six mutually different
      `.visually-hidden` bodies using two clipping strategies; one omits the
      `margin: -1px` twbs#25686 fix; a seventh is under the BS4 name `.sr-only`.
      **16 of 19 omit `!important`** — the mixin must not.
- [ ] Add the `!important` lint (PRD §11).
- [ ] **Wire up `_styles/focus-ring.styles.scss`** — it has zero adopters despite
      being written to stop ring drift. Being mixin-shaped is why; that is now the
      sanctioned shape.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M5 — Write the rules down [PRD G7]

Files: `CLAUDE.md`, `libs/mintplayer-web-components/card/src/card-classes.ts`,
`libs/mintplayer-ng-bootstrap/_bootstrap.scss`.

- [ ] `CLAUDE.md`, under the WC gotchas, with the measured numbers: the one rule
      (a stylesheet reaches only its own tree); consumer content is slotted,
      never rendered into a shadow root (21 of 22 utilities dead; `d-none` shows,
      `visually-hidden` becomes visible); `:host(:has())` **and** `:host:has()`
      both fail; `:host(:first-of-type)` is framework-conditional; `@keyframes`
      are tree-scoped; table layout does not cross the flat tree; assert on
      background-colour only.
- [ ] `card-classes.ts:1-12` describes a plain-`HTMLElement`/light-DOM design
      that no longer exists (`mp-card.element.ts:29` extends `LitElement`, no
      `createRenderRoot`). Rewrite, keeping why light DOM was abandoned.
- [ ] `_bootstrap.scss:40` — document why `buttons` is the one global component
      partial (D11). It reads as drift in git history and is not.
- [ ] **Commit.**

## M6 — Slot projection for the five exposures [PRD D1, D7]

Files: `mp-treeview.ts`, `mp-query-condition.element.ts`, `mp-tree-select.ts`,
`mp-select.ts`, `mp-datatable.ts`, plus wrappers for each in all three frameworks.

- [ ] **Treeview / query-builder / tree-select / select** — move renderer output
      into the light DOM behind a named slot. **No layout change**: all four host
      their injection point in flex/block containers, which already project
      correctly.
- [ ] Tree-select's derived `nodeRenderer` crosses **two** shadow roots
      (`:690` → `:877`) — thread the slotting through both.
- [ ] **Datatable (D7)** — the `<table>` stays in `mp-datatable`'s shadow root;
      only cell *contents* are slotted. Delete
      `tbody td { white-space/overflow/text-overflow }` rather than reproducing
      it as `::slotted()`; `cellClass` remains the column-level channel.
- [ ] Close the parity gaps found: Vue `BsTreeview` exposes neither
      `nodeRenderer` nor `iconResolver`; React `BsQueryBuilder` exposes no
      `editorRegistry`.
- [ ] Un-skip M0's regression spec. It must now pass, and the D9 guard must be
      green for all six components.
- [ ] Verify per framework (PRD R3). **Commit.**

## M7 — `mp-badge` + three wrappers [PRD §10 W2]

Files: `libs/mintplayer-web-components/badge/` (new),
`libs/mintplayer-ng-bootstrap/badge/`, `libs/mintplayer-react-bootstrap/badge/` (new),
`libs/mintplayer-vue-bootstrap/badge/` (new), the three demo apps.

- [ ] One element. `bootstrap/scss/badge` (564 B) in its own shadow sheet.
      `:host(:empty) { display: none }` — not `.badge:empty`, the inner span
      holds a slot and is never empty.
- [ ] `.btn .badge` (`_badge.scss:35-37`) is the only descendant rule and is
      cross-component. Handle via `--bs-badge-top`, or drop it — Bootstrap itself
      calls it "a quick fix".
- [ ] Implement `text-bg-*` semantics (background **and** contrasting
      foreground); today's `bg-*` gets its foreground from `.badge`, which is
      exactly what does not arrive.
- [ ] Angular keeps `[type]`/`[unit]`/`[decorative]`, resolving `Color[c]` as
      `bs-card.component.ts:35` does; delete the `::ng-deep` import; apply
      `bsForwardAria`. React via `@lit/react`; Vue with `inheritAttrs: false`.
- [ ] Add badge pages to the React and Vue demos — neither has one. Keep the
      datatable demo's badge as the live regression case.
- [ ] Register in `_conformance/naming.spec.ts`; add `mp-badge.aria.spec.ts`.
- [ ] Verify by reading + `tsc --noEmit`. **Commit.**

## M8 — One-element components [PRD §8]

`mp-spinner`, `mp-close`, `mp-alert`, `mp-progress`, `mp-placeholder`,
`mp-button-group`.

- [ ] Each: one element, its partial in its own shadow sheet, three wrappers,
      aria spec, `_conformance` registration.
- [ ] **`mp-close` is a shared sub-part** — alert, modal, toast and offcanvas
      each position it from outside via a descendant selector. Have each
      container publish `--bs-btn-close-padding-x/-y` and
      `-margin-{top,right,bottom,left}` and let `mp-close` consume them, rather
      than duplicating the sheet four times.
- [ ] **`mp-button-group` needs M5 stamping** — `.btn-check:checked + .btn` is
      sibling-based, buttons have no shadow root, and the partial declares zero
      custom properties. There is no pure-CSS answer. Stamp
      `data-first`/`data-last`/`data-after-check` on `slotchange`.
- [ ] **`@keyframes` into each animating root**: `spinner-border`,
      `spinner-grow`, `progress-bar-stripes`, `placeholder-glow`,
      `placeholder-wave` (PRD R6).
- [ ] `mp-alert` generates its own dismiss button in shadow, which collapses
      `.alert-dismissible .btn-close` to an intra-tree rule. Today's
      `bs-alert-close` has **no accessible name at all** — fix while converting.
- [ ] Verify by reading + `tsc --noEmit`. **Commit** (per component).

## M9 — Single-element containers, and the first one-rule sub-elements [PRD §8, D13]

`mp-breadcrumb`, `mp-list-group`, `mp-pagination` — **one element each**;
`mp-toast` — one element **+ 2 one-rule sub-elements**.

- [ ] Breadcrumb / list-group / pagination take **no** sub-elements: their items
      are direct children, so the container reaches them with `::slotted()`.
      The separator is `::slotted(:not(:first-child))::before` (measured, PRD
      §15.6) — do **not** author an `mp-breadcrumb-item`.
- [ ] Follow D2/D3: the container owns the partial and publishes the var block
      on `:host`; where a marker is needed it is recognised by **attribute**.
- [ ] Positional rules come from the parent via `::slotted(:first-child)` or M5
      stamping — **never** `:host(:first-of-type)` (D5).
- [ ] **Pagination: delete `.page-item`.** Every unreachable selector there
      exists only because state lives on the `<li>` and paint on the `<a>`.
      Merging them into `mp-page-link` leaves **zero** unreachable selectors.
- [ ] **Toast** gets `mp-toast-header` / `mp-toast-body` as one-rule elements
      (D13) — the consumer templates into both, so each needs its own slot.
      `.toast-header .btn-close` then becomes intra-tree.
- [ ] **`.list-group-numbered` (R4)** — CSS counters across a shadow boundary.
      Prototype first; fallback is JS ordinals.
- [ ] Verify by reading + `tsc --noEmit`. **Commit** (per component).

## M10 — Card, then nav/navbar [PRD V2, §8]

- [ ] **Card**: `mp-card` owns the partial and the 19 custom properties. Regions
      (`.card-header`, `.card-body`, `.card-footer`) are rendered **in mp-card's
      own shadow** around named slots — no elements needed for those. Only the
      parts the consumer templates *inside* the body need their own element, as
      **one-rule elements** (D13): `mp-card-title`, `mp-card-subtitle`,
      `mp-card-text`, `mp-card-link`. Each is 3–5 declarations on `:host` from
      `_card.scss:77-99`, consuming mp-card's tokens by inheritance — no state,
      no JS, no slots beyond a default one.
- [ ] The framework layer keeps the API the user asked for — `bs-card`,
      `bs-card-header`, `bs-card-body`, `bs-card-title`, … — each rendering the
      matching element (or setting `slot=` on a `display: contents` host for the
      shadow-rendered regions) and projecting the consumer's template in.
- [ ] Delete `ensureCardStylesInjected()` and `card-global.styles.scss`
      entirely — killing V2.
- [ ] **Region order/repetition:** Bootstrap allows several `.card-body`s and
      interleaved images. A fixed shadow skeleton gives one of each in one order.
      Use the accordion's mechanism — enumerate light children on `slotchange`,
      stamp `slot="r0"`, `slot="r1"`… and render matching regions in order. This
      is the piece to design deliberately, not assume.
- [ ] The `.text-bg-*` copy in that sheet is **functionally wrong**
      (`RGBA($value,…)` instead of `RGBA(var(--bs-*-rgb),…)`, so no runtime
      retint, no dark mode) and is currently injected globally with
      `!important`. It goes with the sheet.
- [ ] `.card > .card-header + .list-group` and `> .list-group + .card-footer`
      are sibling rules with no CSS answer → M5 stamping. Card-group grandchild
      rules → **M4** (`:host(:not(:last-child)) ::slotted(.card-header)`), with
      the group stamping `data-in-group` on `slotchange`.
- [ ] **Nav/navbar**: the `.navbar-expand*` loop (`_navbar.scss:192-258`) is
      breakpoint-descendant and four levels deep into offcanvas — use **M6
      container queries**, already measured across three engines here. Note the
      `container-type` host contributes zero intrinsic inline size.
- [ ] Fix `mp-quick-access-toolbar.element.ts:68-72` (`::slotted(mp-ribbon-*)`)
      and then remove `ribbon-button.component.ts:24`'s accidental compensation.
- [ ] Add `bsForwardAria` to the ~25 wrappers missing it.
- [ ] Remove wrapper visual CSS: `tab-control.component.scss` (131 lines),
      `tile-header.component.ts:6-25`, `file-manager.component.scss:5`.
- [ ] Verify by reading + `tsc --noEmit`. **Commit** (per family).

## M11 — Overlay family off Angular CDK [PRD Q1] — gated

- [ ] Extend `OverlayController`: rect anchors (G3), scroll-close threshold
      (G5), a top-layer adapter (`popover` / `<dialog>`).
- [ ] Order: tooltip → popover → toast → context-menu → offcanvas → modal →
      typeahead. Delete `has-overlay` last.
- [ ] Background `inert` for modal/offcanvas is a **fix, not a port** — nothing
      inerts the background today.
- [ ] Only `bs-typeahead` is genuinely shadow-broken; the rest is parity work.

## M12 — Batched verification sweep (only now; one pass)

```bash
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run mintplayer-web-components:codegen-wc
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-web-components
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-web-components -- --pool=threads
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run-many -t e2e --parallel=1
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run-many -t e2e-a11y --parallel=1
```

- [ ] Confirm the global-sheet size assertion (M1) still holds.
- [ ] Version bumps — breaking per PRD §13.
- [ ] **HUMAN:** keyboard-only pass over the converted demos.
- [ ] **HUMAN:** view the SSR demos with JS disabled — M10 changes the card path.
- [ ] Push once → PR (with permission).

## Risks

| Risk | Mitigation |
|---|---|
| D1 is a convention with no compile-time failure | M0's D9 guard, asserting the cause not the symptom |
| Positional/tag traps invisible in 2 of 3 frameworks | D5 + a three-framework spec per family |
| Per-framework slot semantics differ | Validate three times, never once |
| `.list-group-numbered` counters across a boundary | Prototype in M9; JS ordinals as fallback |
| Shared sheet duplicated across entrypoint chunks → 2 `CSSStyleSheet`s, no visual symptom | Assert on built output |
| `@keyframes` silently not running | Checklist item in M8 |
| Chromium-only evidence | S1 |
| Six waves is a programme | W0+W1 stand alone and deliver the reported fix |

## Explicitly rejected (do not resurrect casually)

- **Uncommenting component partials in `_bootstrap.scss`** — the superseded
  PRD's conclusion. It destroys the project's premise, which is worth a measured
  104,365 B min / 14,557 B gz.
- **`ViewEncapsulation.None` on wrappers as a fix** — `None` and `Emulated` both
  land in `document.head`; only scoping differs. Proven in-repo:
  `dropdown-menu.component.ts:43` already uses `None` and its rule still dies in
  a shadow root. It also makes leaking *out* real. The goal is wrappers with
  **no CSS**, which makes the setting moot.
- **A `<slot>` inside `<tr>`, a slotted `<tr>`, or `slot { display: table-row-group }`**
  — all measured, all fail; content renders at `(0,0)` outside the table.
- **An `mp-tr`/`mp-td` element family, or a light-DOM `<table class="table">`** —
  the HTML parser ejects custom elements from a real table and drops a `<td>`
  outside one. D6.
- **Copying `document.styleSheets` into shadow roots** — breaks encapsulation
  inward, throws on cross-origin sheets, needs a `MutationObserver`, re-parses
  Bootstrap per instance.
- **A class-based utilities sheet adopted into shadow roots** — resurrects the
  inward leak and fixes only *Bootstrap's* utilities, never the consumer's own.
  Mixins instead (D12).
- **Collapsing a component to a single element when the consumer templates into
  more than one nesting level** — `::slotted()` reaches exactly one level and
  cannot be followed by a descendant combinator (measured, PRD §15.6). This was
  attempted for card and does not work. It is the *requirement* (templates, not
  strings) that forces the sub-elements, not a design preference.
- **Letting the framework wrapper carry the component CSS instead** (D14) — the
  same stylesheet three times, and it dies when nested inside another shadow
  root.
- **Having the WC render the wrapper and accept only text** — closed by the
  template requirement.
- **`:host-context()`** — Chromium-only.
- **An `mp-button` element** — reverses a standing user decision; `.btn` stays
  global (D11).

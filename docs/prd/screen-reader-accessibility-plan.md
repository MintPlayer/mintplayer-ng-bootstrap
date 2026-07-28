# Plan — screen-reader accessibility across the four libraries

Status: **Phase A landed; Phase 0 spikes and B–G outstanding** — 2026-07-27. Companion PRD:
`docs/prd/screen-reader-accessibility.md` (findings, design rationale, decisions D1–D5 in §11, and
the live-state principle in §11a).

A spike phase then seven implementation phases, 0 → A → G, all on the single branch
`feat/screen-reader-accessibility`. Each phase is one coherent commit set. **A, B and C close the
majority of user-visible impact**; D–F are deep but narrower; G closes it out. Branch base is
`master`. Per `CLAUDE.md`, verify intermediate work by reading code and type-checking — the build +
unit + e2e sweep runs **once**, in G.

**Phase 0 is a gate, not a formality.** Spike 0.1 (can `<details>`/`<summary>` reproduce the
Bootstrap accordion exactly, with no UX change?) can send D1 back; 0.2 and 0.3 de-risk Phases B
and F. Nothing in D should be written before 0.1 passes.

## Decisions (all resolved — see PRD §11)

- **D1** — the accordion uses `<details name>` + `<summary>` in **both** tiers, always. Animation
  dropped. Enlarges Phase D but *removes* net code. **Gated on spike 0.1** — visual and UX parity
  with the current Bootstrap accordion is a precondition, not an assumption. Known trade:
  accordion headers leave heading navigation; Phase D carries an SR check on it. Known open risk:
  `<summary>` cannot be `disabled`, which 0.1 must resolve.
- **D2** — the datatable's role follows **interactivity**, not flat-vs-tree: no role when
  non-interactive, `grid` when rows are selectable, `treegrid` under `[tree]`, with the keyboard
  model implemented wherever the role is present. Placement stays on the inner `<table>`.
- **D3** — `mp-otp-input.label` → `inputLabel`, breaking, in Phase B.
- **D4** — the scheduler accepts both `M` and `Enter`; `M` is canonical.
- **D5** — form association is **in scope for this PR**; Phase F is last but not droppable.

**Every phase inherits PRD §11a**: an ARIA attribute must be correct at every moment, not at first
render. Prefer a native element that owns its own state; derive state in `render()` from reactive
state rather than writing it from an event handler; where a value cannot be kept correct, omit it.
Specs assert **transitions**.

---

## Phase 0 — spikes (GATES, before any implementation)

Three cheap spikes, each de-risking a decision the plan already commits to. Each is throwaway
(`libs/mintplayer-web-components/_spike-*/` per the `_spike-lit-context` precedent, or a temporary
demo route) and is **deleted before merge** — except the assertions worth keeping, which move into
real specs.

### 0.1 — `<details>`/`<summary>` visual + UX parity (gates Phase D's accordion rewrite)

**The question:** can `mp-accordion` be rebuilt on `<details>`/`<summary>` and look and behave
*exactly* like the current Bootstrap accordion, with no user-experience change? D1 is only
affordable if the answer is yes.

**Build it as a temporary route in `apps/ng-bootstrap-demo`** rendering the current `bs-accordion`
and a `<details>`-based variant **side by side** with identical content — the repo's stated way to
verify a WC is through the demo apps, and CSS parity is not something a unit test can judge. Add a
Playwright screenshot comparison across **Chromium, Firefox and WebKit** (all three are already in
the e2e matrix), at default and at a narrow breakpoint, in light and dark
(`data-bs-theme="dark"`), collapsed and expanded.

**Visual questions, in the order they are likely to bite:**

| # | Question | Why it is a risk |
|---|---|---|
| 1 | Does the disclosure marker fully disappear in all three engines? | Needs `list-style: none` **and** `::marker { content: '' }` **and** `::-webkit-details-marker { display: none }`; Firefox and Safari have historically each needed a different one of the three |
| 2 | Does `display: flex` on `<summary>` reproduce `.accordion-button`'s layout? | `<summary>` defaults to `display: list-item`; Bootstrap's button is `display: flex; align-items: center; width: 100%; text-align: left` with its own padding |
| 3 | Does `.accordion-button::after` (the chevron SVG) still render and rotate? | The rotation selector moves from `.accordion-button:not(.collapsed)` to `[open] > summary`; confirm `::after` composes with `::marker` removal |
| 4 | Is the focus ring identical? | `.accordion-button:focus` uses `--bs-accordion-btn-focus-box-shadow`, which `accordion.styles.scss:40` re-declares on `:host` for the shadow boundary — confirm it still applies to `<summary>:focus-visible` |
| 5 | `cursor`, `user-select`, and double-click behaviour | `<summary>` is `cursor: default` in some engines and **double-click selects its text**, where a `<button>` does not. This is the most likely source of a felt UX difference |
| 6 | Does the active/`is-active` background and border treatment survive? | The state selector changes from a class to `[open]`; check the collapsed/expanded border-radius seams between adjacent items |

**Behavioural questions — two are potential blockers, not polish:**

- **Disabled tabs.** `mp-accordion` supports `?disabled` on the header, and **`<summary>` cannot be
  disabled.** The workaround is `pointer-events: none` + `aria-disabled="true"` + swallowing the
  key handler — and, because the `toggle` event is **not cancellable**, any path that still opens a
  disabled tab can only be corrected by closing it again, which flashes. The spike must establish
  whether a disabled tab can be made genuinely inert without a visible flash. **If it cannot, that
  is grounds to revisit D1** for the JS tier.
- **`toggle` is not cancellable and fires *after* the state change.** Confirm that
  `mp-accordion-tab-toggle` can still be emitted with the same detail shape and timing, that
  `#closeNested` works when the *UA* closes a sibling via `name` exclusivity (does it fire `toggle`
  on the one it closed? assume yes, verify), and that a consumer cannot observe an intermediate
  state during exclusive switching.
- Enter and Space activate `<summary>` natively; Arrow/Home/End between headers still needs the
  existing handler, and the spike should confirm the native activation does not double-fire
  alongside it.
- **Does `<details name>` exclusivity scope to the shadow root?** The entire single-open behaviour
  rests on it. The spec says grouping is per node tree, the same rule as radios — and
  `mp-accordion` already satisfies it — but "same as radios" is reasoning by analogy, and analogy
  is what needed checking once already on this decision. Assert it directly: two accordions in two
  shadow roots must not close each other's tabs, and two in the *same* root must.
- **Does the UA fire `toggle` on the sibling it auto-closes?** Assumed yes, never verified, and
  every piece of state sync depends on the answer — the `is-active` light-DOM markers,
  `#closeNested`, and the `mp-accordion-tab-toggle` contract all need a signal when exclusivity
  closes a tab the user did not touch. If the answer is no, the element needs a different mechanism
  to notice, and that is a design change rather than a detail.

**Two things the spike should confirm as *wins*, since they offset the risks:** closed content is
removed from the accessibility tree and the tab order with no CSS (closing §4.5's accordion
Critical), and the DSD chrome can express initial state as a plain `[open]` attribute — which the
current radio machine **cannot**, because the generator has no active tab at generation time
(§4.6). Verify the injector can stamp `[open]` on the right tab.

**Gate:** pixel parity in all three engines (or a documented, accepted difference), a disabled tab
that is inert without a flash, and the toggle-event contract preserved. **Pass →** Phase D proceeds
as written. **Fail on styling →** document the delta and get sign-off. **Fail on disabled or on the
event contract →** fall back to the original D1 scope (`<details>` for the no-JS tier only,
`<button aria-expanded>` + `role="heading"` retained when hydrated), which also recovers the
heading-navigation loss.

### 0.2 — host naming via `ElementInternals` (gates **all** of Phase B)

Two independent assumptions, both load-bearing, both currently unverified anywhere. Phase A's
`HostAriaController` is written against them, and **jsdom cannot test either** — it implements
`attachInternals()` and the ARIA state properties but not `ariaLabelledByElements`, so CI will never
exercise this. One Playwright file, Chromium + Firefox + WebKit, using accessibility snapshots.

**0.2a — does `internals.role` make a host nameable at all?** This is the keystone of Phase B and
has the widest blast radius of anything unproven in the plan: ~18 components are slated to get a
role on the host precisely so a consumer's `aria-label` lands somewhere legal. Assert that
`<mp-thing aria-label="Country">`, whose role exists *only* via `internals.role` and which carries
no `role` attribute, computes "Country" as its accessible name. Assert the control case too: the
same host with **no** role exposes no name, because naming is prohibited on `role="generic"` — which
is the defect being fixed. **Fail →** Phase B's whole architecture changes: the role has to be
expressed as a `role` *attribute* on the host, or naming stays inside the shadow root and every
component needs an explicit label property with no cross-root path at all.

**0.2b — do cross-root element references resolve inner→outer?** A WC with an `<input>` in its
shadow root, a `<label id>` in the document, and `internals.ariaLabelledByElements = [thatLabel]`.
`ariaLabelledByElements` is Baseline April 2025 and inner→outer is the permitted direction — but the
two authoritative sources disagreed during the audit (a stale WICG explainer still says "behind a
flag in Firefox"). Also assert the negative that motivates the design: the same relationship
expressed as an `aria-labelledby` **string** on the shadow input resolves to nothing. **Fail →**
tier 2 falls back to label properties only, and `aria-errormessage` needs a different design.

### 0.4 — `inert` propagation through slots (gates Phase D's carousel fix)

Created by Phase A rather than discovered in the audit: `inertRegions` writes `inert` +
`aria-hidden` together, but **jsdom does not implement `inert`'s focusability effect at all**, so
`inert-regions.spec.ts` can only assert that the attribute lands. The load-bearing claim is
untested — that `inert` propagates down the **flat** tree, so marking a shadow-DOM wrapper cell also
removes the consumer's *slotted* content from the tab order and the accessibility tree. That is the
entire reason `inert` was chosen over a `tabindex="-1"` sweep, and Phase D's carousel fix depends on
it because slides are slotted light DOM.

One page, three engines: a WC with a slotted `<button>` inside an `inert` shadow wrapper. Tab from
before it and assert focus skips to after it, and assert the button is absent from the accessibility
snapshot. **Fail →** `inertRegions` needs to walk `assignedElements()` and write `tabindex="-1"`
per node, with all the bookkeeping that implies on rebuild.

### 0.3 — `formDisabledCallback` vs `ControlValueAccessor` (gates Phase F)

The known two-writers-on-`disabled` hazard, which the repo has already been bitten by
(`otp-input.component.ts:124-131`). Take `mp-checkbox`, add `formAssociated` + the mixin sketch,
wrap it in a `<fieldset disabled>` inside a reactive form that also calls `setDisabledState`, and
confirm the single `#disabled` source of truth resolves both without a loop or a stale attribute.
Small, but it is the one part of Phase F that is design rather than boilerplate.

**Sequencing:** **0.2 must complete before Phase B starts** — 0.2a can invalidate B's architecture,
not merely narrow it, and Phase A already shipped code written against it. **0.1 must complete
before Phase D**, and **0.4 before D's carousel work**. 0.3 is independent and can run any time
before F.

Note what these three have in common: each covers a platform behaviour that **CI structurally
cannot** reach, because jsdom implements neither `ariaLabelledByElements` nor `inert`'s focusability
effect, and cannot judge visual parity. They are not a formality before "real" work — they are the
only verification these particular claims will ever get, which is why each carries an explicit
fail-path above.

---

## Phase A — WC a11y primitives ✓ LANDED

Nothing else in the plan works properly without these. `HostAriaController` is first: the Angular
wrapper fix in B has nowhere to deliver attributes without it.

**As built** — seven commits, `2c13e5b0`…`27893419`, one per file below. Everything type-checks; per
the batching rule the suites run once, in G. Two things learned in passing that change later phases:

- **jsdom implements `attachInternals()` and the `ElementInternals` ARIA state properties, but not
  `ariaLabelledByElements`.** So role and state are unit-testable and cross-root reference
  resolution is not — it needs a real browser in all three engines. That is exactly spike 0.2, and
  it is now load-bearing rather than precautionary: `HostAriaController.syncReferences()` has an
  untested-in-CI path. `host-aria.spec.ts` documents the gap instead of pretending to cover it.
- **`RovingFocus` deliberately omits an `aria-activedescendant` mode**, unlike the Angular directive
  it ports. Inside a shadow root that attribute cannot work (it is an IDREF), which is precisely why
  `mp-time-list` is inert. Any Phase C or E work that reaches for activedescendant should use
  roving tabindex instead — including the combobox work, where the popup and the input must
  therefore end up in the same tree.

| File | Content |
|---|---|
| `libs/mintplayer-web-components/a11y/src/host-aria.ts` | `HostAriaController` — `attachInternals()`; role + reflected state on the host; resolves host `aria-labelledby`/`-describedby` IDREFs **in the host's own tree** into `internals.ariaLabelledByElements` / `ariaDescribedByElements` |
| `.../a11y/src/focus-trap.ts` | `FocusTrapController` — ported from `BsOverlayFocusDirective`; must walk `composedPath`/`assignedElements()` (a `querySelectorAll` in one root misses slotted content) |
| `.../a11y/src/dismiss-stack.ts` | module-singleton document-scoped LIFO; `OverlayController` delegates, `BsOverlayStackService` becomes a thin Angular facade over it |
| `.../a11y/src/roving-focus.ts` | `RovingFocusController` — `{ orientation, wrap, itemsProvider }`, items from shadow **or** `assignedElements()` |
| `.../a11y/src/focus-restore.ts` + `.spec.ts` | `FocusRestore` + `FocusRestoreController` + `deepActiveElement`. **No `lit` import.** Six spec cases, the first being "focus outside the root → capture records nothing and restore does not move focus" |
| `.../a11y/src/inert-regions.ts` + `.spec.ts` | `inertRegions()` — writes `inert` + `aria-hidden` together; callers declare the current hidden set, never deltas; reference-counted `suspend()`/`resume()` for transitions; moves focus out before hiding |
| `.../a11y/src/index.ts` | export all of the above |
| `libs/mintplayer-web-components/_styles/` | `--mp-focus-ring` token + `mp-focus-ring` mixin |
| `.../overlay/src/overlay-controller.ts` | `initialFocus?: HTMLElement \| 'first' \| 'self' \| 'none'` (default `'none'`) and `modal?: boolean`; **capture the return target in `open()`** from the composed active element; demote `trigger` to an explicit override; dev-mode warn when the restore target is missing or unfocusable |
| `tools/e2e-shared/` + WC spec helpers | `expectIdrefResolves(el, attr)` — resolves each token against `el.getRootNode()`, the **holder's** root |

`aria-modal` and background `inert` stay **out** of `OverlayController` (it cannot know whether its
host is a dialog or a menu). Gate Tab containment on `isFrameTop()` so an inner overlay's trap does
not fight its parent's.

**Acceptance**: six primitives exported and unit-tested; `OverlayController`'s capture-at-open
proven to restore focus correctly for a nested overlay pair; `expectIdrefResolves` fails on exactly
the six known-dead IDREF sites.

---

## Phase B — naming and wrapper transparency

Highest accessibility gained per hour in the whole plan. Unblocks the validity mirror in E.

**WC label properties** (`inputLabel` / `input-label`, per D3): add to `mp-select` **first** (the
only control with no fallback naming path at all), then `mp-radio`, `mp-toggle-button`,
`mp-checkbox`, `mp-multi-range`, `mp-datepicker`, `mp-timepicker`, `mp-tree-select` (plus
`search-label`), `mp-datatable` (plus a `caption`), `mp-timeline`, `mp-dropdown-menu`,
`mp-code-snippet`, `mp-ribbon` (`regionLabel`, guarding the unconditional `setAttribute` clobber),
`bs-typeahead`, `bs-progress-bar` (default `'Progress'`), `bs-close`, `bs-rating`,
`bs-breadcrumb`. Rename `mp-otp-input.label` → `inputLabel` across the WC and all three wrappers.

**Tier-2 cross-root naming mixin** — the `HostAriaController` translation path adopted by every WC
form control. Delete `mp-checkbox`'s IDREF forwarding (`:245-246`, `:271-272`); replace
`mp-dropdown-menu`'s `label-id` with a string `label`, keeping `label-id` as a deprecated alias
that reads the referenced element's `textContent`.

**Angular** — new `BsForwardAriaDirective` in `@mintplayer/ng-bootstrap/a11y`, applied to the inner
`mp-*` element of all 22 nested-host wrappers, plus `role="presentation"` on the `bs-*` host and
`tabindex` stripped from it. Retire the three ad-hoc idioms (`carousel`/`navbar` bespoke inputs,
`bs-select`'s `Renderer2` call). Forward `inputLabel` on `bs-datetime-picker` (currently the one
label input the wrapper omits).

**React** — 10 files: extend `React.HTMLAttributes<I>` on the public **and** private inner props
types (fixing only the public one leaves attributes rejected one level down — see
`BsNavbar.tsx:34`), and add `...rest` to `BsAccordionItem` and `BsTimeline`, which drop attributes
at runtime. Includes `BsNavbarBrand`/`BsNavbarDropdown`, whose defect hides behind
`as unknown as` casts.

**Vue** — one ordering fix: `v-bind="$attrs"` **after** the explicit `:aria-label` in the navbar
SFCs.

**The wrapper passthrough spec lands HERE, first, before the 22 wrappers are touched** — moved out
of Phase G, where it was listed. It is this phase's regression net, and a net written after the work
it guards is not a net: the whole point is to fail on the 22 Angular wrappers *before* the fix, then
go green as they land, so "forwarded" is proven rather than assumed. Same for the React
`tsc --noEmit` type-test — write it, watch it fail on the 10 known-defective wrappers, then fix them.
Spec details are in Phase G's table; only the ordering changes. Phase G keeps the axe gate, the
per-component ARIA specs and the docs.

**Localization** — route `query-builder`'s and `file-manager`'s hardcoded `aria-label`s through the
message bundles they already ship (zero design work); add label properties for the other 18
components' 44 hardcoded strings. Any interpolated announcement takes a **formatter function**, not
a prefix/suffix. Fix the one `aria-label`-defeats-localized-`title` instance
(`mp-query-group.element.ts:232-233`).

**Also here** — `bs-floating-label`: widen the projection selectors *and* wire the projected
`<label>` into the tier-2 mechanism (widening alone ships an unnamed control that looks correct);
`bs-card-img` `alt` defaults to `''` in all three wrappers.

**Acceptance**: for every component in the list, a consumer can set an accessible name from all
three frameworks and it reaches the role-bearing node; `aria-labelledby` on a wrapper host resolves
to a live element reference; no `aria-label` remains a bare English literal in a component that
parameterises its visible text.

---

## Phase C — keyboard operability and focus continuity

The largest Critical class. Several fixes already exist elsewhere in the same file.

**Pointer-only → keyboard-operable**: datatable header sort (wrap the label in a real `<button>`)
and column resize (port `13e1e03d~1:…/datatable.component.ts:634-662` nearly verbatim — same
`_columnWidths` model) and single-mode row selection; dock's 8 floating resizers (copy the
intersection handle at `:808-829`) and floating pane move/re-dock; **file-manager Enter-to-activate
in all views** and the ungating of the upload button from `pointer: coarse`; file-manager context
menu focus-in / arrow keys / focus-return; scheduler month-view events and the "+N more" button and
year drill-down; timeline `activatable`; `mp-dropdown-menu` Enter/Space on `menuitem`;
`mp-time-list` roving tabindex + `.focus()` replacing the dead `aria-activedescendant`;
tree-select combobox keyboard model (port `BsComboboxDirective`'s contract into the shadow root);
`[bsDropdown]` menu-mode ArrowDown-opens-and-enters plus unconditional Escape; popover trigger
focusability + `[bsOverlayFocus]`; context-menu `tabindex`/Shift+F10/Escape/focus-in;
tooltip `focusin`/`focusout` + hoverable delay; offcanvas `closeOnEscape` + conditional
`aria-modal`; multi-range `aria-disabled` instead of native `disabled`; `bs-rating`'s unset-value
tab stop; treeview's `composedPath()[0] !== row` guard so consumer node templates keep their keys;
query-builder's Alt+Arrow guard accepting the drag handle that advertises it.

**Focus continuity** — adopt `FocusRestore` in `mint-dock-manager` (intersection handles by
`data-key`; panes by the normalised `${tabId}-header-button`), all five scheduler views (via
`BaseView`, collapsing the four hand-rolled rAF blocks), `mp-splitter`, `mp-tree-select` (chips);
plus `mp-query-builder`'s remove paths setting `_pendingRefocusId` (the machinery already exists),
`bs-alert` on dismiss, and `mp-pagination` keying `repeat()` by page so reflow does not silently
relabel the focused button.

**Escape/dialog** — wire `initialFocus` on the six `role="dialog"` popups (pickers focus the
selected date cell per APG); scope the dock's move mode to the originating tab and clear it on
`focusout`.

**Signature-pad** ships a typed-signature alternative plus Clear/Undo in the tab order; document
honestly that freehand drawing has no keyboard equivalent.

**Acceptance**: a keyboard-only Playwright walkthrough per affected component proves every control
a mouse user can see is focusable and activatable; no interaction leaves `document.activeElement`
on `<body>`; every demo keymap panel claim is true (the false ones are §4.10).

---

## Phase D — hidden content, the no-JS tiers, and SSR chrome

Independent of B and C. Carries decision D1.

**Hidden-but-reachable** — apply the `mp-navbar` `visibility` rule (§5.6) to `.accordion-clip` and
to the carousel's no-JS per-index CSS; mirror the shell's state matrix a second time to set
`visibility` (its open state is a custom-property value, which CSS cannot select on). Adopt
`inertRegions` for the carousel's JS tier including the two teleport clone cells, and add a static
`inert` to `bs-priority-nav`'s measurement clone (`visibility: hidden` also works there —
measurement needs geometry, not visibility; `display: none` would zero the measurements).

**The accordion rewrite (D1)** — `mp-accordion` moves to `<details name>` + `<summary>` in both
tiers. This is the largest single item in the plan and it **removes** more than it adds:

| Delete | Replace with |
|---|---|
| `#renderJsItem` + `#renderNoJsItem` (two templates) | one template |
| the clipped `<input type=radio\|checkbox>` machine and every `:checked` selector | `<details ?name=${!multi ? 'acc' : nothing}>` |
| the `data-js` branch in this component | — (state is UA-owned in both tiers) |
| `grid-template-rows` animation + `.accordion-clip` + its reduced-motion guard | — (animation waived under D1) |
| the §4.5 `visibility` fix for collapsed panels | — (`<details>` removes closed content from both trees natively) |
| `role="heading"` + `aria-level` on the header | **nothing** — the known D1 trade; see the SR check below |

Preserve, and re-point at `[open]` instead of `:checked`: the destructive DSD handoff reading
pre-upgrade state onto the light-DOM `is-active` markers; `#setActive` / `closeAll` / the nested
recursive close, now driven from the `toggle` event rather than clicks; the
`mp-accordion-tab-toggle` event contract and detail shape; `aria-controls`↔`aria-labelledby`
round-trips in the chrome; `multi` semantics, which reduce to the presence or absence of `name`.
Bootstrap styling: `display: flex` + `list-style: none` + `::marker { content: '' }` +
`::-webkit-details-marker { display: none }` on `<summary>`; `.accordion-button`'s `::after`
chevron is unaffected. Regenerate the `[multi] × [count]` chrome — index-named slots still need
count variants. **Rewrite `mp-accordion.spec.ts` first, then the element**, and add an
NVDA + VoiceOver check specifically on whether losing heading navigation is acceptable in practice;
if not, the reversal is `role="heading"` + `<button aria-expanded>` in the hydrated branch only.
Angular/React/Vue wrappers and the three demo pages follow.

**Tier 1 machines** — the accordion is no longer one of these. `bs-tab-control` and
`bs-priority-nav` SSR branches: swap `d-none` for the 1px-clip class, move
`role`/`aria-selected`/`aria-controls`/`aria-haspopup` onto the input, strip `role`/`tabindex` from
the `<label>`, paint the focus ring via a sibling selector. `mp-navbar`: emit the checkbox
**without** `role="button"`/`aria-expanded` in the static chrome (native `checked` is a correct
self-updating channel) and upgrade in `connectedCallback`. `mp-shell`: `id` on the `<aside>` +
`aria-controls` on the input (both in the same shadow root — the one place a shadow-internal IDREF
is trivially available and unused), `aria-expanded` under `data-js` driven by `#cssOpen()` **not**
the inverted raw `checked`, plus the missing `:focus-visible` ring and a `prefers-reduced-motion`
guard.

**Also**: `mp-shell` gains landmark roles for topbar/content and **a skip link** — there is none
anywhere in the repo, so WCAG 2.4.1 (Level A) is unmet for every app built on `bs-shell`.

**SSR chrome** — give `inject-mp-dropdown-dsd.ts` a spec **first**, then a traversal that stamps
`role="menuitem"`/`option` (read from the host's `mode`) on depth-0 items; carousel injector stamps
`slot="s{i}"` (reusing `countSlides`) and the generator gates `aria-current` behind `isBrowser`;
accordion injector stamps `heading-level` and treats `<mp-accordion-tab>` by tag name so vanilla
markup matches wrapper output. Deliver `role="listitem"` for navbar items **statically from the
wrappers**, not from `connectedCallback`, or it will be absent from the DSD.

**Acceptance**: with JS disabled, in all three demo apps — no collapsed region's content is
readable or focusable; every no-JS control is keyboard-operable; no role ships without its required
owned children; no ARIA attribute states something false. Asserted in the existing
`javaScriptEnabled: false` suites.

---

## Phase E — state, structure, live regions, validity

Depends on A (roving focus) and B (tier-2 mixin, for `aria-errormessage`).

**Roles and structure** — datatable `role="grid"` per D2; file-manager icon grid → `listbox`/
`option` with roving focus; priority-nav drops `role="menu"`/`menuitem` for plain disclosure +
list; scheduler adds `role="presentation"` to the un-roled wrappers breaking the grid chain and a
`applyGridRoles()` helper in `base-view.ts` giving week/day/month/year the containers,
`columnheader`s and `rowheader`s their cells already assume (closing
`wc-aria-accessibility.md` step 5.7); `bs-tab-page` drops its four duplicate ARIA host bindings on
the client path; ribbon tab↔tabpanel — render the panel wrapper inside `mp-ribbon`'s shadow root so
both ends of the relationship are minted in one `render()` (the `mp-tab-control` pattern), rather
than the cheaper `aria-label`-string mitigation; `mp-ribbon-gallery` moves `role="option"` onto the
item host; navbar `role="listitem"`; dock drops `role="application"` for
`role="region"` + a label.

**State tokens** — `aria-current="page"` on navbar items and dropdown triggers (plus the Angular
`RouterLinkActive` bridge for leaf items); `aria-current="date"` on the scheduler's `.today` in all
four views; **replace the scheduler's `aria-current="true"`-for-selection with `aria-selected`**;
`aria-multiselectable` on multi-select `mp-treeview`; `aria-expanded` on the accordion's no-JS
input; `aria-pressed` always written, not only when true; `aria-level` on query-builder groups;
`aria-valuenow`/`min`/`max` on `bsResizeGlyph` and the dock intersection handle; `aria-valuetext`
on the splitter; `aria-colcount`/`aria-colindex` on the datatable **as the prerequisite it is** for
any future column hiding/reordering.

**Live regions** — adopt `LiveAnnouncerController` in `mp-datatable` (sort, page, selection count,
loading→loaded with row count, `aria-busy` while fetching), `mp-file-manager` (upload
start/complete/**fail** at `assertive`, delete, paste, new folder, rename, search count),
`mp-tree-select` (result count, chip add/remove with the item name, clear, `aria-busy`),
`mp-treeview` (lazy load start/finish/**error**, the error as `aria-describedby` text not a
`title`), `mp-scheduler`'s `setLoading`. Angular: route `bs-toast` through
`BsLiveAnnouncerService` (its container has no `aria-live` and the first toast attaches region and
text in one task), make `bs-alert`'s `role` opt-in and default it off, announce `[bsCopy]`
completion in the directive, fix `bs-placeholder` (skeleton `aria-hidden`, drop the
subtree-wide `aria-live`), give `mp-code-snippet`'s copy toast `role="status"`, and remove
`aria-live`+`aria-label` from `mp-file-manager`'s static drop overlay. **Never** add `aria-live` to
an existing conditional block — the region must be rendered unconditionally and only its text may
change.

**Validity** — the four missing `onTouched` calls **first** (`checkbox`, `checkbox-group`,
`radio-group`, `range`), then `invalid`/`required` attributes on the WC form controls mapped to
`aria-invalid`/`aria-required` (copy `mp-otp-input:385`), then the Angular wrappers mirroring
`NgControl.invalid && touched`, then `aria-errormessage` pointing at an in-shadow node.

**Retire the duplicated roving-focus arithmetic.** `BsRovingFocusDirective` predates the WC
`RovingFocus` controller and had independently identical `step` / `firstEnabledIndex` /
`lastEnabledIndex` logic — already drifted on the wrap-vs-clamp default. Phase A extracted the pure
index math (`nextEnabledIndex`, `firstEnabledIndex`, `lastEnabledIndex` in
`@mintplayer/web-components/a11y`) and moved the WC controller onto it; **point the Angular
directive at the same functions here**, deleting its private copies. Its 190-line spec is the
regression net, so it should stay green untouched.

Deliberately **not** collapsing the two into one class, for two concrete reasons rather than taste:
the Angular directive writes `tabindex` through a host binding on each item directive while the
controller writes `el.tabIndex` imperatively, so delegating wholesale would put **two writers on one
attribute** — the hazard already documented at `otp-input.component.ts:124-131`; and the directive's
`activedescendant` mode is *correct* for its light-DOM consumers (`bs-typeahead`,
`bs-dropdown`'s combobox), where IDREFs resolve fine. The WC controller omits that mode because it
cannot work across a shadow boundary, which is a constraint of shadow DOM, not a judgment that
activedescendant is wrong. Angular keeps its content-query discovery, its signals, and that mode.

**`<mp-radio-group>`** — after `mp-radio` exposes its inner input's `tabindex` (`delegatesFocus`
means host `tabindex="-1"` does not remove the inner input from the tab order). Roving tabindex
with the tab stop on the **first enabled radio when nothing is checked**, arrow move-and-select
with wrap and RTL inversion (copy `mint-multi-range:277`), Home/End, `aria-posinset`/`-setsize`.
`[bsRadioGroup]` becomes the CVA adapter. `[bsCheckboxGroup]` gets `role="group"` + a label input
and **nothing more**.

**Also** — tile-manager: preview-based move mode so Escape genuinely reverts, `aria-pressed` +
reactive move-mode state, `aria-describedby` moved from the region **onto the tiles**; dock: the
full drop-target enumeration for keyboard moves and announcements guarded on actual success;
`prefers-reduced-motion` for `spinner` (stop re-declaring the `animation` shorthand after the
Bootstrap import — that is what discards Bootstrap's reduce override), `placeholder`,
`progress-bar`, `shell`, `tree-select`, `query-builder`; `bs-alert-close` re-implemented over
`bs-close`; `bs-badge` `unit`/`decorative`; `bs-card-title` `level`; `bs-list-group-item`
`active`/`disabled`; `bs-progress-bar` `valueText`; `mp-calendar`'s corner `<th>` un-hidden and its
month-nav buttons lifted out of the grid; `bs-marquee` pause control + a role that supports
naming; carousel play/pause moved first in DOM order, pause-on-hover/focus, and prev/next per
§4.1's precedent; `mp-select` `<optgroup>` support; `bs-scrollspy`'s duplicate `title`;
`mp-toast`'s scroll-blocking overlay and its non-firing dismiss button.

**Acceptance**: every state a component maintains is exposed on the element carrying the role and
updates in the same render; every async transition announces; the token used is justified against
the container role; no `role` remains without its pattern's keyboard model.

---

## Phase F — form association (per D5)

`FormAssociatedMixin` in `libs/mintplayer-web-components/a11y/`, sharing the `attachInternals()`
call with `HostAriaController` — the two must not fight over it. `setFormValue` (with a separate
restorable state where they differ), `setValidity` anchored to a **focusable in-shadow element**
(`delegatesFocus` is already set on every choice control, so this is straightforward),
`formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback`, and the proxy getters.

**One internal `#disabled` source of truth** with `formDisabledCallback` and the CVA both funnelling
into it, neither writing the DOM attribute — the repo has already been bitten by this exact shape
(`otp-input.component.ts:124-131`). Adopt in `mp-checkbox` first, then spread. `<mp-radio-group>` is
the form-associated element for radios, not the individual radios.

This repairs the already-dead `name` API and makes these controls contribute to React 19 form
Actions and to plain-`<form>` submission. Nothing WCAG-blocking waits on it.

---

## Phase G — guards, CI, documentation

Specs land **with** each phase; this phase adds what is cross-cutting and closes out.

| Item | Detail |
|---|---|
| `*.aria.spec.ts` per element-bearing WC | 20 of 30 have none; 9 have no spec file at all. Assert role, name and **each state transition**. Use `expectIdrefResolves` for every IDREF |
| ~~Wrapper passthrough spec ×3~~ | **Moved to Phase B** — it guards B's work and must precede it. Spec shape: `import.meta.glob` enumeration so new wrappers are covered with zero edits; opt-out and required-children registries as literal arrays *in the spec*; the load-bearing assertion is that the element receiving the probe `id` has a tag matching `MP-`/`MINT-`. Add `test` targets + `vite.config.mts` to the React and Vue libs (vitest + jsdom, `--pool=threads`); no new dependencies |
| ~~React type-test target~~ | **Moved to Phase B.** `tsc --noEmit` over a committed probe, one line per exported wrapper, probing **`role`/`id`/`tabIndex` — never `aria-*`**, because TypeScript exempts hyphenated JSX attribute names from excess-property checking and an `aria-*` probe passes vacuously on every broken wrapper. Put that sentence in a comment at the top of the probe |
| `e2e-a11y` axe target ×3 apps | Table-driven over a route list; `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'])`; fail on `critical` + `serious`; two states per route (load + one interaction); **plus a `javaScriptEnabled: false` pass**. Separate CI step so `nx affected` cannot silence it. Per-route allow-list with issue links, never a lowered threshold |
| Keyboard-only walkthrough | One Playwright spec per interactive component: every visible control focusable and activatable. This is the gate that would have caught all seven migration regressions |
| `CLAUDE.md` `## Accessibility` | Eleven rules + the two no-JS tier rules + a six-item pre-PR checklist, inserted after `## Framework wrappers`. Text drafted in the audit; keep it ruthlessly concise |
| Demo keymap parity | Port the `<details>Keyboard shortcuts</details>` panels to the React and Vue dock / scheduler / tile-manager / timeline / splitter pages (only Calendar and Ribbon have one today); add the missing ng timeline panel; **correct the false claims** in the tile-manager and file-manager panels |
| Stale-doc fixes | `swiper-aria.md`, `aria-accessibility-audit.md` §13.2 (reduced-motion directive, carousel structural directive), `navbar-noscript.md` — fix the prose; do **not** re-implement deleted APIs. Delete or re-document the zero-consumer `BsReducedMotionDirective` |
| Spike cleanup | Delete `_spike-*` directories and the temporary accordion comparison route; record each spike's verdict in the PRD (especially 0.1, which may have narrowed D1) |
| PRD status | Flip both documents to as-built; record D1–D5 as resolved with outcomes; update the memory of record |

Then the single sweep: `nx build` for all four libs, `nx test mintplayer-web-components`,
`nx test mintplayer-ng-bootstrap`, the new React/Vue test targets, the React type-test, and the
full e2e + `e2e-a11y` matrix across all three demo apps.

---

## Acceptance criteria (programme level)

- [ ] All three Phase-0 spikes concluded, each with a written verdict in the PRD; spike artifacts
      and the temporary demo route deleted, and any assertion worth keeping moved into a real spec.
- [ ] All 42 Critical findings closed; all ~110 Major closed or explicitly deferred with a reason.
- [ ] **Every exposed state is live** (PRD §11a): for each state attribute touched, a spec asserts
      it after a *transition*, not only at first render — including programmatic changes, not just
      user-driven ones. No attribute is written from an event handler as a side effect.
- [ ] **Criteria are observable, never attribute presence.** For each closed finding: what a screen
      reader says, and where focus lands. "Present but inert" is this library's characteristic
      failure and it passes attribute-level assertions by construction.
- [ ] A consumer can set an accessible name, description and `id` on **every** component from
      **all three** frameworks, and it reaches the role-bearing node.
- [ ] No component has a pointer-only path to any of its functions.
- [ ] No interaction anywhere leaves focus on `<body>`.
- [ ] With JS disabled, no component's static markup states anything false, and every no-JS control
      is keyboard-operable.
- [ ] Every element-bearing WC has an ARIA spec asserting states, not just initial render.
- [ ] The `e2e-a11y` gate is green (with a documented allow-list) and cannot be skipped by
      `nx affected`.
- [ ] `CLAUDE.md` carries the rules; every demo keymap panel claim is true.
- [ ] NVDA (Windows/Chrome) and VoiceOver (macOS/Safari) spot checks on the ten highest-traffic
      components confirm the observable criteria — axe would have caught none of the data-display
      Criticals, so it is a floor, not the gate.

## Build and test commands

```bash
npx nx build mintplayer-web-components        # runs codegen-wc + cem
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components         # vitest + jsdom, --pool=threads on Windows
npx nx test mintplayer-ng-bootstrap
npx nx test mintplayer-react-bootstrap        # NEW target (Phase G)
npx nx test mintplayer-vue-bootstrap          # NEW target (Phase G)
npx nx run mintplayer-react-bootstrap:typecheck-a11y   # NEW (Phase G)
npx nx run mintplayer-web-components:codegen-wc                 # after any .scss/.html edit
npx nx run mintplayer-web-components:codegen-ssr-chrome         # after any shadow markup edit
npx nx run-many --target=e2e-a11y                               # NEW (Phase G)
```

`NX_ISOLATE_PLUGINS=false NX_DAEMON=false` if the Nx plugin worker flakes.

## Key references

PRD §5 for every design decision and §11 for D1–D5. Reference implementations to copy rather than
redesign: `mp-navbar` (Tier-1 machine + the geometric-hiding `visibility` rule, with the comment
explaining the directional delay), `mp-accordion` (`data-js` two-tier branch), `mp-treeview`
(shadow composite), `mp-splitter` (APG Window Splitter, incl. `updateDividerAriaValues`),
`mp-calendar` (date grid + `aria-current="date"`), `mp-pagination` (host-`aria-label` mirroring),
`mp-datetime-picker` (six parameterised labels + `announceValue`), `mp-code-snippet:253` and
`mp-calendar:358` (persistent live regions), `mp-scheduler`'s move mode (preview-then-commit — the
model tile-manager should have copied), `inject-mp-carousel-dsd.ts:48-57` (`stampHostA11y`),
`mint-dock-manager.element.ts:808-829` (the focusable resize handle its own floating resizers
should copy), `BsComboboxDirective`, `BsOverlayFocusDirective`, `BsOverlayStackService`,
`breadcrumb.aria.spec.ts:43-53` (asserting the *value* of a state token, not just its presence).

Deleted templates that are working specifications: `13e1e03d~1:…/datatable.component.ts:634-662`
(keyboard column resize against the same model the WC uses), `13e1e03d~1:…/datatable.component.html`
(header sort keyboard), `207d85f7~1:…/carousel.component.html:60-107` (real button controls),
`17328c57~1:…/navbar-item.component.html:1` (real `<li>`), `e5bc071e~1:…/searchbox.component.ts:47`
(the `ariaLabel` input — and **only** that; the rest of those controls was poor).

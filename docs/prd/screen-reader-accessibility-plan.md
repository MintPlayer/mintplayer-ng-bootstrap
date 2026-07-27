# Plan — screen-reader accessibility across the four libraries

Status: **not started** — 2026-07-27. Companion PRD: `docs/prd/screen-reader-accessibility.md`
(findings, design rationale, and decisions D1–D5).

Seven phases, A→G. Each is independently shippable and is one coherent PR. **A, B and C close the
majority of user-visible impact**; D–F are deep but narrower; G closes it out. Branch base is
`master`. Per `CLAUDE.md`, verify intermediate work by reading code and type-checking — the build +
unit + e2e sweep runs **once**, in G.

## Decisions to settle before starting

D1 (`<details name>` for the accordion's no-JS tier) gates **Phase D**. D2 (datatable
`role="grid"`) gates **Phase E**. D3 (`inputLabel` rename) gates **Phase B**. D4 (move-mode key)
gates a one-line change in E. D5 (is FACE in scope) gates whether **Phase F** happens at all.
A–C need none of them, so work can start while D1–D5 are open.

---

## Phase A — WC a11y primitives

Nothing else in the plan works properly without these. `HostAriaController` is first: the Angular
wrapper fix in B has nowhere to deliver attributes without it.

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

**Tier 1 machines** — `bs-tab-control` and `bs-priority-nav` SSR branches: swap `d-none` for the
1px-clip class, move `role`/`aria-selected`/`aria-controls`/`aria-haspopup` onto the input, strip
`role`/`tabindex` from the `<label>`, paint the focus ring via a sibling selector. `mp-navbar`:
emit the checkbox **without** `role="button"`/`aria-expanded` in the static chrome (native
`checked` is a correct self-updating channel) and upgrade in `connectedCallback`. `mp-shell`:
`id` on the `<aside>` + `aria-controls` on the input (both in the same shadow root — the one place
a shadow-internal IDREF is trivially available and unused), `aria-expanded` under `data-js` driven
by `#cssOpen()` **not** the inverted raw `checked`, plus the missing `:focus-visible` ring and a
`prefers-reduced-motion` guard. Accordion no-JS per D1.

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
| Wrapper passthrough spec ×3 | `import.meta.glob` enumeration so new wrappers are covered with zero edits; opt-out and required-children registries as literal arrays *in the spec*; the load-bearing assertion is that the element receiving the probe `id` has a tag matching `MP-`/`MINT-`. Add `test` targets + `vite.config.mts` to the React and Vue libs (vitest + jsdom, `--pool=threads`); no new dependencies |
| React type-test target | `tsc --noEmit` over a committed probe, one line per exported wrapper, probing **`role`/`id`/`tabIndex` — never `aria-*`**, because TypeScript exempts hyphenated JSX attribute names from excess-property checking and an `aria-*` probe passes vacuously on every broken wrapper. Put that sentence in a comment at the top of the probe |
| `e2e-a11y` axe target ×3 apps | Table-driven over a route list; `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'])`; fail on `critical` + `serious`; two states per route (load + one interaction); **plus a `javaScriptEnabled: false` pass**. Separate CI step so `nx affected` cannot silence it. Per-route allow-list with issue links, never a lowered threshold |
| Keyboard-only walkthrough | One Playwright spec per interactive component: every visible control focusable and activatable. This is the gate that would have caught all seven migration regressions |
| `CLAUDE.md` `## Accessibility` | Eleven rules + the two no-JS tier rules + a six-item pre-PR checklist, inserted after `## Framework wrappers`. Text drafted in the audit; keep it ruthlessly concise |
| Demo keymap parity | Port the `<details>Keyboard shortcuts</details>` panels to the React and Vue dock / scheduler / tile-manager / timeline / splitter pages (only Calendar and Ribbon have one today); add the missing ng timeline panel; **correct the false claims** in the tile-manager and file-manager panels |
| Stale-doc fixes | `swiper-aria.md`, `aria-accessibility-audit.md` §13.2 (reduced-motion directive, carousel structural directive), `navbar-noscript.md` — fix the prose; do **not** re-implement deleted APIs. Delete or re-document the zero-consumer `BsReducedMotionDirective` |
| PRD status | Flip both documents to as-built; record D1–D5 as resolved; update the memory of record |

Then the single sweep: `nx build` for all four libs, `nx test mintplayer-web-components`,
`nx test mintplayer-ng-bootstrap`, the new React/Vue test targets, the React type-test, and the
full e2e + `e2e-a11y` matrix across all three demo apps.

---

## Acceptance criteria (programme level)

- [ ] All 42 Critical findings closed; all ~110 Major closed or explicitly deferred with a reason.
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

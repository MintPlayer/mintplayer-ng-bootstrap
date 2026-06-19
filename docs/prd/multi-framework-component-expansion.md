# PRD: Multi-framework component expansion (Angular → WC + React + Vue)

**Status:** Proposed.
**Author:** Pieterjan (with research input from a Claude exploration team).
**Date:** 2026-06-19.
**Libraries:** `@mintplayer/web-components` (new elements), `@mintplayer/ng-bootstrap`, `@mintplayer/react-bootstrap`, `@mintplayer/vue-bootstrap` (wrappers), plus a new `@mintplayer/swiper-core` (framework-agnostic gesture/slide engine).
**Branch base:** `master` (per `feedback_issue_branch_base`).

---

## 1. Problem

The workspace is mid-migration from "Angular-only" to "one Lit web component + hand-written per-framework wrappers" (dock / scheduler / timeline / treeview / tree-select / shell are the precedent). Today the coverage is lopsided: **24 components are fully migrated** (WC + Angular + React + Vue), but **the bulk of the catalog still exists only in Angular.** React and Vue consumers cannot use most of the library.

The user wants to close that gap across all three frameworks — **navbar and carousel first**, then the rest of the viable UI catalog — as a single waved program. Two hard constraints frame the work:

1. **No-JavaScript support MUST remain in place.** Every component that supports a no-JS render today must keep working with JS disabled. This is non-negotiable and is the single biggest design risk, because the Angular library's noscript technique (`bsNoNoscript` adds `.noscript`, then `::ng-deep`/light-DOM `:checked`/`:has()` CSS) **does not cross a shadow boundary** — a naïve WC port silently loses the no-JS layout.
2. **No HTML duplication across frameworks** (established in `shell-wc-ssr`): the layout/markup for a component lives in exactly one place — the WC's `render()` — never re-authored as a light-DOM twin per framework.

## 2. Corrected coverage inventory

A coverage sweep produced the matrix below. **Important correction:** several directories under `libs/mintplayer-web-components/` contain **only codegen'd `.styles.ts` (no Lit element, no barrel)** — they are *style stubs from an aborted earlier pass*, not implementations. The raw directory listing makes them look migrated; they are not.

| Bucket | Count | Components |
| --- | --- | --- |
| **Fully migrated** (WC + ng + react + vue) | 24 | calendar, card, checkbox, code-snippet, datatable, datepicker, datetime-picker, dock, file-manager, multi-range, otp-input, pagination, query-builder, radio, ribbon, scheduler, select, shell, tab-control, tile-manager, timeline, timepicker, tree-select, treeview |
| **Style-stub only** (codegen'd CSS, *no element*) | 3 | accordion, dropdown-menu, navbar |
| **Reverse gap** (WC + react + vue, no Angular wrapper) | 1 | **splitter** |
| **Cross-framework divergence** | 1 | **toggle-button** (Angular dropped it for the checkbox/radio split; React + Vue still ship it alongside checkbox/radio) |
| **WC-only infrastructure** (intentional, no wrappers) | 3 | overlay, scheduler-core, timeline-core |
| **Angular-only** | ~64 | everything else (see §4 triage) |

### What this corrects from first-pass analysis
- **navbar is not a "partial."** Its WC dir is style-stub-only; it needs a full WC build. (The extracted SCSS is a small head start.) Same for **accordion** and **dropdown-menu**.
- **carousel** is genuinely Angular-only and additionally depends on the Angular-only `@mintplayer/ng-swiper`.
- **splitter** is the only true "cheap win" (add one Angular wrapper).

## 3. Goals / Non-goals

**Goals**
1. **navbar** and **carousel** ship as Lit WCs with Angular + React + Vue wrappers, no-JS-capable, no HTML duplication. (Wave 1.)
2. Extract `@mintplayer/ng-swiper`'s gesture/slide logic into a **framework-agnostic `@mintplayer/swiper-core`** TS engine that the carousel WC (and any future swipe UI) consumes; the Angular `ng-swiper` directives become thin adapters with **no public breaking change**. (Wave 0.)
3. Migrate the remainder of the **viable UI catalog** to the WC-plus-wrappers model across all three frameworks, in dependency-ordered waves (§5), each with its own exit criteria.
4. Every migrated component preserves its **no-JS tier** (§6) — interactive-no-JS (CSS state machine) where it exists today, visible-but-inert (DSD) otherwise.
5. Reconcile the cross-framework inconsistencies: give **splitter** an Angular wrapper; align **toggle-button** vs checkbox/radio across all three frameworks.
6. Each migrated component gets a demo page in all three demo apps and Playwright e2e (incl. a no-JS spec where it has a no-JS tier).

**Non-goals**
- **Migrating pure Angular directives / pipes / DI services to web components.** These have no DOM element to wrap; a WC would be the wrong abstraction. They stay Angular-idiomatic; React/Vue get an idiomatic equivalent only if a real consumer needs one. (Explicit exclusion list in §4.3.)
- A generic SSR framework for arbitrary third-party WCs — we reuse the shared DSD render path from `shell-wc-ssr` and extend it per component.
- Server-side data fetching / API SSR.
- Backwards-compatibility shims. Per `feedback_breaking_changes_ok`, document the breaks; don't carry shims.
- Net-new visual variants or features beyond what the Angular component does today (parity migration, not redesign) — unless a no-JS tier *requires* a new capability (e.g. navbar gains an in-shadow `:checked` toggle, as shell did).

## 4. Component triage

### 4.1 Headliners & reconciliations (Wave 0–1)
| Component | Work | Notes |
| --- | --- | --- |
| swiper-core | Extract pure-TS engine | ~300–400 LOC class; 60–70% of ng-swiper ports directly. |
| carousel | New WC + 3 wrappers | On swiper-core. Has model `paused` (two-way); slide index emitted via event. Existing radio+label noscript fallback → port to in-shadow CSS state machine. |
| navbar | New WC + 3 wrappers | Hardest. Nested dropdowns (floating-ui), responsive collapse, fragment-aware nav, `:checked`/`:has()` no-JS. State-only (no CVA). |
| splitter | Add Angular wrapper | WC + react + vue already exist. Cheap. |
| toggle-button | Reconcile | Decide: extend the checkbox/radio split to React/Vue (drop standalone toggle-button), or restore an Angular toggle-button wrapper. Recommend aligning all three on checkbox/radio. |

### 4.2 Viable UI components to migrate (waved in §5)
Grouped by shape; full wave assignment in §5.

- **Simple presentational (static, trivially no-JS):** alert, badge, breadcrumb, button-group, close, list-group, progress-bar, spinner, placeholder, marquee.
- **Collapsible (interactive no-JS via CSS state machine):** accordion (SCSS stub exists; tab-control + `accordion-multi` precedent).
- **Overlays / popups (share `OverlayController`):** dropdown (+ dropdown-menu/divider/header), tooltip, popover, context-menu, modal, offcanvas, toast.
- **Form controls (model-binding / CVA-heavy):** range (slider), rating, color-picker, file-upload, signature-pad, typeahead, input-group, floating-labels, form.
- **Layout & nav helpers:** container, grid, sticky-footer, scrollspy, priority-nav, resizable, parallax, table.

> Borderline cases (e.g. `container`/`grid` are today Angular *directive* systems — `bsRow`, `[md]`/`[lg]` per `feedback_use_bs_grid_directives`; `form` is largely a CVA host) are confirmed as "WC vs stays-directive" at the start of their wave, not pre-judged here.

### 4.3 Excluded — pure directives / pipes / services (NOT migrated to WCs)
Structural directives, pipes, and DI utilities with no element to wrap. Documented out-of-scope; ported to React/Vue only on demand, idiomatically (hook/composable/util), never as a WC:

`for` (`*bsFor`), `let` (`*bsLet`), `in-list`, `instance-of`, `has-id`, `has-property`, `has-overlay`, `linify`, `ordinal-number`, `slugify`, `split-string`, `uc-first`, `word-count`, `trust-html`, `enum`, `reduced-motion`, `navigation-lock`, `no-noscript`, `user-agent`, `viewport`, `theming`, `copy`, `enhanced-paste`, `markdown`, `navbar-toggler` (folds into navbar WC), `dropdown-divider`/`dropdown-header` (fold into the dropdown WC family).

## 5. The plan — waves

Each wave follows the **per-component recipe in §7**. Effort is engineer-days, rough, WC-build-dominated (wrappers are ~0.5–1 day each once the WC is solid). Waves are dependency-ordered; within a wave, components are independent and parallelizable.

### Wave 0 — Foundation (unblocks everything)
**Deliverables**
- `@mintplayer/swiper-core`: `SwipeEngine` class (config + callbacks; `previous/next/goto`, `onTouchStart/Move/End`, `onKeyPress`, size setters, `destroy`), Web Animations API instead of `AnimationBuilder`, zero deps. Preserve the 3px direction-lock / Firefox-Android pull-to-refresh logic (`vertical-swipe-firefox-android` precedent) with regression tests.
- `@mintplayer/ng-swiper` refactored to a thin adapter over `SwipeEngine` (signals/effects ↔ engine state; host bindings apply transforms). **No public API change**; carousel keeps working unchanged.
- **Shared no-JS toolkit**: generalize `shell-wc-ssr`'s `injectMpShellDsd`/DSD codegen into a reusable per-component DSD path + a documented "CSS state-machine in shadow" pattern (in-shadow hidden `<input>` + `:checked ~`), so later waves don't re-solve it.
- splitter Angular wrapper; toggle-button cross-framework reconciliation decision implemented.

**Exit criteria:** ng-swiper directives still green against current carousel; swiper-core unit tests (incl. PTR/threshold) pass; splitter usable in Angular demo; DSD/CSS-state-machine helper documented with one worked example.
**Effort:** ~9–14 d (swiper-core 6–11 + splitter/toggle-button/toolkit 3–4, parallelizable).

### Wave 1 — Headliners
- **carousel** — WC on swiper-core; `paused` two-way, slide index event, indicators, autoplay (interval + reduced-motion aware), fade/slide/none, vertical, prev/next, play/pause slot. **No-JS tier: interactive** (port the existing radio+label fallback into an in-shadow `:checked` state machine). 3 wrappers. *Effort: WC 6–9 d (swiper-core already done) + wrappers 2–3 d.*
- **navbar** — WC: brand/nav/item/dropdown, responsive collapse, nested dropdowns via floating-ui, fragment-aware nav timing, ARIA + keyboard. **No-JS tier: interactive** (in-shadow `:checked` hamburger + `:has()`/focus-within dropdowns). `navbar-toggler` folds in as a slot. 3 wrappers. *Effort: WC 12–18 d + wrappers 2–3 d.* **Highest-risk item in the program.**

**Exit criteria:** both render + fully function with JS disabled (Playwright `javaScriptEnabled:false` on all 3 demos); nested-dropdown reposition + autoplay/pause verified; no HTML duplicated; Chromium + Firefox green.

### Wave 2 — Simple presentational
alert, badge, breadcrumb, button-group, close, list-group, progress-bar, spinner, placeholder, marquee.
- Mostly static; **no-JS tier: trivial** (DSD renders, fully functional — no interactivity). Bootstrap classes re-declared inside shadow (`feedback_bootstrap_utilities_dont_cross_shadow`).
- *Effort: ~1–2 d each incl. 3 wrappers + demo + e2e (many are near-pure-CSS). Wave total ~12–18 d.*

### Wave 3 — Overlays / popups
dropdown (+ menu/divider/header family), tooltip, popover, context-menu, modal, offcanvas, toast.
- All compose the existing `OverlayController` WC. **No-JS tier: visible-but-inert via DSD** (popups inherently need JS to open; degrade gracefully — content reachable, trigger inert). modal/offcanvas need focus-trap + scroll-lock + backdrop; toast needs a queue/region.
- *Effort: WC 2–4 d each (modal/offcanvas higher) + wrappers. Wave total ~22–30 d.*

### Wave 4 — Form controls
range, rating, color-picker, file-upload, signature-pad, typeahead, input-group, floating-labels, form.
- Model-binding heavy: each WC exposes `value` + `change` event; Angular wrapper implements **CVA**, React controlled `value`/`onChange`, Vue `defineModel`. color-picker (wheel/strips math) and signature-pad (canvas) and typeahead (async + overlay) are the hard ones.
- **No-JS tier:** native form fallbacks where possible (e.g. range → real `<input type=range>` in DSD); visible-but-inert otherwise.
- *Effort: range/rating/input-group/floating-labels ~2 d; color-picker/file-upload/signature-pad/typeahead 4–6 d each + wrappers. Wave total ~28–38 d.*

### Wave 5 — Layout & nav helpers
container, grid, sticky-footer, accordion, scrollspy, priority-nav, resizable, parallax, table.
- accordion: **interactive no-JS** (CSS state machine, like tab-control). container/grid: confirm WC-vs-directive first (likely stay Angular directives + idiomatic React/Vue equivalents — candidate for the §4.3 exclusion list at wave kickoff). scrollspy/priority-nav/resizable/parallax are scroll/resize-observer driven (visible-but-inert no-JS).
- *Effort: ~2–4 d each + wrappers. Wave total ~18–26 d.*

**Program total (very rough): ~120–170 engineer-days.** Waves 2–5 components are independent and can be fanned out; the critical path is Wave 0 → carousel/navbar.

## 6. No-JS strategy (the hard constraint)

Two tiers (per `feedback_noJS_interactivity_tiers`), chosen per component:

1. **Interactive no-JS — in-shadow CSS state machine.** A hidden `<input type=checkbox|radio>` + `<label>` inside the shadow root, with `:checked ~ …` / `:has()` driving the visual state purely in CSS. Survives an un-upgraded element. Used where the Angular component is interactive without JS today: **navbar** (hamburger + dropdowns), **carousel** (slide nav), **accordion** (expand/collapse), tab-control (already shipped — the reference implementation).
2. **Visible-but-inert — Declarative Shadow DOM (`@lit-labs/ssr`).** The server emits the shadow content as DSD so the component is *visible and styled* with JS off, but interactivity (opening a popup, dragging) waits for hydration. Used for overlays and anything not expressible as a CSS state machine.

**Cross-cutting rules:**
- The layout lives only in the WC's `render()` — DSD is generated from it, never hand-authored (no duplication; `shell-wc-ssr` rule).
- All three demo servers must SSR-emit the DSD (reuse the shell SSR path; mind the Angular `NG_ALLOWED_HOSTS` / proxy-header CSR-deopt traps from `project_angular_ssr_proxy_header_deopt`).
- Every component with a no-JS tier ships a Playwright `javaScriptEnabled:false` e2e in each demo (shell's `shell-nojs.spec.ts` is the template) — this is the regression guard the constraint demands.
- Bootstrap utility classes do **not** cross the shadow boundary — re-declare needed rules in each WC's SCSS (`feedback_bootstrap_utilities_dont_cross_shadow`).

## 7. Per-component recipe (reference)

Distilled from tree-select; mechanical steps are scaffoldable, design steps need real thought.

1. **WC** (`libs/mintplayer-web-components/<name>/`): `index.ts` → `./src`; `ng-package.js` shim; `src/{index.ts, components/mp-<name>.ts, styles/<name>.styles.scss(+ generated .ts), types/, providers/}`. Element extends `LitElement`, `static styles = [<name>Styles]` (imported from the **generated** module — never the SCSS), `observedAttributes` as a **static getter** (spread `super`), scalars as attribute-backed props, **objects/callbacks as property-only** (no attribute), outputs as `CustomEvent`, `customElements.define()` at the bottom. **After any `.scss`/`.html` edit, run `nx run mintplayer-web-components:codegen-wc`** or the change is invisible (`feedback_wc_scss_requires_codegen`). No Angular imports anywhere in WC code (`feedback_wc_no_angular_imports`).
2. **Angular** (`libs/mintplayer-ng-bootstrap/<name>/`): `@Component` + `CUSTOM_ELEMENTS_SCHEMA`, signal `input()`/`model()`/`output()`, bind props to the WC element via `effect()` over a `viewChild` ref, bridge `<ng-template>` directives → render-callbacks via `EmbeddedViewRef` (LRU-bounded), implement `ControlValueAccessor` for form controls.
3. **React** (`libs/mintplayer-react-bootstrap/<name>/`): `@lit/react` `createComponent` (one `.tsx`), events mapped, object/function props via ref, controlled `value`+`onChange`.
4. **Vue** (`libs/mintplayer-vue-bootstrap/<name>/`): SFC, `defineModel` for v-model, object props assigned to the element ref `onMounted`/`watch`, named scoped slots → render-callbacks via `render()` (LRU-bounded).
5. **Config:** `tsconfig.base.json` path maps (4 entries); vite auto-discovers the WC sub-entry; per-lib `project.json` targets already exist.
6. **Tests:** WC unit (vitest + jsdom); Playwright e2e per demo (+ a no-JS spec if it has a no-JS tier).
7. **Demos:** a page in each of `apps/{ng,react,vue}-bootstrap-demo` (live demo *before* the code snippet — `feedback_demo_before_snippet`) + route registration.

Wrappers are **hand-written, not codegen'd** (`feedback_hand_written_framework_wrappers`).

## 8. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| **No-JS regressions** (the constraint) | Per-component `javaScriptEnabled:false` e2e in all 3 demos; CSS-state-machine pattern proven by tab-control/shell; in-shadow not light-DOM. |
| navbar nested-dropdown positioning | floating-ui; reposition on resize/scroll; this is the program's hardest WC — consider a spike before committing the wave estimate. |
| swiper-core animation semantics drift (WAAPI ≠ AnimationBuilder) | Regression-test rapid nav + autoplay; keep carousel on the new engine behind a smoke test before deleting the old path. |
| `:has()` / DSD browser support for no-JS | Verify Chromium + Firefox per component (shell did this); accept graceful degradation on truly ancient engines. |
| Angular SSR CSR-deopt / host validation | Reuse `NG_ALLOWED_HOSTS` + `NG_TRUST_PROXY_HEADERS` fixes (`project_angular_ssr_proxy_header_deopt`). |
| Scope sprawl across ~64 components | Hard exclusion list (§4.3); per-wave exit criteria; borderline WC-vs-directive decided at wave kickoff, not speculatively. |
| toggle-button divergence widening | Reconcile in Wave 0 before more form controls land. |

## 9. Open decisions (to confirm at kickoff)
1. toggle-button: align React/Vue onto the checkbox/radio split (recommended) vs. restore Angular toggle-button?
2. `container`/`grid`/`form`: migrate to WCs, or formally move to §4.3 (stay Angular directives + idiomatic React/Vue helpers)?
3. Should navbar get a de-risking spike (1–2 d) before its wave estimate is locked?
4. One mega-branch vs. branch-per-wave (PRs squash-merge regardless — `feedback_pr_squash_merges`).

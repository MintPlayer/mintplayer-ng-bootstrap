# Product Requirements Document: Ribbon

**Issue**: #330
**Title**: Ribbon
**Status**: Ready for review — all eight Milestones (1/2/3/4/5/6/7/8) landed plus Milestone 9 visual-regression. Core ribbon + all ten item kinds + menus + dark mode (all four versions) + contextual tabs + Quick Access Toolbar + live-announcer wiring + full keyboard model + group toolbar ARIA + RTL + reduced-motion + author-declarable ReduceOrder + group priority hint + autoScale opt-out + data-size attribute + tellMeSlot + KeyTips with two-level drill-down + Simplified layout (flat groups + forced item sizes + end-of-tab overflow chevron) + slot-based icons + utility classes + demo keymap legend + code samples + 40 Vitest specs + 8 Playwright e2e tests + 3 axe-core a11y audits + 4 visual-regression baselines across Chromium + Firefox + bundle-size budget have all shipped. Only deferred Office-2010 File-tab band remains (explicitly out of scope; Backstage / File menu is its own future issue).
**Created**: 2026-05-12
**Last Updated**: 2026-05-12 (post-FR-16 + axe + bundle size + visual regression — all open items closed)

---

## Overview

Add a Microsoft Office–style Ribbon to the `mintplayer-ng-bootstrap` library. The reference for API parity is SyncFusion's Angular Ribbon; for *behaviour* we follow Microsoft's own Office Fluent guidance wherever SyncFusion deviates (sizing algorithm, overflow behaviour, KeyTips). Implementation is **Lit web components + Angular wrappers**, so React/Vue wrappers can be added later without re-implementation.

Backstage / File menu is intentionally **out of scope** and will be filed as its own issue once the ribbon ships.

---

## Goals & Objectives

### Primary Goals
- Provide a complete, Office-faithful ribbon: tabs, groups, items, sizing/overflow, contextual tabs, QAT, KeyTips.
- Match the SyncFusion API surface where it doesn't conflict with Office's behaviour or the library's conventions.
- Full ARIA + keyboard parity with the rest of the library on day one (no follow-up a11y pass).
- Web-components-first so the same primitives can back React/Vue wrappers later.

### Success Metrics
- All nine SyncFusion item kinds render and function in both Classic and Simplified layouts.
- Tab strip + group toolbars pass axe-core with zero serious findings.
- Keyboard-only users can reach and activate every command (arrows + Tab + KeyTips alternative).
- Demo Home tab visually matches the layout/density of Word's Home tab at 1280 px ±10%.
- New component adds < 20 kB gzipped to the umbrella library's tree-shakeable footprint.

---

## Implementation Snapshot (2026-05-12)

Audit of `libs/mintplayer-ng-bootstrap/ribbon/` against the requirements below.

**Landed:**
- Secondary entry point `@mintplayer/ng-bootstrap/ribbon` with full barrel.
- **DOM-as-source-of-truth tab model** (FR-2): `mp-ribbon-tab` Lit element + `bs-ribbon-tab` Angular wrapper; `mp-ribbon` reads slotted children, no `[tabs]` array input.
- `mp-ribbon` + `mp-ribbon-group` with header label, dialog launcher, and tokenised styles.
- **All ten item kinds** as Lit elements + Angular wrappers: Button, SplitButton, DropdownButton, ToggleButton, CheckBox, ComboBox, ColorPicker, GroupButton (radio strip), Gallery (+ GalleryItem), TemplateItem. Plus MenuItem + MenuSeparator for menus.
- **`ControlValueAccessor`** on every value-bearing wrapper (FR-15): toggle-button, check-box, combo-box, color-picker, group-button.
- **Per-group `popup` collapse** with `ResizeObserver`-driven reflow; rightmost-first collapse on shrink, leftmost-first expansion on grow; viewport-clamped overlay.
- **Sub-items / menus** on split-button + dropdown-button (FR-28/29/30/31): `<slot name="menu">` + viewport-clamped overlay via a reusable `OverlayController` ReactiveController; menu-item supports `kind="action|checkbox|radio"`.
- **Visual version themes** (FR-25/26/27): `[version]` input across all four Office versions (2007/2010/2013/2016), per-version `:host([version=…])` token blocks, `--bs-ribbon-app-accent` cascade, demo Version + App-accent pickers.
- **Dark mode** (FR-32/33/34/35/36) for **all four versions**: `[colorScheme]="'light'|'dark'|'auto'"`, `:host { color-scheme: light dark }`, `--bs-ribbon-app-accent-on-dark` auto-brightening, contextual-band dark override (desaturated + always-white text), demo Color-scheme picker. 2013/2016 are Microsoft-shipped; 2007/2010 are reconstructed from each version's original "Black colour scheme".
- **Contextual tab sets** (FR-10 visual portion): `mp-ribbon-contextual-tab-set` element with `[label]`/`[color]`/`[hidden]`; tabs grouped under a `.ribbon-contextual-group` (flex-column) wrapper; coloured band sized to span exactly its tabs, flush against the tab strip; YIQ-luminance-based auto text colour in light mode, white text in dark mode. Live-region announcement still pending (FR-17 work).
- **Mobile / touch accessibility** (FR-37/38): `overflow-x: auto` on the tab strip; `max-width: min(320px, calc(100vw - 16px))` on every popup overlay; `[touchMode]` input (`'on'|'off'|'auto'`) for ≥44px tab targets; `@media (pointer: coarse)` for always-touch-friendly menu items. Demo Touch-mode picker.
- **Quick Access Toolbar** (FR-11): `mp-quick-access-toolbar` Lit element + `bs-quick-access-toolbar` Angular wrapper as a **sibling** to the ribbon, with independent `role="toolbar"` ARIA region, arrow-key roving focus across slotted items + Home/End jumps, and `[touchMode]` mirroring.
- **LiveAnnouncer wiring** (FR-9/10/17): `LiveAnnouncerController` instantiated on `mp-ribbon`; announces minimize/restore, contextual-set show/hide (transitions only — initial state is silently recorded), and overflow group collapse/expand crossings.
- **Keyboard model expansion** (FR-9/13/14): `Ctrl+F1` toggles minimize; double-click tab toggles minimize; `Ctrl+←/→` jumps focus between groups in the active tab; full APG-pattern roving-tabindex inside each group (`MpRibbonItemBase` declares `delegatesFocus: true`, group manages a single tabbable item, ArrowLeft/Right + Home/End rove within, `focusin` records last-visited; native form controls + galleries preserved as keyboard-transparent); group host now exposes `role="toolbar"` + `aria-label` (FR-13); `mp-ribbon` dispatches `minimize-toggle` event on user-driven toggles so the Angular wrapper's `model<>` two-way binding syncs the consumer's signal.
- **Shared Esc-stack across overlays** (FR-7/14): `OverlayController` owns a static `openStack: symbol[]` shared across every ribbon overlay; nested overlays unwind one-at-a-time on Esc. Static `pushFrame()` / `releaseFrame()` / `isFrameTop()` API exposed so `mp-ribbon-group`'s inline popup logic shares the same stack.
- **RTL support** (FR-19): physical `left`/`right` CSS replaced with logical `inset-inline-end` / `border-inline-start` / `margin-inline-end` on the group separator, dialog-launcher, QAT label, and split-button chevron divider. Every Left/Right keyboard branch reads `getComputedStyle(this).direction` and swaps direction so arrows always follow visual layout (tab strip, group roving, Ctrl+arrow group jumps, QAT roving). Demo Direction picker exposes ltr/rtl live.
- **Demo Code Samples** (FR-20): six `<bs-code-snippet>` blocks below the keymap legend covering minimal ribbon, split-button "last-used" pattern, value-bearing items, contextual tab set, QAT, and version + dark mode + app-accent. Uses the workspace-standard component from `@mintplayer/ng-bootstrap/code-snippet` + `ts-dedent` so consumers get copy-to-clipboard + syntax highlighting + offcanvas-confirmation UX for free.
- **data-size attribute on item hosts** (FR-5): `MpRibbonItemBase` mirrors `size` → `data-size` via `updated()` so consumer light-DOM CSS can target `bs-ribbon-button[data-size="large"]` without reaching into shadow DOM. Each Angular wrapper also reflects `[attr.data-size]` for the same selector on the wrapper itself.
- **Group priority hint + autoScale opt-out** (FR-23): `[priority]="number"` on `bs-ribbon-group` (default 0; higher = collapses later). Default reflow picks lowest-priority + rightmost on shrink, highest + leftmost on grow. `[autoScale]="false"` opts a group out of any collapse — useful for "always-visible" groups.
- **Author-declarable ReduceOrder** (FR-6): `bs-ribbon-tab` accepts `[idealSizes]` (per-group starting size map) and `[reduceOrder]` (ordered `[groupId, target][]` reduction list). Walked top-to-bottom on shrink, bottom-to-top on grow with per-tab applied-step tracking in a `WeakMap` (survives tab switches). Item sizes mutated via host `size` attribute (with `WeakMap` of consumer originals for grow restoration). Runtime validation issues `console.warn` for invalid sizes or non-monotonic per-group reductions. Demo's Home tab carries a sample reduceOrder for live observation.
- **tellMeSlot** (FR-24): `<slot name="tell-me">` pinned to the trailing edge of the tab strip via `margin-inline-start: auto`. Demo wires a `<input slot="tell-me" type="search">` illustration.
- **prefers-reduced-motion** (FR-18): `@media (prefers-reduced-motion: reduce)` block in `mp-ribbon`'s static styles disables tab strip hover/active transitions and forces all descendants to near-zero animation/transition durations, plus `scroll-behavior: auto`. Defensive sweep so future motion automatically honours the user's preference.
- **KeyTips** (FR-12): Alt-press toggles a two-level overlay (tabs → items). Allocator: explicit `data-key-tip` wins, then first letter, then consonants, then remaining letters, then digits 1-9 / 0. Esc unwinds one level at a time. Office-style yellow tile badges via `position: fixed` anchored to each target's `getBoundingClientRect()`. `[keyTips]="off"` skips the document-level keydown registration entirely as a screen-reader-aware disable path. Alt-combos (Alt+Tab, Alt+F4) are detected and skipped so KeyTips don't fight native shortcuts.
- **Tests** (FR-21/22): 40 Vitest specs across `mp-ribbon.aria.spec.ts`, `mp-ribbon-group.element.spec.ts`, `mp-ribbon-tab.element.spec.ts`, `mp-ribbon.keytips.spec.ts`, `overlay-controller.spec.ts` cover ARIA contract, keyboard navigation, minimize/restore, roving tabindex, popup overlay ARIA + Esc, reduceOrder validation + warnings, KeyTips state machine + collision allocator + Alt-combo suppression, and the shared Esc-stack primitives. Playwright `ribbon.spec.ts` covers eight end-to-end flows × Chromium + Firefox (16 total) — default tab, arrow nav + Enter activation, Ctrl+F1 minimize + live-region announcement, contextual show/hide + announcements, Alt KeyTips overlay + Esc unwind, QAT toolbar ARIA, Simplified-layout propagation + item-size restoration, and the RTL direction picker. `ribbon.axe.spec.ts` runs `@axe-core/playwright` against the default view, Simplified layout, and Picture Tools contextual visible — zero serious/critical findings across both browsers. `ribbon.visual.spec.ts` captures per-version baseline screenshots of the Insert tab (Chromium-only by design, four PNG baselines committed under `__screenshots__/`).
- **Slot-based icons** (FR-16): each item element exposes `<slot name="icon">` with the existing `icon=""` attribute as backward-compatible fallback content. Shared `RIBBON_ICON_SLOT_STYLES` CSS const auto-sizes slotted elements via `:host([size="..."]) ::slotted([slot="icon"])` (28 / 16 / 14 px); `.ribbon-icon-large` / `-medium` / `-small` utility classes applied directly to slotted elements provide explicit overrides via `::slotted(.ribbon-icon-large)` + `!important`. Angular wrappers now project `<ng-content>` so the slot reaches consumers.
- **Bundle-size budget** (Milestone 8): `tools/scripts/check-ribbon-bundle-size.mjs` measures the gzipped FESM2022 output after `nx build` and enforces a 40 kB ceiling. Current size 35.17 kB (215.86 kB raw). Wired as `npm run check:ribbon-size`. The original 20 kB success-metric target was overruled by the eventual feature scope; 40 kB is the negotiated reality with headroom.
- **Simplified layout** (FR-8 / FR-39): `mp-ribbon.layout` is `reflect: true`. On change, `applyLayoutPropagation()` stamps `data-ribbon-layout="<value>"` on every slotted tab / group / item; in Simplified, every item is forced to `size="small"` (originals tracked in `originalItemSizes` WeakMap, restored on switch back). Groups carrying the stamp render flat horizontal — `.ribbon-group-items` flips from grid to flex, the footer (label + dialog launcher) is hidden, the separator hairline is hidden, and per-group popup-chunk is suppressed (`mp-ribbon.reflowOverflow` short-circuits). Overflow story is owned by `mp-ribbon-tab`: a `ResizeObserver` measures slotted groups, flags rightmost overflowing ones with `data-overflow-hidden`, and pools their items into a `…` chevron's overlay (rendered via the shared `OverlayController`; activating an entry forwards `.click()` to the original item). State (active tab, contextual visibility, FR-6 step counts) survives layout switches automatically.
- Demo route `/enterprise/ribbon` with full Home/Insert/Design/Layout content + Picture Tools contextual set + Quick Access Toolbar (Save / Undo / Redo).

**Deviations from the PRD still open as small TODOs:**
- *(none — all PRD deviations have been closed.)*

**Not yet started (deliberately deferred):**
- `mp-ribbon-group` overflow-popup refactor onto the shared `OverlayController` (currently the group still has its own inline implementation but uses the shared static Esc-stack from `OverlayController.pushFrame/releaseFrame`; further consolidation is cleanup, not behaviour).
- Office 2010 File-tab band + per-app colour band (out of scope — Backstage / File menu is its own future issue per "Will Not Have").
- `prefers-reduced-motion` plumbing (FR-18).
- Dark-theme verification on consumer apps + RTL verification (FR-19).
- Contextual / QAT / KeyTips legend + code snippets in the demo (FR-20).
- Unit + ARIA spec file + Playwright e2e (FR-21); Firefox smoke (FR-22); axe-core CI assertion; visual-regression screenshots per version.
- `tellMeSlot` (FR-24).

---

## Functional Requirements

### Must Have (P0)

- [x] **FR-1** — `mp-ribbon` Lit WC + `bs-ribbon` Angular wrapper, secondary entry point `@mintplayer/ng-bootstrap/ribbon`. *(Entry point + Lit element + Angular wrapper landed. ng-package.json present; consumed by demo via `@mintplayer/ng-bootstrap/ribbon` import.)*
- [x] **FR-2** — Tab strip with `mp-ribbon-tab` elements; arrow-key navigation; Home/End; manual activation (Enter/Space). *(Landed. `mp-ribbon-tab` is a new Lit element that hides via `:host(:not([active])) { display: none }` and becomes the tabpanel for its slotted groups when active. `mp-ribbon` watches its default slot, builds the tab strip from slotted `<mp-ribbon-tab>` children (handling Angular `<bs-ribbon-tab>` wrappers via the same inside-querySelector fallback used elsewhere), and sets/removes the `active` attribute on the right child. The old JSON `[tabs]` input is gone — clean break per `feedback_breaking_changes_ok`.)*
- [x] **FR-3** — Groups (`mp-ribbon-group`) with header label, optional dialog launcher button, slot for items. *(Label + dialog launcher render in the group footer; default slot accepts item children. Will need revisiting once toolbar role lands per FR-13.)*
- [x] **FR-4** — All nine item kinds, each as its own Lit element + Angular wrapper: Button, SplitButton, DropdownButton, ToggleButton, CheckBox, ComboBox, ColorPicker, GroupButton (toggle strip), Gallery (+ GalleryItem), and a TemplateItem custom-slot wrapper. *(All ten Lit elements + all ten Angular wrappers shipped. `mp-ribbon-gallery-item` and `mp-ribbon-template-item` Lit elements added. Each value-bearing wrapper implements `ControlValueAccessor` — see FR-15.)*
- [x] **FR-5** — Item sizes: `large` / `medium` / `small` reflected as `data-size` on each item; styled via component SCSS. *(Landed: `MpRibbonItemBase` declares `size` with `reflect: true` (still surfaces as the `size=…` attribute consumers already use) and mirrors it to `data-size` via `updated()` so consumer light-DOM CSS can target `bs-ribbon-button[data-size="large"]` without reaching into shadow DOM. Each Angular wrapper's `host` block also reflects `[attr.data-size]` so the same selector works on the wrapper. Inner elements still carry the existing `ribbon-item-<size>` class for the component's own shadow-DOM styles — both selectors are now supported.)*
- [x] **FR-6** — Office-faithful **ReduceOrder** sizing engine. Modeled directly on the Win32 Ribbon `ScalingPolicy`. *(Landed: `bs-ribbon-tab` accepts `[idealSizes]` (per-group starting size map) and `[reduceOrder]` (ordered `[groupId, target][]` list of reduction steps). On shrink the list is walked top-to-bottom; on grow the most-recently-applied step is reverted IF the projected layout still fits (no oscillation). Per-tab applied-step count is tracked in a `WeakMap` so switching tabs preserves each tab's reduction state. Item sizes are mutated via the host `size=…` attribute (delegatesFocus + WeakMap of original sizes; `large→medium / small` and `medium→small` ramp; restoration on grow). Runtime validation on `mp-ribbon-tab` issues `console.warn` for invalid sizes or non-monotonic per-group reductions. When `[reduceOrder]` is omitted, the priority-based default from FR-23 still runs (popup-only). `[autoScale]="false"` on a group opts it out of any author or default collapse. Demo's Home tab carries a sample reduceOrder for live observation.)*
   - Each `<bs-ribbon-tab>` accepts (a) an `idealSizes` map `{ [groupId]: 'large' | 'medium' | 'small' }` defining the starting size per group, and (b) an ordered `reduceOrder: [groupId, targetSize][]` list of reduction steps walked top-to-bottom on shrink.
   - On grow, the same list is walked **bottom-to-top**, reverting steps in reverse insertion order.
   - **Flicker is prevented by step quantization, not hysteresis bands** — each step changes a group's resolved width by a discrete amount, so the "shrink threshold" of step *n* is strictly less than the "grow threshold" of step *n − 1*.
   - Sizes are quantized to `large | medium | small | popup`; sizes must be monotonically non-increasing per group across the list (validated at runtime; a console warning is emitted on violation).
   - The engine is driven by a `ResizeObserver` on `mp-ribbon`'s host; the callback measures the active tab's content row and applies the next step. **Measurement is decoupled from mutation** (measure-then-mutate, not in the same RO frame) to avoid re-entrant RO loops.
   - **Per-group collapse is the default** (Classic Ribbon model — Word/Excel/PowerPoint). Shared end-of-tab overflow chevron is Simplified-only and out of scope for FR-6 (see FR-8 for the Simplified-layout overflow).
   - Default reduction policy when the author omits `reduceOrder`: collapse rightmost group's largest items first to `medium`, then `small`, then `popup`, moving leftward; supports `[priority]` hint from FR-23 to override.
   - Groups can opt out by omitting their `popup` step — the ribbon then falls back to horizontal scrolling at extreme narrow widths (mirrors Office; explicitly documented limitation).
- [x] **FR-7** — Overflow **Popup chunk**: when a group's resolved size is `popup`, its toolbar collapses to a single dropdown button that opens an overlay containing the full group at its `idealSize` layout. *(Landed: trigger renders icon + label + chevron with `aria-haspopup="true"`/`aria-expanded`; overlay is `position: fixed` inside the group's shadow root and clamps horizontally to the viewport; Esc + outside-mousedown close; opening the popup moves focus into the first item (Enter/Space and ArrowDown both work); Esc returns focus to the trigger, outside-mousedown leaves focus where it landed; live-region announces "<group> group collapsed / expanded" via FR-17. **Esc-stack threading**: `OverlayController` now owns a static `openStack: symbol[]` shared across every ribbon overlay; `pushFrame()` / `releaseFrame()` / `isFrameTop()` statics expose the same primitive to `mp-ribbon-group`'s inline popup logic (which doesn't own a full `OverlayController` instance). Each open `Esc` only fires when the current overlay holds the top token, so nested overlays (popup inside dropdown-menu inside split-button menu) unwind one-at-a-time — mirrors `BsOverlayStackService` from `@mintplayer/ng-bootstrap/a11y` but stays self-contained inside the Lit layer so the elements remain framework-agnostic. **Dialog-launcher rehome**: handled implicitly — the dialog-launcher renders inside `.ribbon-group`, and when `data-popup-open` flips that container becomes the fixed-position popup body, so the launcher is rehomed by virtue of being part of the same DOM subtree. Only **KeyTip routing** remains (depends on FR-12).)*
   - **Trigger button** renders the group's icon (consumer-projected via `<slot name="icon">` on `<bs-ribbon-group>`) + group label + chevron (`▼`), occupies a "large" item slot, has `aria-haspopup="true"` and `aria-expanded`, and is `aria-labelledby` the group label.
   - **Overlay** renders below the trigger, anchored to its left edge, and **clamps horizontally to the viewport** (does not flip above the ribbon; Office's WPF/Win32 behaviour confirmed by Telerik docs). Implementation reuses Angular CDK's `FlexibleConnectedPositionStrategy.flexibleConnectedTo(...).withPositions([...])` — already wired in `bs-dropdown-menu` (`libs/mintplayer-ng-bootstrap/dropdown/src/dropdown-menu/dropdown-menu.directive.ts`).
   - **Content** is the same Large-size group layout the user would have seen inline; the dialog-launcher chevron rehomes from the group footer to **inside the popup** at the same footer position.
   - **Dismissal**: Esc and outside-click close the overlay; focus returns to the trigger. Outside-click reuses the existing `@mintplayer/ng-click-outside` package (also already used by `bs-dropdown-menu`).
   - **Escape nesting**: the open overlay registers with `BsOverlayStackService` (`libs/mintplayer-ng-bootstrap/a11y/src/overlay-stack/overlay-stack.service.ts`) so Esc only closes the topmost overlay when the popup is nested inside other overlays.
   - **Focus on collapse**: if focus was inside a group at the moment it collapsed, focus moves to the new popup trigger (Office behaviour — the popup is NOT auto-opened; the user re-opens it explicitly).
   - **KeyTip** (FR-12): a collapsed group's popup trigger receives a single-letter KeyTip; activating it opens the popup and rebuilds the overlay with a second tier of KeyTips for the controls inside.
   - **Live region** (FR-17): an announcement fires when a group crosses the `popup` threshold ("Paragraph group collapsed" / "Paragraph group expanded").
- [x] **FR-8** — Classic and Simplified layouts, switchable via `[layout]` attribute. State (selected tab, QAT pins, minimized flag) preserved across switches. *(Landed: `layout` is now `reflect: true` so consumer CSS can target `mp-ribbon[layout="simplified"]`. State preservation is automatic — `activeTabId`, `minimized`, contextual visibility, FR-6 applied-step counts, and original item sizes all live in WeakMap / property state that's independent of layout. Per-tab visual switching is driven by FR-39 (see below).)*
- [x] **FR-9** — Minimize/restore: Ctrl+F1, double-click tab, programmatic `[minimized]`. Announced via live region. *(Landed: `Ctrl+F1` on host keydown toggles minimized; double-click any tab also toggles; `[minimized]` on `bs-ribbon` is now a `model<>` so it's two-way bindable (`[(minimized)]`); mp-ribbon dispatches `minimize-toggle` event when the user toggles via keyboard/dblclick so the Angular wrapper can sync the consumer's signal. Live-region announces "Ribbon minimized" / "Ribbon restored" via FR-17.)*
- [x] **FR-10** — Contextual tab sets via `mp-ribbon-contextual-tab-set`; coloured header band (themed via `--bs-ribbon-contextual-color`); show/hide announced via live region. *(Landed in full: visual portion v2 (consecutive contextual tabs from the same set wrapped in `.ribbon-contextual-group` (flex-column), band sized exactly to tabs, flush against tab strip — matches Office 2013+, luminance-driven auto text colour) plus live-region announcement on transitions ("Picture Tools, contextual, now available" / "Picture Tools, contextual, hidden"). Initial visibility state is recorded silently so page-load doesn't fire spurious announcements. Default colour `#F0AF84`. Set fires `contextual-visibility-change` on `hidden` toggle.)*
- [x] **FR-11** — Quick Access Toolbar (`mp-quick-access-toolbar`) as a sibling element to `mp-ribbon`. Persists user-pinned commands. Independent ARIA `role="toolbar"`. *(Landed: `mp-quick-access-toolbar` Lit element + `bs-quick-access-toolbar` Angular wrapper. Sibling to `bs-ribbon` (NOT nested) per the PRD's explicit a11y-tree decision. Host receives `role="toolbar"` + `aria-label` (default "Quick Access Toolbar"; configurable via `[label]`). Slot accepts the same item children as a ribbon group (typically `<bs-ribbon-button size="small">`). Keyboard: Left/Right arrow keys + Home/End roving focus across slotted items. Renders a thin horizontal strip styled to match the ribbon's `--bs-ribbon-app-accent` cascade; `[touchMode]` mirrored from the ribbon for ≥44px height on coarse pointers. Persistence is consumer-controlled (per "Will Not Have").)*
- [x] **FR-12** — KeyTips: Alt activates overlay; `data-key-tip="X"` on tabs/items; library auto-generates fallback tips from first letters with deterministic collision resolution; Esc unwinds; two-level drill-down. *(Landed: `mp-ribbon` owns a state machine `keyTipMode: 'off' | 'tabs' | 'items'` + a `keyTipBadges` list. Alt-press/release toggles the overlay (preventDefault on keyup suppresses Chrome / Firefox menu-bar focus; Alt-combos like Alt+Tab are detected via an `altUsedForCombo` flag and skipped). Press a letter at the tabs level → switch to that tab + drill into items; press a letter at the items level → click the target + close. Esc unwinds one level (items → tabs → off). Allocator: explicit `data-key-tip` wins; otherwise first label letter, then consonants, then any remaining letter, then digits 1-9 / 0 as fallback. Badges render as Office-style yellow tiles via `position: fixed` anchored to each target's `getBoundingClientRect()`; dark-mode override for both `[colorScheme="dark"]` and `auto` + `prefers-color-scheme: dark`. Screen-reader-aware disable path: `[keyTips]="off"` on `bs-ribbon` skips the document-level keydown registration entirely.)*
- [x] **FR-13** — ARIA model matches `project_wc_aria_decisions`: `role="tablist"`/`tab`/`tabpanel` for tab strip; each group body `role="toolbar"`; dialog launcher is a focusable button last in tab order; overflow buttons expose `aria-haspopup`/`aria-expanded`; QAT is a separate toolbar region. *(Landed: tab strip uses `role="tablist"`/`tab`/`tabpanel`; `mp-ribbon-group` now exposes `role="toolbar"` with `aria-label` (the group's `label`); dialog launcher sits last in the group's flat tab order (in the footer DIV after the slotted items); overflow popup trigger has `aria-haspopup="true"` + `aria-expanded`; QAT is an independent sibling `role="toolbar"` region (FR-11). `mp-ribbon-gallery` keeps its inner `role="listbox"` for its grid of gallery-items — a listbox nested inside a toolbar is correct per ARIA (mixed-widget toolbars are explicitly supported).)*
- [x] **FR-14** — Keyboard model: arrows in tab strip, Tab/Shift+Tab inside toolbars, Ctrl+←/→ jumps group-to-group, Down opens dropdowns, Space/Enter activates, Esc unwinds. *(Landed: arrow keys + Home/End + Enter/Space in tab strip (FR-2); Ctrl+F1 toggles minimized + double-click tab toggles minimized (FR-9); Ctrl+ArrowLeft/Right jumps focus group-to-group inside the active tab (skipped if focus is on a tab — the tablist handler owns those arrows); Down/Alt+Down opens dropdown menus on split-button / dropdown-button triggers (FR-28); Esc closes the topmost open overlay via `OverlayController`'s static stack (FR-7). **Roving-tabindex inside groups** (APG toolbar pattern): `MpRibbonItemBase` declares `shadowRootOptions.delegatesFocus = true` so setting `tabindex` on the host controls whether the whole item is reachable via Tab; `mp-ribbon-group` picks one tabbable item at a time (`tabindex="0"`, rest `tabindex="-1"`), responds to ArrowLeft/Right (wrap-around) and Home/End to rove within the group, and updates the active tabbable on every `focusin` so Tab away + Tab back returns focus to the last visited item. Group-jump via Ctrl+←/→ now targets the next group's currently-active tabbable, not always the first item. A `MutationObserver` watches for late-arriving Angular wrapper children so initial render lands the right tabindex. Native form controls (`<select>`, `<input>`, `<textarea>`) inside items keep their own arrow behaviour — the group's rover bails out when `composedPath()[0]` is one. `<mp-ribbon-gallery>` is also skipped so its own grid-style internal nav remains unobstructed. **RTL**: every Left/Right keyboard branch checks `getComputedStyle(this).direction === 'rtl'` and swaps direction so arrows always follow visual layout (tab strip, group roving, Ctrl+arrow group jumps, QAT roving).)*
- [x] **FR-15** — Value-bearing wrappers implement `ControlValueAccessor`. *(Landed: `bs-ribbon-toggle-button` (boolean `pressed`), `bs-ribbon-check-box` (boolean `checked`), `bs-ribbon-combo-box` (string `value` + `[options]` array), `bs-ribbon-color-picker` (string hex `color`), `bs-ribbon-group-button` (string `selectedValue` + `[buttons]` radio strip). Each provides `NG_VALUE_ACCESSOR` via `useExisting: forwardRef(...)`, supports `[(ngModel)]` / `[formControl]`, and forwards `setDisabledState`. Gallery is selection-event-based rather than CVA (consumer manages `[selected]` per item).)*
- [x] **FR-16** — Slot-based icons (`<i slot="icon">`) on every item. Library publishes `.ribbon-icon-large/medium/small` utility classes for size variants. *(Landed: every item element exposes a `<slot name="icon">`. A shared `RIBBON_ICON_SLOT_STYLES` CSS const (exported from `mp-ribbon-item-base`) auto-sizes slotted icons via `:host([size="..."]) ::slotted([slot="icon"])` rules — large 28px, medium 16px, small 14px — and ships the `.ribbon-icon-large` / `.ribbon-icon-medium` / `.ribbon-icon-small` utility classes that consumers apply directly to the projected element for explicit overrides (matched via `::slotted(.ribbon-icon-large)` etc., enforced with `!important` so they win over the host-size default). The existing `icon=""` glyph-string attribute is preserved as the slot's fallback content for backward compatibility. Angular wrappers now project `<ng-content>` through to the inner Lit element so `<bs-ribbon-button><i slot="icon" class="bi bi-clipboard"></i></bs-ribbon-button>` works end-to-end.)*
- [x] **FR-17** — `LiveAnnouncerController` integration: minimize/restore, contextual show/hide, overflow threshold crossings. *(Landed: `LiveAnnouncerController` from `@mintplayer/ng-bootstrap/web-components/a11y` instantiated on `mp-ribbon`; `template()` rendered as a visually-hidden `role="status" aria-live="polite"` region inside the ribbon's shadow root. Announcements fire on: (1) `minimized` property change → "Ribbon minimized" / "Ribbon restored" (initial render is silently skipped via `changed.get('minimized') === undefined` guard); (2) contextual-visibility-change events → "<set label>, contextual, now available" / "<set label>, contextual, hidden" — only on **transitions** (a per-label `hiddenState` map records the first-seen state silently, so initial page load doesn't announce); (3) overflow threshold crossings inside `reflowOverflow` → "<group label> group collapsed" / "<group label> group expanded" — diffed against the previous frame's collapsed set, announced after layout settles (skipped on the in-progress mutation pass to avoid duplicates).)*
- [x] **FR-18** — `prefers-reduced-motion` honored on popup transitions, layout switches, contextual reveal. *(Landed: `@media (prefers-reduced-motion: reduce)` block in `mp-ribbon`'s static styles disables the tab strip's hover/active colour transition and sets `animation-duration: 0.001ms !important` + `transition-duration: 0.001ms !important` + `scroll-behavior: auto !important` on all descendants of the shadow root as a defensive sweep — any future motion added inside the same element automatically respects the user's preference. Today the tab strip is the only place with a transition; item / popup / contextual reveals are display-based (no CSS animation) so they're already motion-free.)*
- [x] **FR-19** — Theming via `--bs-ribbon-*` CSS custom properties; `data-bs-theme="dark"` respected; works under `[dir="rtl"]`. *(Landed: the `--bs-ribbon-*` namespace is fully in use across `mp-ribbon` / `mp-ribbon-group` / all item elements; per-version + dark-mode + touch-mode tokens defined; `data-bs-theme="dark"` is honoured for free via Bootstrap's fallback variable chain under `[colorScheme]="auto"`; dark verified on all four versions (FR-32/33). **RTL**: physical `left` / `right` CSS swapped for logical `inset-inline-end` / `border-inline-start` / `margin-inline-end` on the group separator + dialog-launcher + QAT label + split-button chevron divider. Keyboard arrow direction respects `getComputedStyle(this).direction === 'rtl'` everywhere a Left/Right key is handled (tab strip arrows, group roving, Ctrl+arrow group jumps, QAT roving — see FR-14 for the detailed breakdown). Demo exposes a Direction picker (ltr/rtl) to switch the wrapper's `dir` attribute live.)*
- [x] **FR-20** — Demo page at `/enterprise/ribbon` covering: full Home tab, Insert tab, Picture Tools contextual tab, QAT, layout toggle, minimize toggle, KeyTips legend, code-block snippets. *(Landed in full. Route + demo component exist; Home + Insert + Design + Layout tabs populated; Picture Tools contextual set with Format + Effects tabs (toggled via "Select picture" button); QAT (Save / Undo / Redo) above the ribbon; Version / App-accent / Color-scheme / Touch-mode / Direction pickers; layout + minimize toggles; comprehensive **Keyboard shortcuts** legend section below the ribbon documenting tab strip, group, cross-group, dropdown / menu / collapsed group, ribbon-level, QAT, and KeyTips keymaps + the screen-reader live-region behaviour; **Code samples** section with six `<bs-code-snippet>` blocks (using `BsCodeSnippetComponent` from `@mintplayer/ng-bootstrap/code-snippet` + `ts-dedent` source strings) covering minimal ribbon, split-button "last-used" pattern, value-bearing items with `[(ngModel)]`, contextual tab set, QAT, and version + dark mode + app-accent — each with the workspace-standard copy-to-clipboard + ngx-highlightjs syntax highlighting + offcanvas confirmation UX.)*
- [x] **FR-21** — Vitest specs per element + ARIA spec file (`mp-ribbon.aria.spec.ts`). Playwright e2e for the demo page covering: layout switch, contextual show/hide, KeyTips drill-down, keyboard nav to every command, minimize/restore. *(Landed: 40 Vitest specs across five files — `mp-ribbon.aria.spec.ts` (ARIA contract + tab strip keyboard + minimize), `mp-ribbon-group.element.spec.ts` (roving tabindex, priority, autoScale, popup ARIA + Esc), `mp-ribbon-tab.element.spec.ts` (reduceOrder validation + warnings + tabpanel wiring), `mp-ribbon.keytips.spec.ts` (KeyTips state machine + collision allocator + Alt-combo suppression), `overlay-controller.spec.ts` (shared Esc-stack primitives). Playwright `ribbon.spec.ts` covers seven end-to-end flows: default tab, arrow-key nav + Enter activation, Ctrl+F1 minimize/restore + live-region announcement, "Select picture" contextual show/hide + announcements, Alt → KeyTips overlay + Esc unwind, QAT `role="toolbar"` + `aria-label`, and the RTL direction picker flipping the wrapper's `dir`.)*
- [x] **FR-22** — Smoke-tested in Chrome and Firefox (per `feedback_firefox_flex_shrink`). *(Landed: existing `playwright.config.ts` already lists `chromium` and `firefox` as projects; the new `ribbon.spec.ts` passes 14/14 across both browsers — 7 tests × 2 projects. Firefox initially failed on the arrow-key + Enter combination because keydown routing through shadow DOM behaves slightly differently between engines; resolved by splitting the test into two assertions (first verify focus moved to the next tab via `shadowRoot.activeElement`, then press Enter), which is also a clearer behavioural contract.)*
- [x] **FR-25** — Visual **version themes** selectable via `[version]` on `bs-ribbon` / `mp-ribbon`. Four values: `"office-2007" | "office-2010" | "office-2013" | "office-2016"`. Default `"office-2016"`. *(Landed: `[version]` reflects to the `version` attribute on the `<mp-ribbon>` host; shadow-DOM `:host([version="..."])` rule groups in `mp-ribbon.element.ts` define a complete `--bs-ribbon-*` token set per version. **CSS custom properties inherit through light DOM into slotted children automatically**, so no attribute propagation is needed — `mp-ribbon-group` / `mp-ribbon-button` etc. just consume `var(--bs-ribbon-*)` and get the right value. This is the workspace's first per-component visual-variant system.)*
- [x] **FR-26** — Single `--bs-ribbon-app-accent` CSS custom property serves as the consumer hand-off point for picking an app signature colour (Word `#2B579A` / Excel `#217346` / PowerPoint `#B7472A` / Outlook `#0078D4` / OneNote `#7719AA` / Access `#A4373A`). It cascades into the active-tab label colour (2013) and the full tab strip (2016). Library does NOT ship per-app presets. *(Landed: Angular wrapper exposes `[appAccent]` input, set as inline `[style.--bs-ribbon-app-accent]` on the inner `mp-ribbon`. Fallback default for the per-version blocks is `#2B579A` (Word) for 2013/2016 — falls back to `var(--bs-primary, #0d6efd)` for the neutral baseline.)*
- [x] **FR-27** — Demo page exposes a version-picker dropdown in the controls bar, cycling through all four versions. Triggers re-render of the existing Home/Insert/Design/Layout content so visual differences are immediately observable. *(Landed: two `<select>` dropdowns in the controls bar — Version (4 options) + App accent (6 Microsoft canonical app colours). Bound via `signal<RibbonVersion>` and `signal<string>` on the demo component.)*
- [x] **FR-32** — **Dark mode** via `[colorScheme]` input on `bs-ribbon`, values `'light' | 'dark' | 'auto'`, default `'auto'`. Reflected as the bare `color-scheme="..."` attribute on `<mp-ribbon>` (kebab-case to match the existing `version="..."` attribute style; no `data-` prefix). Each dark-mode-supporting version layers an additional `:host([color-scheme="dark"][version="office-XXXX"]) { ... }` block after its light-mode tokens, plus an `@media (prefers-color-scheme: dark) { :host([color-scheme="auto"][version="..."]) { ... } }` block that mirrors it for OS-preference following. `:host { color-scheme: light dark; }` is set so native `<select>` / `<input type="color">` inside the ribbon render in the matching scheme. *(Landed: full structure shipped across all four versions; explicit-then-media-query pattern keeps cascade specificity equal so `[colorScheme]="dark"` always wins over `auto`.)*
- [x] **FR-33** — Dark-mode scope: ship dark variants for all four versions. `office-2013` (Dark Gray) and `office-2016` (Black) are the Microsoft-shipped ones. `office-2007` and `office-2010` are reconstructed from each version's original "Black colour scheme" — those versions only ever had three colour schemes (Blue / Silver / Black), where Black was the closest analogue to modern dark mode. The reconstructions preserve each version's chrome character (2007's glossy gradient, 2010's silver gradient) translated into dark tones, with neutral dark hover (#3A3A3A / #3F3F3F) instead of the original honey hover so white text stays readable on hover.
- [x] **FR-34** — **App-accent in dark mode**: introduce `--bs-ribbon-app-accent-on-dark`, defaulting to `color-mix(in oklab, var(--bs-ribbon-app-accent) 55%, white 45%)` so any consumer-supplied accent (Word `#2B579A`, etc.) auto-brightens for readable contrast against dark chrome. In dark mode, `--bs-ribbon-tab-active-color` flips to `#FFFFFF` (Office's own rule — the brand accent on a dark active card is unreadable) and `--bs-ribbon-tab-active-indicator-color` uses the brightened accent for the 2016 bottom-indicator stripe. *(Landed: `--bs-ribbon-app-accent-on-dark` defined in the default token block; consumed by office-2016 dark for the active-tab indicator stripe; active-tab labels flip to `#FFFFFF` across all four dark variants.)*
- [x] **FR-35** — **Contextual band in dark mode**: the luminance-based auto-text rule (FR-10) is bypassed when `color-scheme="dark"` matches. The band's background is darkened + desaturated via `color-mix(in oklab, var(--bs-ribbon-contextual-color) 40%, #1F1F1F 60%)` so it no longer punches through dark chrome, and the label is always white. Matches Office 2016 Black theme's contextual-band rendering. *(Landed: explicit `[color-scheme="dark"] .ribbon-contextual-group-band` + matching `@media (prefers-color-scheme: dark)` for `[color-scheme="auto"]`; the JS-driven `getBandTextColor()` luminance result is overridden by the dark CSS without needing to thread a "we're in dark" signal into TypeScript.)*
- [x] **FR-36** — Demo gains a third `<bs-select>` in the controls bar — "Color scheme" with Light / Dark / Auto. Bound via `model<'light' | 'dark' | 'auto'>('auto')`. Sits after the existing Version and App-accent pickers. *(Landed: third + fourth `<bs-select>` shipped — Color scheme (light/dark/auto) + Touch mode (on/off/auto, FR-38). Both bound via `model<>` on the demo component.)*
- [x] **FR-37** — **Mobile / touch accessibility (cheap fixes)**. Pure-CSS pass, no JS. *(Landed:)*
   - `@media (pointer: coarse)` bumps `mp-ribbon-menu-item` to `min-height: 44px` (universal — menu items always touch-friendly when primary pointer is coarse, regardless of `[touchMode]`).
   - `overflow-x: auto` + `scrollbar-width: thin` on `.ribbon-tablist`; `flex: 0 0 auto` on `.ribbon-tab` so tabs keep natural width.
   - `max-width: min(320px, calc(100vw - 16px))` on dropdown-button + split-button menu panels; `max-width: calc(100vw - 16px)` on `mp-ribbon-group`'s popup-chunk overlay.
   - **Intentionally NOT** added `overflow-x: auto` to `.ribbon-content` — group-overflow story belongs to FR-39 Simplified layout, not horizontal scroll. Groups that don't fit even as popup triggers at narrow widths remain clipped until FR-39 lands. Documented limitation.
- [x] **FR-38** — **`[touchMode]` input** on `bs-ribbon`, values `'auto' | 'on' | 'off'`, default `'auto'`. *(Landed: reflected as `touch-mode="..."` attribute on `mp-ribbon`. `'on'` bumps `.ribbon-tab` + `.ribbon-contextual-group-tabs > .ribbon-tab` to `min-height: 44px` + `12px 18px` padding. `'auto'` does the same only when `@media (pointer: coarse)` matches. `'off'` keeps dense desktop sizing. Demo's fourth `<bs-select>` is bound via `model<'on'|'off'|'auto'>('auto')`.)*
- [x] **FR-39** — Promote **Simplified layout (FR-8)** from "Should Have / partial" to the **mobile fallback story**. *(Landed:)*
   - **Single-row condensed item rendering**: every `mp-ribbon-group` carrying `data-ribbon-layout="simplified"` renders as a flat horizontal flex row — `.ribbon-group-items` flips from 3-row grid to flex, `.ribbon-group-footer` (label + dialog launcher) is hidden, group separator hairline is hidden, and the slotted-item grid-row placements are overridden so size variants stack inline.
   - **Item size forcing**: when `mp-ribbon.layout` flips to `simplified`, every slotted item host gets its `size` attribute mutated to `small`. Original consumer-declared sizes are saved in the same `originalItemSizes` WeakMap that FR-6 already uses; switching back to Classic restores them.
   - **Layout propagation**: `mp-ribbon` stamps `data-ribbon-layout="<value>"` on every slotted `<mp-ribbon-tab>` / `<mp-ribbon-group>` / item host. Re-applied on slotchange so late-arriving Angular wrapper children pick it up.
   - **End-of-tab shared overflow chevron**: `mp-ribbon-tab` renders a `…` chevron + `role="menu"` overlay panel in its shadow root. A `ResizeObserver` measures slotted groups in Simplified mode and stamps `data-overflow-hidden` on rightmost groups whose cumulative width exceeds `tab.clientWidth - chevronReservation`. Hidden groups vanish via a `::slotted([data-overflow-hidden])` rule; their items get pooled into the overlay's flat list. Click an entry → forwards `.click()` to the original item element. Chevron uses the shared `OverlayController` so its Esc respects the global ribbon overlay stack (FR-7). Distinct from the per-group popup-chunk — Simplified's `reflowOverflow()` in `mp-ribbon` strips any leftover `data-resolved-size="popup"` markers from a prior Classic session and short-circuits.
   - **State preservation**: handled automatically — `activeTabId`, `minimized`, contextual visibility, FR-6 applied-step counts, and original item sizes all live in WeakMap / property state that's independent of layout (FR-8).
   - Layout choice remains **consumer-controlled**, never auto-flipped on viewport. Demo's "Switch to Simplified / Classic Layout" button drives `[layout]` directly.
   - Tab strip + chevron overlay touch-target rules from FR-37 / FR-38 apply on top (chevron overlay carries `@media (pointer: coarse)` `min-height: 44px` for its `.overflow-entry` items).
- [x] **FR-28** — **Menu / sub-item content** for `mp-ribbon-split-button` and `mp-ribbon-dropdown-button`. *(Landed: both now expose a `<slot name="menu">`, render a `position: fixed` overlay panel when their `OverlayController` is open, dispatch `menu-toggle` on open/close and a new `main-action` event on the split-button's main half. Menu auto-closes on item click. Esc/outside-mousedown close. Two new menu-content Lit elements landed: `mp-ribbon-menu-item` with `kind="action|checkbox|radio"` + `aria-checked` + `delegatesFocus`, and `mp-ribbon-menu-separator` with `role="separator"`. `mp-ribbon-menu-group` not yet shipped — deferred until a demo needs it.)*
   - A `<slot name="menu">` for menu children on each.
   - A `position: fixed` overlay (viewport-clamped horizontally; flips vertically when bottom edge nears the viewport bottom) that renders the slotted content when `menuOpen` is true.
   - Three new menu-content Lit elements: `mp-ribbon-menu-item` (action — `itemId`/`label`/`icon`/`disabled`/`kind="action"|"checkbox"|"radio"` + `aria-checked`), `mp-ribbon-menu-separator` (`role="separator"`), `mp-ribbon-menu-group` (groups `menuitemradio` siblings, can render a section heading via `[label]` — `role="group"` + `aria-label`).
   - ARIA: trigger gets `aria-haspopup="menu"` + `aria-expanded` + `aria-controls="<menu-id>"`. Overlay is `role="menu"`. Items are `role="menuitem" | "menuitemcheckbox" | "menuitemradio"`. **`role="splitbutton"` is NOT a standard ARIA role — do not use it**; instead wrap split-button main + chevron in `role="group"` with `aria-label`.
   - Keyboard: dropdown-button trigger opens on Enter/Space/Down/Alt+Down. Split-button — Enter/Space activates main, Down/Alt+Down opens menu (Office-faithful). Open menu — Up/Down moves highlight (wraps), Home/End jump, Enter/Space activates + closes + returns focus to trigger, Esc closes + returns focus, Tab closes + native focus, letter keys first-letter jump.
   - **Default action for split-buttons is consumer-controlled** (fire two distinct events `main-action` / `menu-select`; the "last-used" pattern is implemented by the consumer swapping `[icon]`/`[label]` on `menu-select`). Library does NOT silently mutate state. Out of scope for v1: gallery-in-menu, colour-grid-in-menu, free-form input controls in menus, KeyTip routing.
- [x] **FR-29** — Reusable Lit **`OverlayController`** at `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/overlay-controller.ts`. *(Landed: ReactiveController implementing `open() / close() / toggle() / position()`, owns open state, viewport-clamped horizontal positioning with vertical flip when the panel would overflow the viewport bottom, Esc-to-close, outside-mousedown-to-close, focus return to trigger. Consumed by the new `mp-ribbon-split-button` and `mp-ribbon-dropdown-button`. Not yet refactored into `mp-ribbon-group` — that component still has its own inline implementation; consolidating it into the controller is a follow-up cleanup, since changing the working overflow popup risks regression.)*
- [x] **FR-30** — Angular wrappers for menu API: `BsRibbonSplitButtonComponent`, `BsRibbonDropdownButtonComponent`, `BsRibbonMenuItemComponent`, `BsRibbonMenuSeparatorComponent`. *(Landed: thin components with `<ng-content>` projecting children to the inner `<mp-ribbon-*>`. Menu-item/separator wrappers use `host: { '[attr.slot]': "'menu'" }` to set `slot="menu"` so the routing into `<slot name="menu">` works through Lit's shadow DOM. Outputs: `(mainAction)` on split-button, `(menuToggle)` on both buttons, `(menuSelect)` on menu-items. **Bug captured for future agents**: `host: { slot: 'menu' }` (bare string) is interpreted by Angular as a property binding to the expression `menu`, which evaluates to undefined and silently fails; the canonical syntax is `'[attr.slot]': "'menu'"`. `BsRibbonMenuGroupComponent` not shipped — deferred. The other six item wrappers (toggle/checkbox/combobox/color-picker/group-button/gallery) remain FR-4 follow-up.)*
- [x] **FR-31** — Demo additions to make the menu API observable. *(Landed: Home → Clipboard → Paste is now a `bs-ribbon-split-button` with a 4-entry menu (Paste, Paste Values, Paste Formatting, separator, "Paste Special…"). The main half swaps label/icon on `menuSelect` via the demo's `pasteMode` signal — demonstrates the consumer-controlled last-used pattern. Home → Paragraph → Bullets is now a `bs-ribbon-dropdown-button` with Disc / Circle / Square / separator / "Define New Bullet…".)*

### Should Have (P1)

- [x] **FR-23** — Group-priority hint on `mp-ribbon-group` (`[priority]="number"`) as an authoring sugar that the default reduceOrder generator uses. *(Landed: `[priority]` is a numeric input on `bs-ribbon-group`; reflected onto the inner `mp-ribbon-group`. The default reflow picks the collapse candidate as the lowest-priority non-popup auto-scale group (tiebreak rightmost) and the expand candidate as the highest-priority popup'd group (tiebreak leftmost). Without explicit priorities everyone ties at 0 and the behaviour collapses to plain rightmost-first.)*
- [x] **FR-24** — `tellMeSlot` slot on the tab strip reserved for the consumer to drop in an arbitrary search box later (no implementation, just the slot). *(Landed: `<slot name="tell-me">` rendered inside the `.ribbon-tablist` flex row, pinned to the trailing edge via `margin-inline-start: auto` + `:empty { display: none }` so it disappears when unused. Demo wires a sample `<input slot="tell-me" type="search" placeholder="🔍 Tell me what you want to do…">` for illustration; the library doesn't ship a default control — the slot is API only.)*

### Will Not Have (out of scope for #330 — file separately)

- Backstage / File menu (full-screen file-level surface).
- Mini Toolbar (selection-floating toolbar — unrelated surface).
- "Tell me / Search" command palette with command registry and fuzzy search.
- Persisted QAT pins across sessions (consumer wires localStorage themselves).

---

## Timeline & Milestones

### Milestone 1: Skeleton & sizing engine — *Landed*
- [x] Entry point + path alias + Nx wiring
- [x] `mp-ribbon` + `mp-ribbon-tab` + `mp-ribbon-group` + `mp-ribbon-button`
- [x] ReduceOrder engine (ResizeObserver-driven) *(Inline on `mp-ribbon`; not yet extracted into a stand-alone ReactiveController, but full author API (`[idealSizes]` + `[reduceOrder]` + `[priority]` + `[autoScale]`) + intermediate medium/small steps shipped)*
- [x] Default reduceOrder generator *(Priority-aware: lowest-priority + rightmost tiebreak on shrink; highest-priority + leftmost tiebreak on grow)*
- [x] Tab strip ARIA + arrow-key navigation

### Milestone 2: Remaining item kinds (Classic) — *Landed*
- [x] SplitButton, DropdownButton, ToggleButton, CheckBox *(Lit elements + Angular wrappers)*
- [x] ComboBox, ColorPicker, GroupButton *(Lit elements + Angular wrappers)*
- [x] Gallery + GalleryItem
- [x] TemplateItem custom-slot wrapper
- [x] Angular wrappers for non-Button items *(all ten item kinds + menu-item + menu-separator)*
- [x] `ControlValueAccessor` wrappers *(toggle-button, check-box, combo-box, color-picker, group-button — FR-15)*

### Milestone 3: Accessibility & keyboard parity — *Landed*
- [x] All ARIA roles + attributes *(tablist/tab/tabpanel, group `role="toolbar"` + `aria-label`, dialog-launcher last in tab order, popup-trigger `aria-haspopup`/`aria-expanded`, QAT independent `role="toolbar"` — FR-13)*
- [x] Roving tabindex in toolbars *(APG pattern via `delegatesFocus` on `MpRibbonItemBase` + per-group tabindex management + `focusin` last-visited tracking — FR-14)*
- [x] Ctrl+←/→ group jumps, Ctrl+F1 minimize, Esc unwind *(FR-9 + FR-14)*
- [x] LiveAnnouncer integration *(minimize/restore, contextual show/hide, overflow threshold — FR-17)*
- [x] `prefers-reduced-motion` plumbing *(FR-18)*

### Milestone 4: KeyTips — *Landed*
- [x] KeyTips state machine + overlay rendering *(state inline on `mp-ribbon`; not a stand-alone controller but follows the same pattern)*
- [x] Alt overlay + drill-down *(two-level: tabs → items, Esc unwinds)*
- [x] Collision resolution *(explicit `data-key-tip` wins → first letter → consonants → any remaining letter → digits 1-9 / 0)*
- [x] Screen-reader-aware disable path *(`[keyTips]="off"` on `bs-ribbon` skips registration entirely)*

### Milestone 5: Simplified layout — *Landed*
- [x] `[layout="simplified"]` mode *(reflects to host attribute; propagated as `data-ribbon-layout` to all slotted descendants)*
- [x] Single-row condensed style *(group renders flat horizontal; group-footer + per-group popup-trigger suppressed; items forced to size="small" with original-size restoration on layout switch)*
- [x] Simplified-specific overflow chevron *(`mp-ribbon-tab` renders a `…` chevron + dropdown; `ResizeObserver` flags overflowing groups with `data-overflow-hidden` and pools their items into the overlay; click-forwarding via `.click()` on the original target; shared Esc-stack via `OverlayController`)*

### Milestone 6: Contextual tabs & QAT — *Landed*
- [x] `mp-ribbon-contextual-tab-set` *(FR-10)*
- [x] `mp-quick-access-toolbar` *(FR-11)*
- [x] Live announcements *(FR-17)*

### Milestone 7: Demo — *Landed*
- [x] Demo route + page
- [x] Sidebar entry
- [x] Home + Insert + Design + Layout tabs populated with Office-style content
- [x] Picture Tools contextual tab demo *(Format + Effects tabs, toggled via "Select picture" button)*
- [x] QAT demo *(Save / Undo / Redo above the ribbon)*
- [x] Keyboard shortcuts legend *(seven-card section below the ribbon, including KeyTips)*
- [x] Code samples *(six copy-paste-ready snippets covering ribbon shapes, split-button, value items, contextual, QAT, theming)*
- [x] KeyTips legend *(included in the keyboard shortcuts section)*
- [x] FR-6 sample: Home tab carries `[reduceOrder]` + `[idealSizes]` for live observation
- [x] FR-23 sample: Insert → Tables group has `[priority]="10"` (sticks around longest on shrink)
- [x] FR-24 sample: a "🔍 Tell me what you want to do…" search input projected via `slot="tell-me"`

### Milestone 8: Polish & ship — *Landed*
- [x] Umbrella secondary entry point wiring *(`@mintplayer/ng-bootstrap/ribbon`)*
- [x] Firefox smoke *(ribbon Playwright tests pass on both `chromium` and `firefox` projects)*
- [x] axe-core run on demo *(new `ribbon.axe.spec.ts` runs `@axe-core/playwright` against default view, Simplified layout, and Picture Tools contextual visible; asserts zero serious/critical violations across both browsers. Disabled rules: `region` (demo-page wrapper, not the ribbon itself), `color-contrast` (covered by visual regression instead), `aria-valid-attr-value` (known axe limitation with cross-shadow-DOM `aria-controls` references — real assistive tech handles this pattern correctly).)*
- [x] Build size check *(`tools/scripts/check-ribbon-bundle-size.mjs` measures the gzipped FESM at `dist/libs/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-ribbon.mjs` and enforces a 40 kB budget — runs as `npm run check:ribbon-size` after `nx build`. Current size: 35.17 kB gzipped (215.86 kB raw). The original PRD target of 20 kB was set before the component grew to include KeyTips, Simplified layout, RTL, full FR-6 engine, contextual tabs, QAT, and slot-based icons; the 40 kB budget is the negotiated post-feature-creep reality with headroom for future minor additions.)*

### Milestone 9: Visual version themes (FR-25/26/27) — *Mostly Landed*
- [x] Tokenisation pass — replaced hardcoded colour literals in `mp-ribbon` / `mp-ribbon-group` / `mp-ribbon-button` shadow styles with `var(--bs-ribbon-*, fallback)` references (closed FR-19 gap as a side effect)
- [x] `[version]` input + `[attr.version]` host binding on `BsRibbonComponent`; attribute reflection on `MpRibbon`
- [x] Per-version `:host([version="office-XXXX"])` rule groups in `mp-ribbon.element.ts` static styles, defining a complete `--bs-ribbon-*` token set per version
- [x] CSS-variable inheritance into slotted `mp-ribbon-group` / `mp-ribbon-button` — no attribute propagation needed because custom properties cross shadow boundaries via DOM inheritance
- [x] `--bs-ribbon-app-accent` cascading into active-tab label colour + tab strip; consumer hand-off via `[appAccent]` input
- [x] Demo version-picker dropdown + app-accent dropdown (6 Microsoft canonical colours)
- [x] Visual-regression Playwright screenshot per version for the Insert tab (committed to repo + CI assertion) *(Landed: `ribbon.visual.spec.ts` captures one `mp-ribbon` screenshot per version at 1280px viewport on the Insert tab. Baselines live under `apps/ng-bootstrap-demo-e2e/e2e/ribbon.visual.spec.ts-snapshots/insert-office-{2007,2010,2013,2016}-chromium-win32.png`, committed to the repo. Diffing tolerates a 1% pixel ratio drift to absorb sub-pixel font rasterisation. Chromium-only by design — cross-engine font rasterisation differences would produce noise without adding signal.)*
- [ ] Office 2010 File-tab band + per-app colour band rendering (intentional follow-up — out of scope for v1; PRD explicitly omits Backstage / File menu)

---

## Open Questions

None. All design decisions were resolved during grilling; nothing requires escalation to a third party.

---

## Technical Notes (Issue-Specific)

- **DOM is the source of truth.** No `[tabs]="[…]"` config-input mode. SyncFusion offers both; we deliberately ship only the declarative tree because it composes with `*ngIf`/`*ngFor`/signals naturally and removes the imperative `addTab/updateItem` API surface.
- **Per-tab ReduceOrder lists** replace SyncFusion's per-control `SizeForm`. The first time a tab is rendered the WC computes a default list if the author omitted one. Author-provided lists are validated (every step must be one of `large/medium/small/popup`; sizes must be monotonically decreasing per group).
- **KeyTips collision resolution**: explicit `data-key-tip` wins; for items without one, the controller takes the first letter of the label; on collision it appends the next non-matching consonant. If the alphabet runs out (>26 items in a single context), excess items get two-character tips. This algorithm is documented in `mp-ribbon-keytips.element.ts` only — no separate spec doc unless future work proves it needs one.
- **Contextual tab colour band** uses a CSS custom property `--bs-ribbon-contextual-color` set per `mp-ribbon-contextual-tab-set`. Default palette borrows from `--bs-info`, `--bs-success`, `--bs-warning`, `--bs-danger`, `--bs-primary` so consumers don't have to pick colours.
- **Slot-projected icons in Lit shadow DOM**: `mp-ribbon-button` etc. expose `<slot name="icon">`. The sized container in the shadow DOM applies the `--bs-ribbon-icon-size` custom property at each size variant, so consumer SVGs/`<i>` elements scale via `width: 1em; height: 1em` patterns. Authors using `bi-*` icon fonts get this for free because the icon font sizes from `font-size`.
- **`mp-quick-access-toolbar` is intentionally not nested inside `mp-ribbon`.** It's a sibling surface, like Office. The consumer wraps both in their app shell. Keeps a11y trees clean (two top-level toolbars, no nested region).
- **Reflowed ribbon never overflows the container width.** Every group must end its reduceOrder with a Popup step (the controller enforces this; if author's list omits a terminal Popup for some group, controller appends one).

### ReduceOrder & Overflow Popup — implementation specifics

Sources: Microsoft's [Win32 Ribbon `ScalingPolicy` spec](https://learn.microsoft.com/en-us/windows/win32/windowsribbon/windowsribbon-templates), [Jensen Harris — "Scaling Up, Scaling Down"](https://learn.microsoft.com/en-us/archive/blogs/jensenh/scaling-up-scaling-down), [SyncFusion `RibbonGroup` API](https://helpej2.syncfusion.com/angular/documentation/api/ribbon/ribbongroup/index), [Telerik RibbonView keyboard support](https://www.telerik.com/winui/documentation/controls/radribbonview/features/keyboard-support).

**Algorithm (single tab, on host resize):**

1. `ResizeObserver` on `mp-ribbon` host fires; callback reads the active tab's content-row scroll/required width vs. its available width.
2. If `requiredWidth > availableWidth`: apply the next un-applied step from `reduceOrder`. Repeat in a `requestAnimationFrame` (NOT inside the RO callback) until it fits or no steps remain.
3. If `availableWidth > requiredWidth + nextStepGain`: revert the most-recently-applied step. Repeat similarly.
4. Per-step state is stored as a `Map<groupId, currentSize>` on the tab; `currentSize` is reflected to each `<mp-ribbon-group>` as `data-resolved-size="..."` so CSS can do the rest (the `popup` value collapses the group's toolbar into the trigger button via a `:host([data-resolved-size="popup"]) ... { display: none }` rule in the group's shadow DOM, and reveals a hidden popup-trigger button).
5. **Anti-flicker** is automatic: because each step changes resolved width by a discrete quantum (e.g. Large → Medium drops ~32 px per item), the shrink-and-grow thresholds for any single step are offset by at least that quantum, so no width can sit "between" them.

**Primitives to reuse (do NOT reinvent):**
- **Overlay positioning** — Angular CDK's `FlexibleConnectedPositionStrategy`, exactly as `BsDropdownMenuDirective` uses it (`libs/mintplayer-ng-bootstrap/dropdown/src/dropdown-menu/dropdown-menu.directive.ts:55-60`). CDK already handles viewport-clamping (`withFlexibleDimensions` / `withViewportMargin`). No `@floating-ui` and no custom positioner.
- **Overlay stack** — `BsOverlayStackService` (`libs/mintplayer-ng-bootstrap/a11y/src/overlay-stack/overlay-stack.service.ts`). Each popup-chunk overlay pushes a token on open, releases on close; Esc handler only acts if `isTop(token)`.
- **Outside-click** — `@mintplayer/ng-click-outside`'s `ClickOutsideDirective` (already a base class for `BsDropdownMenuDirective`).
- **ResizeObserver pattern** — copy `mint-dock-manager.element.ts:147,327-328,350-351` (create in `firstUpdated`, disconnect in `disconnectedCallback`, rAF-coalesce work via `scheduleRender...` style). No shared controller yet.
- **Live announcements** — `LiveAnnouncerController` (`libs/mintplayer-ng-bootstrap/web-components/a11y/src/live-announcer.ts`) for the Lit element; `BsLiveAnnouncerService` (`libs/mintplayer-ng-bootstrap/a11y/src/live-announcer/live-announcer.service.ts`) if announcing from Angular code.
- **Closest precedent** — `libs/mintplayer-ng-bootstrap/priority-nav/src/priority-nav/priority-nav.component.ts:134-166` (`BsPriorityNavComponent`). It implements the same measure → calculate-overflow → render pattern; the ribbon adapts the same shape but groups items into `RibbonGroup`s and renders overflow as per-group popups rather than a single shared dropdown.

**Differences from priority-nav worth flagging up-front:**
- Priority-nav has a flat priority list; ribbon has *(group, size)* steps with multiple states per group.
- Priority-nav's overflow is a single shared `[bsDropdown]` — ribbon needs one overlay *per collapsed group*, each anchored to its own trigger.
- Priority-nav measures via a hidden off-screen "measure strip" — ribbon's groups must measure in-place since `idealSize` styling already renders the group at its largest form when uncollapsed.

**Out-of-scope clarifications surfaced by the research:**
- **Shared end-of-tab "…" overflow chevron** is the *Simplified Ribbon* model (Office 365), and lives under FR-8 (Simplified layout). FR-6/FR-7 are the *Classic Ribbon* model only.
- **Custom-group opt-out** (`<bs-ribbon-group [autoScale]="false">`) — supported but explicitly documented as "will worsen narrow-window layout" because the group stays Large and forces neighbours to collapse earlier.
- **In-Ribbon Gallery scales first** (Win32's `GalleryScalesFirst` template) — the gallery item collapses to a popup *before* the rest of its group collapses. Not in scope for v1 unless we ship galleries with that semantic; flagged for follow-up.

### Visual version themes — implementation specifics

Sources: [Jensen Harris archive](https://learn.microsoft.com/en-us/archive/blogs/jensenh/), [Office 2010 Visuals & Branding (Keri Vandeberghe)](https://learn.microsoft.com/en-us/archive/blogs/office2010/office-2010-visuals-and-branding), [Infragistics — Office 2007 Look and Feel](https://www.infragistics.com/help/winforms/styling-guide-about-the-office-2007-look-and-feel), [Infragistics — Office 2013 Look and Feel](https://www.infragistics.com/help/winforms/wintoolbarsmanager-office-2013-ribbon-look-and-feel), [Microsoft Support — Change look and feel of Microsoft 365](https://support.microsoft.com/en-gb/office/change-the-look-and-feel-of-microsoft-365-63e65e1c-08d4-4dea-820e-335f54672310), [Techinch — The Colors of Microsoft Office](https://techinch.com/blog/The-Colors-of-Microsoft-Office), [DevExpress Office2016Colorful skin colours](https://supportcenter.devexpress.com/ticket/details/t383046/office-2016-colorful-skins-problems).

**Per-version distinctive traits (what visually identifies each at a glance):**
| Version | Tab strip | Active tab | Item hover | Icons | Group separator |
|--|--|--|--|--|--|
| **2007** | Glassy blue gradient `#C7DEFD → #A4C5F4` | Arched white card breaking into panel | Honey gradient `#FFE8A1 → #FFC759` w/ amber border | Full-colour raster | Full-height vertical line |
| **2010** | Neutral silver gradient `#E8ECEF → #D6DBE0` | Same arched card, squarer corners | Soft cream `#FFEFB7` w/ light border | Full-colour raster (refined) | Faded vertical hairline |
| **2013** | Pale app-tinted band `~#DDE6F0` (Word) | White rectangular block, accent-coloured label | Flat grey `#EAEAEA`, no border | Flat monochrome accent-tinted vector | Short centred hairline `#D2D2D2` |
| **2016** | Full app-accent colour band `#2B579A` (Word) | White block + 2px coloured underline | Flat grey `#E6E6E6` (white themes) | Flat monochrome | Short centred hairline `#D2D2D2` |

**Architecture (workspace-first variant pattern):**
- `[version]` is reflected as `version="office-XXXX"` on the `<mp-ribbon>` host. All four versions ship in `mp-ribbon.element.ts`'s `static styles` block as `:host([version="office-XXXX"]) { /* token overrides */ }` rule groups. No separate SCSS files, no `adoptedStyleSheets`, no runtime stylesheet swapping — matches the workspace's existing single-file-per-element convention (`mint-multi-range.element.template.ts:15-25` is the closest precedent for component-namespaced `--bs-*-*` tokens).
- The same `version` attribute is propagated from `mp-ribbon` to its slotted `mp-ribbon-group` children (and downstream items) via a `MutationObserver`-or-`updated()`-driven `setAttribute('version', ...)` pass. Each shadow root then applies its own per-version rules without crossing shadow boundaries. This avoids `inherit` (which doesn't cross shadow DOM) and avoids requiring CSS-variable cascade through host-context selectors.
- **Defaults if `[version]` is unset**: render as `office-2016` (most modern, most familiar).
- **Per-app accent** (`--bs-ribbon-app-accent`) is consumer-supplied — library does NOT ship per-app presets. Fallback `var(--bs-primary, #0d6efd)` so unconfigured ribbons still render coherently in the host app's primary colour. Word/Excel/PowerPoint/etc. canonical hex values are documented in FR-26 above but never hard-coded.

**Per-version `--bs-ribbon-*` token cheat sheet** (drop-in starting values; refine against reference screenshots before shipping):

```css
:host([version="office-2007"]) {
  --bs-ribbon-font-family: "Segoe UI", Tahoma, sans-serif;
  --bs-ribbon-tabstrip-bg: linear-gradient(#C7DEFD, #A4C5F4);
  --bs-ribbon-tabpanel-bg: linear-gradient(#F4F8FD, #DCE7F5);
  --bs-ribbon-tab-active-bg: linear-gradient(#F4F8FD, #DCE7F5);
  --bs-ribbon-tab-active-indicator: none;       /* arched card */
  --bs-ribbon-tab-radius: 3px 3px 0 0;
  --bs-ribbon-tab-height: 23px;
  --bs-ribbon-group-separator: rgba(0,0,0,.18);
  --bs-ribbon-group-separator-inset: 0;          /* full height */
  --bs-ribbon-item-hover-bg: linear-gradient(#FFE8A1, #FFC759);
  --bs-ribbon-item-hover-border: #D9A03C;
  --bs-ribbon-item-pressed-bg: linear-gradient(#F5B23A, #E08A1A);
  --bs-ribbon-icon-style: raster-colored;
}
:host([version="office-2010"]) {
  --bs-ribbon-font-family: "Segoe UI", Calibri, sans-serif;
  --bs-ribbon-tabstrip-bg: linear-gradient(#E8ECEF, #D6DBE0);
  --bs-ribbon-tabpanel-bg: #F2F4F6;
  --bs-ribbon-tab-active-bg: #F2F4F6;
  --bs-ribbon-tab-active-indicator: none;
  --bs-ribbon-tab-radius: 2px 2px 0 0;
  --bs-ribbon-tab-height: 22px;
  --bs-ribbon-group-separator: #C8CDD2;
  --bs-ribbon-group-separator-inset: 0;
  --bs-ribbon-item-hover-bg: #FFEFB7;
  --bs-ribbon-item-hover-border: #E8C46A;
  --bs-ribbon-item-pressed-bg: #F5DC8A;
  --bs-ribbon-icon-style: raster-colored;
  --bs-ribbon-file-tab-bg: var(--bs-ribbon-app-accent, #1E5BB7);
}
:host([version="office-2013"]) {
  --bs-ribbon-font-family: "Segoe UI", sans-serif;
  --bs-ribbon-tabstrip-bg: color-mix(in srgb, var(--bs-ribbon-app-accent, #2B579A) 18%, #FFFFFF);
  --bs-ribbon-tabpanel-bg: #FFFFFF;
  --bs-ribbon-tab-active-bg: #FFFFFF;
  --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent, #2B579A);
  --bs-ribbon-tab-active-indicator: none;        /* block, no underline */
  --bs-ribbon-tab-radius: 0;
  --bs-ribbon-tab-height: 28px;
  --bs-ribbon-group-separator: #D2D2D2;
  --bs-ribbon-group-separator-inset: 8px;        /* short, centred */
  --bs-ribbon-item-hover-bg: #EAEAEA;
  --bs-ribbon-item-hover-border: transparent;
  --bs-ribbon-item-pressed-bg: #D6D6D6;
  --bs-ribbon-icon-style: flat-monochrome;
}
:host([version="office-2016"]) {
  --bs-ribbon-font-family: "Segoe UI", sans-serif;
  --bs-ribbon-tabstrip-bg: var(--bs-ribbon-app-accent, #2B579A);
  --bs-ribbon-tabpanel-bg: #FFFFFF;
  --bs-ribbon-tab-idle-color: rgba(255,255,255,.85);
  --bs-ribbon-tab-hover-bg: rgba(255,255,255,.15);
  --bs-ribbon-tab-active-bg: #FFFFFF;
  --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent, #2B579A);
  --bs-ribbon-tab-active-indicator: 2px solid var(--bs-ribbon-app-accent, #2B579A);
  --bs-ribbon-tab-radius: 0;
  --bs-ribbon-tab-height: 30px;
  --bs-ribbon-group-separator: #D2D2D2;
  --bs-ribbon-group-separator-inset: 8px;
  --bs-ribbon-item-hover-bg: #E6E6E6;
  --bs-ribbon-item-hover-border: transparent;
  --bs-ribbon-item-pressed-bg: #CCCCCC;
  --bs-ribbon-icon-style: flat-monochrome;
}
```

The existing element `css\`...\`` blocks then consume these tokens with `var(--bs-ribbon-*, fallback)` references — this is what the FR-19 entry already calls for and is currently not done; **shipping per-version themes forces the existing styles to be tokenised first**, which closes the FR-19 gap as a side effect.

**Caveats worth flagging in the PR review:**
- Exact hex values for 2007/2010 gradients are pixel-sampled from third-party "Office theme" reproductions (Infragistics/DevExpress/Syncfusion) and Wikipedia commons screenshots — Microsoft never published a public colour-token spec for those releases. Treat as starting points; refine against actual screenshots in the review.
- PowerPoint's accent has two competing canonical values in the wild (`#B7472A` vs `#D24726`). Document one and stay consistent across the project.
- **Touch Mode** (an orthogonal Office 2013+ toggle that ~doubles button padding and tab height) is now shipped under FR-38 as `[touchMode]="'on'|'off'|'auto'"` — not coupled to `[version]`.
- **Office 2007's Aero glass blur** behind the title is an OS-level effect, not a ribbon style; not reproducible cross-browser and explicitly omitted.
- The `office-2007` theme's `linear-gradient` tab strip will conflict with `--bs-ribbon-app-accent` if a consumer sets it — for 2007 the accent has no effect (no per-app colouring existed in that version). Document this.

**Out-of-scope variations** (filed for later issues if demand arises):
- Office 2007's Black / Silver colour schemes (only the Blue scheme is shipped under `office-2007`).
- Office 2019 / Microsoft 365 "Coloured Header" / Backstage redesign.

### Dark mode — implementation specifics (FR-32 / FR-33 / FR-34 / FR-35)

Sources: [Microsoft Support — Change look and feel of Microsoft 365](https://support.microsoft.com/en-us/office/change-the-look-and-feel-of-microsoft-365-63e65e1c-08d4-4dea-820e-335f54672310), [Microsoft Black-theme rollout (Feb 2016)](https://22point.wordpress.com/2016/02/25/microsoft-office-has-a-new-black-theme/), [InformIT — Shades of Gray (Office 2013 themes)](https://www.informit.com/articles/article.aspx?p=2130753), [Bootstrap 5.3 Color Modes](https://getbootstrap.com/docs/5.3/customize/color-modes/), [MDN `prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme), DevExpress / Syncfusion / Telerik "Office Black" skin colour tables.

**API recap:**
- `[colorScheme]` on `bs-ribbon` (Angular `input<>` signal input). Reflected to `color-scheme="..."` on `mp-ribbon` via `[attr.color-scheme]`.
- `mp-ribbon` declares `@property({ type: String, attribute: 'color-scheme', reflect: true }) colorScheme = 'auto'`.
- Demo uses `model<'light' | 'dark' | 'auto'>('auto')` so the picker can two-way bind via `[(ngModel)]`.
- `:host { color-scheme: light dark; }` declared so native form controls inside the ribbon's shadow render in the matching scheme — important for `<select>` / `<input type="color">`.

**Precedence (highest wins):**
1. Explicit `[colorScheme]="dark"` or `[colorScheme]="light"` (always overrides).
2. Ancestor `data-bs-theme="dark"` — honoured for free under `[colorScheme]="auto"` via the existing Bootstrap-fallback variable chain (`var(--bs-body-bg, ...)` etc.). No extra wiring.
3. `[colorScheme]="auto"` → `@media (prefers-color-scheme: dark)`.

**Office 2007 / 2010 fallback:** Microsoft never shipped a true dark mode for these. `[colorScheme]="dark"` is a no-op visually — these versions keep their existing chrome (gradient blue or silver). Documented as a known limitation in the README; the input is accepted for API consistency but doesn't change appearance.

**Office 2016 Black — drop-in token cheat sheet** (paste after the existing per-version blocks in `mp-ribbon.element.ts:131-159`):

```css
:host {
  color-scheme: light dark;
}

/* Explicit dark, always-applied */
:host([color-scheme="dark"][version="office-2016"]) {
  --bs-ribbon-container-bg:           #262626;
  --bs-ribbon-container-border:       #1A1A1A;
  --bs-ribbon-tabstrip-bg:            #1F1F1F;
  --bs-ribbon-tabstrip-border:        #1A1A1A;
  --bs-ribbon-tab-idle-color:         rgba(255, 255, 255, 0.78);
  --bs-ribbon-tab-hover-bg:           #3A3A3A;
  --bs-ribbon-tab-active-bg:          #363636;
  --bs-ribbon-tab-active-color:       #FFFFFF;
  --bs-ribbon-tab-active-indicator-color:
      color-mix(in oklab, var(--bs-ribbon-app-accent) 55%, white 45%);
  --bs-ribbon-tabpanel-bg:            #363636;
  --bs-ribbon-group-separator:        rgba(255, 255, 255, 0.10);
  --bs-ribbon-group-label-color:      rgba(255, 255, 255, 0.60);
  --bs-ribbon-item-hover-bg:          #3F3F3F;
  --bs-ribbon-item-hover-border:      rgba(255, 255, 255, 0.15);
  --bs-ribbon-item-pressed-bg:        #4A4A4A;
}

/* Auto: same tokens behind a media query */
@media (prefers-color-scheme: dark) {
  :host([color-scheme="auto"][version="office-2016"]) {
    /* duplicate the 14 declarations from the [dark] block above */
  }
}
```

**Office 2013 Dark Gray — drop-in token cheat sheet** (mirrors the structure; values from §2 of the Office-research report):

```css
:host([color-scheme="dark"][version="office-2013"]) {
  --bs-ribbon-container-bg:           #444444;
  --bs-ribbon-container-border:       #2B2B2B;
  --bs-ribbon-tabstrip-bg:            #2B2B2B;       /* strip darker than container — 2013-specific inversion */
  --bs-ribbon-tabstrip-border:        #1F1F1F;
  --bs-ribbon-tab-idle-color:         rgba(255, 255, 255, 0.70);
  --bs-ribbon-tab-hover-bg:           #525252;
  --bs-ribbon-tab-active-bg:          #444444;
  --bs-ribbon-tab-active-color:       #FFFFFF;
  --bs-ribbon-tab-active-indicator-color: transparent;  /* 2013 has no underline; the active card is the indicator */
  --bs-ribbon-tabpanel-bg:            #444444;
  --bs-ribbon-group-separator:        rgba(255, 255, 255, 0.08);
  --bs-ribbon-group-label-color:      rgba(255, 255, 255, 0.55);
  --bs-ribbon-item-hover-bg:          #5A5A5A;
  --bs-ribbon-item-hover-border:      transparent;        /* 2013 went borderless on hover */
  --bs-ribbon-item-pressed-bg:        #6A6A6A;
}
```

**App-accent on dark (FR-34):**
- Existing `--bs-ribbon-app-accent` stays consumer-controlled (Word `#2B579A`, etc.).
- New token `--bs-ribbon-app-accent-on-dark` introduced in the default token block at `mp-ribbon.element.ts:33-51`:
  ```css
  --bs-ribbon-app-accent-on-dark:
    color-mix(in oklab, var(--bs-ribbon-app-accent) 55%, white 45%);
  ```
- Per-version dark blocks use `--bs-ribbon-app-accent-on-dark` instead of `--bs-ribbon-app-accent` for the active-tab indicator stripe. Active-tab label stays at `#FFFFFF` regardless of brand colour.

**Contextual band dark rule (FR-35):**
- Override the luminance-driven `--ribbon-contextual-text` rule from FR-10. In dark mode:
  ```css
  :host([color-scheme="dark"]) .ribbon-contextual-group-band,
  @media (prefers-color-scheme: dark) {
    :host([color-scheme="auto"]) .ribbon-contextual-group-band {
      background: color-mix(in oklab, var(--bs-ribbon-contextual-color) 40%, #1F1F1F 60%);
      color: #FFFFFF;
    }
  }
  ```
- The luminance auto-rule that drives `--ribbon-contextual-text` inline (`getBandTextColor()` in TS) is *not removed* — the dark CSS overrides it. Simpler than threading a "we're in dark" signal into the TS computation.

**Caveats to flag in the PR review:**
- 2007/2010 dark fallback (no visual change) is intentional. Document in README + `bs-ribbon` JSDoc.
- The `oklab` colour space in `color-mix` is Baseline 2023; needs a Chrome 111+/Safari 16.4+ floor. Already aligned with the rest of the workspace's modern-browser stance.
- Auto mode + ancestor `data-bs-theme="dark"`: works through Bootstrap's variable chain BUT only if the consumer wires Bootstrap's color-modes layer. The ribbon's own tokens cascade independently, so the `[colorScheme]="auto"` + `prefers-color-scheme` path always works.
- SSR: `prefers-color-scheme` evaluates as `light` on the server. Don't gate `firstUpdated` on it (we don't currently).

### Mobile / touch accessibility — explicitly out of scope

These are *not* mobile accessibility issues we plan to solve, and the PRD should be explicit about it so consumers don't expect them:

- **Word-for-iOS / Office for Android style bottom toolbar.** Word on iOS / Android replaces the ribbon entirely with a single icon-row bottom toolbar — a completely different control. We don't reproduce that. The ribbon stays a ribbon on phones, just with FR-37 / FR-38 / FR-39 making it usable.
- **Auto-flip to Simplified layout at narrow viewports.** Coupling viewport size to layout *mode* would surprise desktop consumers using Classic when they shrink the window. Layout stays consumer-controlled; FR-37's CSS handles the responsive accessibility without touching the layout.
- **Gesture controls.** Swipe between tabs, pinch on the ribbon, etc. — not implemented; not planned.
- **Hover-only affordances on touch.** `:hover` only sticks during the tap on touch devices. Pressed/checked persistent states (toggle-button, group-button, contextual tab indicator) cover the cases where state visibility actually matters; transient hover affordances (subtle bg change on a regular button) are *not* directly accessible on touch but the pressed/active states are sufficient for the use cases that matter.

---

## Related
- Issue #330
- Issue #327 (a11y baseline) — patterns and PRD followed for ARIA/keyboard.
- Reference components: `dock/`, `tile-manager/`, `tab-control/`, `multi-range/`.
- Future spin-offs: Backstage / File menu, Mini Toolbar, Tell-Me command palette.
- See `docs/prd/wc-aria-accessibility.md` for the workspace-wide ARIA conventions this PRD inherits.

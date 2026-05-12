# Product Requirements Document: Ribbon

**Issue**: #330
**Title**: Ribbon
**Status**: Draft
**Created**: 2026-05-12
**Last Updated**: 2026-05-12

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

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1** — `mp-ribbon` Lit WC + `bs-ribbon` Angular wrapper, secondary entry point `@mintplayer/ng-bootstrap/ribbon`.
- [ ] **FR-2** — Tab strip with `mp-ribbon-tab` elements; arrow-key navigation; Home/End; manual activation (Enter/Space).
- [ ] **FR-3** — Groups (`mp-ribbon-group`) with header label, optional dialog launcher button, slot for items.
- [ ] **FR-4** — All nine item kinds, each as its own Lit element + Angular wrapper: Button, SplitButton, DropdownButton, ToggleButton, CheckBox, ComboBox, ColorPicker, GroupButton (toggle strip), Gallery (+ GalleryItem), and a TemplateItem custom-slot wrapper.
- [ ] **FR-5** — Item sizes: `large` / `medium` / `small` reflected as `data-size` on each item; styled via component SCSS.
- [ ] **FR-6** — Office-faithful **ReduceOrder** sizing engine. Per-tab `reduceOrder: [groupId, size][]`. `ResizeObserver` walks the list on container resize and reverses on grow. Sensible default if author omits (collapse rightmost group first).
- [ ] **FR-7** — Overflow Popup terminal step: every group can collapse to a single dropdown button (default behaviour); shared single-popup overflow is the explicit opt-in alternative.
- [ ] **FR-8** — Classic and Simplified layouts, switchable via `[layout]` attribute. State (selected tab, QAT pins, minimized flag) preserved across switches.
- [ ] **FR-9** — Minimize/restore: Ctrl+F1, double-click tab, programmatic `[minimized]`. Announced via live region.
- [ ] **FR-10** — Contextual tab sets via `mp-ribbon-contextual-tab-set`; coloured header band (themed via `--bs-ribbon-contextual-color`); show/hide announced via live region.
- [ ] **FR-11** — Quick Access Toolbar (`mp-quick-access-toolbar`) as a sibling element to `mp-ribbon`. Persists user-pinned commands. Independent ARIA `role="toolbar"`.
- [ ] **FR-12** — KeyTips: Alt activates overlay; `data-key-tip="X"` on tabs/items; library auto-generates fallback tips from first letters with deterministic collision resolution; Esc unwinds; two-level drill-down.
- [ ] **FR-13** — ARIA model matches `project_wc_aria_decisions`: `role="tablist"`/`tab`/`tabpanel` for tab strip; each group body `role="toolbar"`; dialog launcher is a focusable button last in tab order; overflow buttons expose `aria-haspopup`/`aria-expanded`; QAT is a separate toolbar region.
- [ ] **FR-14** — Keyboard model: arrows in tab strip, Tab/Shift+Tab inside toolbars, Ctrl+←/→ jumps group-to-group, Down opens dropdowns, Space/Enter activates, Esc unwinds.
- [ ] **FR-15** — Value-bearing wrappers (`bs-ribbon-combo-box`, `bs-ribbon-color-picker`, `bs-ribbon-toggle-button`, `bs-ribbon-check-box`) implement `ControlValueAccessor`.
- [ ] **FR-16** — Slot-based icons (`<i slot="icon">`) on every item. Library publishes `.ribbon-icon-large/medium/small` utility classes for size variants.
- [ ] **FR-17** — `LiveAnnouncerController` integration: minimize/restore, contextual show/hide, overflow threshold crossings.
- [ ] **FR-18** — `prefers-reduced-motion` honored on popup transitions, layout switches, contextual reveal.
- [ ] **FR-19** — Theming via `--bs-ribbon-*` CSS custom properties; `data-bs-theme="dark"` respected; works under `[dir="rtl"]`.
- [ ] **FR-20** — Demo page at `/advanced/ribbon` covering: full Home tab, Insert tab, Picture Tools contextual tab, QAT, layout toggle, minimize toggle, KeyTips legend, code-block snippets.
- [ ] **FR-21** — Vitest specs per element + ARIA spec file (`mp-ribbon.aria.spec.ts`). Playwright e2e for the demo page covering: layout switch, contextual show/hide, KeyTips drill-down, keyboard nav to every command, minimize/restore.
- [ ] **FR-22** — Smoke-tested in Chrome and Firefox (per `feedback_firefox_flex_shrink`).

### Should Have (P1)

- [ ] **FR-23** — Group-priority hint on `mp-ribbon-group` (`[priority]="number"`) as an authoring sugar that the default reduceOrder generator uses.
- [ ] **FR-24** — `tellMeSlot` slot on the tab strip reserved for the consumer to drop in an arbitrary search box later (no implementation, just the slot).

### Will Not Have (out of scope for #330 — file separately)

- Backstage / File menu (full-screen file-level surface).
- Mini Toolbar (selection-floating toolbar — unrelated surface).
- "Tell me / Search" command palette with command registry and fuzzy search.
- Persisted QAT pins across sessions (consumer wires localStorage themselves).
- Touch-mode larger hit targets (future enhancement once Office's touch ribbon stabilises).

---

## Timeline & Milestones

### Milestone 1: Skeleton & sizing engine
- [ ] Entry point + path alias + Nx wiring
- [ ] `mp-ribbon` + `mp-ribbon-tab` + `mp-ribbon-group` + `mp-ribbon-button`
- [ ] `ReduceOrderController` (ResizeObserver-driven)
- [ ] Default reduceOrder generator
- [ ] Tab strip ARIA + arrow-key navigation

### Milestone 2: Remaining item kinds (Classic)
- [ ] SplitButton, DropdownButton, ToggleButton, CheckBox
- [ ] ComboBox, ColorPicker, GroupButton
- [ ] Gallery + GalleryItem
- [ ] TemplateItem custom-slot wrapper
- [ ] `ControlValueAccessor` wrappers

### Milestone 3: Accessibility & keyboard parity
- [ ] All ARIA roles + attributes
- [ ] Roving tabindex in toolbars
- [ ] Ctrl+←/→ group jumps, Ctrl+F1 minimize, Esc unwind
- [ ] LiveAnnouncer integration
- [ ] `prefers-reduced-motion` plumbing

### Milestone 4: KeyTips
- [ ] `KeyTipsController`
- [ ] Alt overlay + drill-down
- [ ] Collision resolution
- [ ] Screen-reader-aware disable path

### Milestone 5: Simplified layout
- [ ] `[layout="simplified"]` mode
- [ ] Single-row condensed style
- [ ] Simplified-specific overflow chevron

### Milestone 6: Contextual tabs & QAT
- [ ] `mp-ribbon-contextual-tab-set`
- [ ] `mp-quick-access-toolbar`
- [ ] Live announcements

### Milestone 7: Demo
- [ ] Demo route + page
- [ ] Sidebar entry
- [ ] Snippet blocks

### Milestone 8: Polish & ship
- [ ] Umbrella secondary entry point wiring
- [ ] Firefox smoke
- [ ] axe-core run on demo
- [ ] Build size check

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

---

## Related
- Issue #330
- Issue #327 (a11y baseline) — patterns and PRD followed for ARIA/keyboard.
- Reference components: `dock/`, `tile-manager/`, `tab-control/`, `multi-range/`.
- Future spin-offs: Backstage / File menu, Mini Toolbar, Tell-Me command palette.
- See `docs/prd/wc-aria-accessibility.md` for the workspace-wide ARIA conventions this PRD inherits.

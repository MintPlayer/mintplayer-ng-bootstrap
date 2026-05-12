# Product Requirements Document: Ribbon

**Issue**: #330
**Title**: Ribbon
**Status**: In Progress — Milestone 1/2 (skeleton + raw item WCs landed; sizing engine, a11y depth, contextual/QAT/KeyTips still pending)
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

## Implementation Snapshot (2026-05-12)

Audit of `libs/mintplayer-ng-bootstrap/ribbon/` against the requirements below.

**Landed:**
- Secondary entry point skeleton: `libs/mintplayer-ng-bootstrap/ribbon/` with `ng-package.json` and `src/index.ts` re-exports.
- `mp-ribbon` Lit element with tab strip (arrow keys, Home/End, Enter/Space manual activation) + `[minimized]` + `[layout]` attributes plumbed.
- `mp-ribbon-group` with header label and dialog launcher (rendered in the footer alongside the group label).
- All nine `mp-ribbon-*` item Lit elements exist (Button, SplitButton, DropdownButton, ToggleButton, CheckBox, ComboBox, ColorPicker, GroupButton, Gallery) with shared `MpRibbonItemBase` providing `itemId/label/icon/size/disabled/tooltip` + `item-click` event.
- Angular wrappers for the three top-level pieces: `BsRibbonComponent`, `BsRibbonGroupComponent`, `BsRibbonButtonComponent`.
- Demo route `/advanced/ribbon` registered; Home/Insert/Design/Layout tabs render Office-style content (Clipboard, Font, Paragraph, Styles, Editing on Home, etc.).
- **Per-group `popup` collapse** with `ResizeObserver`-driven reflow: rightmost-first collapse on shrink, leftmost-first expansion on grow, using a `WeakMap` of pre-collapse natural widths. Collapsed groups render a popup-trigger button (icon + label + chevron) with `aria-haspopup="true"`/`aria-expanded`. Click opens an overlay (`position: fixed`, viewport-clamped horizontally) containing the full group; Escape/outside-mousedown close. Verified at 900 / 1500 / 2000 px viewport widths and across Insert/Home/Design/Layout tabs.

**Deviations from the PRD that need to be reconciled before this milestone closes:**
- **Tabs are a JSON-encoded `[tabs]` array input on `mp-ribbon`**, not declared as `mp-ribbon-tab` light-DOM children. PRD §"DOM is the source of truth" requires the latter; this is the largest architectural deviation and blocks the contextual-tab-set design.
- **Item sizes are reflected as class `ribbon-item-<size>`** rather than `data-size="<size>"` on the host (FR-5). Affects external CSS hooks.
- **Group body uses `role="region"` instead of `role="toolbar"`** (FR-13). Affects screen-reader semantics and roving-focus design.
- **Item icons take a `string` attribute** (emoji / glyph) rather than a `<slot name="icon">` (FR-16). Consumers cannot project SVG/`<i class="bi-*">`.
- **No Angular wrappers** for the non-Button item kinds yet (FR-4 second half).

**Not yet started:**
- Intermediate `large` → `medium` → `small` ReduceOrder steps; author-declared `[reduceOrder]` / `[idealSizes]` / `[priority]` API on tabs and groups (FR-6 P0 partial, FR-23). MVP collapse-to-popup landed but only the single rightmost-first → popup default.
- Simplified layout — `[layout]` is accepted but render is identical to Classic (FR-8).
- Live announcer integration for minimize/restore (FR-9 announcer + Ctrl+F1 binding + double-click toggle).
- Contextual tab sets (FR-10), Quick Access Toolbar (FR-11), KeyTips (FR-12).
- Roving focus inside group toolbars + Ctrl+←/→ group jumps + Esc unwinding (FR-14).
- `ControlValueAccessor` wrappers (FR-15).
- `LiveAnnouncerController` plumbing across the whole component (FR-17).
- `prefers-reduced-motion` handling (FR-18).
- Dark theme + RTL verification (FR-19).
- Contextual / QAT / KeyTips legend in the demo (FR-20).
- Unit + ARIA + Playwright specs (FR-21); Firefox smoke (FR-22).
- `tellMeSlot` (FR-24).

---

## Functional Requirements

### Must Have (P0)

- [x] **FR-1** — `mp-ribbon` Lit WC + `bs-ribbon` Angular wrapper, secondary entry point `@mintplayer/ng-bootstrap/ribbon`. *(Entry point + Lit element + Angular wrapper landed. ng-package.json present; consumed by demo via `@mintplayer/ng-bootstrap/ribbon` import.)*
- [ ] **FR-2** — Tab strip with `mp-ribbon-tab` elements; arrow-key navigation; Home/End; manual activation (Enter/Space). *(Keyboard model done. Tabs are currently a JSON `[tabs]` array input on `mp-ribbon` — needs migration to light-DOM `mp-ribbon-tab` children to honour the "DOM is the source of truth" rule.)*
- [x] **FR-3** — Groups (`mp-ribbon-group`) with header label, optional dialog launcher button, slot for items. *(Label + dialog launcher render in the group footer; default slot accepts item children. Will need revisiting once toolbar role lands per FR-13.)*
- [ ] **FR-4** — All nine item kinds, each as its own Lit element + Angular wrapper: Button, SplitButton, DropdownButton, ToggleButton, CheckBox, ComboBox, ColorPicker, GroupButton (toggle strip), Gallery (+ GalleryItem), and a TemplateItem custom-slot wrapper. *(All nine Lit elements landed. Missing: Angular wrappers for everything except Button; `mp-ribbon-gallery-item`; `mp-ribbon-template-item`.)*
- [ ] **FR-5** — Item sizes: `large` / `medium` / `small` reflected as `data-size` on each item; styled via component SCSS. *(Sizes work but are reflected as a class `ribbon-item-<size>` on the inner element rather than as `data-size` on the host. Rename pending.)*
- [ ] **FR-6** — Office-faithful **ReduceOrder** sizing engine. Modeled directly on the Win32 Ribbon `ScalingPolicy`. *(MVP partial: `ResizeObserver`-driven reflow that collapses rightmost group → `popup` on shrink and expands leftmost popup'd group on grow, using a `WeakMap` of pre-collapse natural widths and `requestAnimationFrame`-coalesced reflows. Author-declared `[reduceOrder]` / `[idealSizes]` API, intermediate `medium`/`small` steps, `[priority]` hint, and `[autoScale]` opt-out are still pending.)*
   - Each `<bs-ribbon-tab>` accepts (a) an `idealSizes` map `{ [groupId]: 'large' | 'medium' | 'small' }` defining the starting size per group, and (b) an ordered `reduceOrder: [groupId, targetSize][]` list of reduction steps walked top-to-bottom on shrink.
   - On grow, the same list is walked **bottom-to-top**, reverting steps in reverse insertion order.
   - **Flicker is prevented by step quantization, not hysteresis bands** — each step changes a group's resolved width by a discrete amount, so the "shrink threshold" of step *n* is strictly less than the "grow threshold" of step *n − 1*.
   - Sizes are quantized to `large | medium | small | popup`; sizes must be monotonically non-increasing per group across the list (validated at runtime; a console warning is emitted on violation).
   - The engine is driven by a `ResizeObserver` on `mp-ribbon`'s host; the callback measures the active tab's content row and applies the next step. **Measurement is decoupled from mutation** (measure-then-mutate, not in the same RO frame) to avoid re-entrant RO loops.
   - **Per-group collapse is the default** (Classic Ribbon model — Word/Excel/PowerPoint). Shared end-of-tab overflow chevron is Simplified-only and out of scope for FR-6 (see FR-8 for the Simplified-layout overflow).
   - Default reduction policy when the author omits `reduceOrder`: collapse rightmost group's largest items first to `medium`, then `small`, then `popup`, moving leftward; supports `[priority]` hint from FR-23 to override.
   - Groups can opt out by omitting their `popup` step — the ribbon then falls back to horizontal scrolling at extreme narrow widths (mirrors Office; explicitly documented limitation).
- [ ] **FR-7** — Overflow **Popup chunk**: when a group's resolved size is `popup`, its toolbar collapses to a single dropdown button that opens an overlay containing the full group at its `idealSize` layout. *(MVP landed: trigger renders icon + label + chevron with `aria-haspopup="true"`/`aria-expanded`; overlay is `position: fixed` inside the group's shadow root and clamps horizontally to the viewport; Esc + outside-mousedown close. Still pending: Angular CDK / `BsOverlayStackService` integration for nested-overlay Esc handling, live-region announcement, focus-on-trigger when a group with focused content collapses, dialog-launcher rehome inside popup, and KeyTip routing.)*
   - **Trigger button** renders the group's icon (consumer-projected via `<slot name="icon">` on `<bs-ribbon-group>`) + group label + chevron (`▼`), occupies a "large" item slot, has `aria-haspopup="true"` and `aria-expanded`, and is `aria-labelledby` the group label.
   - **Overlay** renders below the trigger, anchored to its left edge, and **clamps horizontally to the viewport** (does not flip above the ribbon; Office's WPF/Win32 behaviour confirmed by Telerik docs). Implementation reuses Angular CDK's `FlexibleConnectedPositionStrategy.flexibleConnectedTo(...).withPositions([...])` — already wired in `bs-dropdown-menu` (`libs/mintplayer-ng-bootstrap/dropdown/src/dropdown-menu/dropdown-menu.directive.ts`).
   - **Content** is the same Large-size group layout the user would have seen inline; the dialog-launcher chevron rehomes from the group footer to **inside the popup** at the same footer position.
   - **Dismissal**: Esc and outside-click close the overlay; focus returns to the trigger. Outside-click reuses the existing `@mintplayer/ng-click-outside` package (also already used by `bs-dropdown-menu`).
   - **Escape nesting**: the open overlay registers with `BsOverlayStackService` (`libs/mintplayer-ng-bootstrap/a11y/src/overlay-stack/overlay-stack.service.ts`) so Esc only closes the topmost overlay when the popup is nested inside other overlays.
   - **Focus on collapse**: if focus was inside a group at the moment it collapsed, focus moves to the new popup trigger (Office behaviour — the popup is NOT auto-opened; the user re-opens it explicitly).
   - **KeyTip** (FR-12): a collapsed group's popup trigger receives a single-letter KeyTip; activating it opens the popup and rebuilds the overlay with a second tier of KeyTips for the controls inside.
   - **Live region** (FR-17): an announcement fires when a group crosses the `popup` threshold ("Paragraph group collapsed" / "Paragraph group expanded").
- [ ] **FR-8** — Classic and Simplified layouts, switchable via `[layout]` attribute. State (selected tab, QAT pins, minimized flag) preserved across switches. *(`[layout]` attribute is plumbed onto `mp-ribbon` but currently has no visual effect — render path is identical for both modes.)*
- [ ] **FR-9** — Minimize/restore: Ctrl+F1, double-click tab, programmatic `[minimized]`. Announced via live region. *(Programmatic `[minimized]` works and hides the content area. Missing: Ctrl+F1 keybinding, double-click-tab toggle, live-region announcement.)*
- [ ] **FR-10** — Contextual tab sets via `mp-ribbon-contextual-tab-set`; coloured header band (themed via `--bs-ribbon-contextual-color`); show/hide announced via live region.
- [ ] **FR-11** — Quick Access Toolbar (`mp-quick-access-toolbar`) as a sibling element to `mp-ribbon`. Persists user-pinned commands. Independent ARIA `role="toolbar"`.
- [ ] **FR-12** — KeyTips: Alt activates overlay; `data-key-tip="X"` on tabs/items; library auto-generates fallback tips from first letters with deterministic collision resolution; Esc unwinds; two-level drill-down.
- [ ] **FR-13** — ARIA model matches `project_wc_aria_decisions`: `role="tablist"`/`tab`/`tabpanel` for tab strip; each group body `role="toolbar"`; dialog launcher is a focusable button last in tab order; overflow buttons expose `aria-haspopup`/`aria-expanded`; QAT is a separate toolbar region. *(Partial: tab strip uses `role="tablist"`/`tab`/`tabpanel` correctly. Group body is `role="region"` — needs to change to `toolbar`. Dialog-launcher tab order, overflow `aria-haspopup`/`aria-expanded`, QAT region not yet present.)*
- [ ] **FR-14** — Keyboard model: arrows in tab strip, Tab/Shift+Tab inside toolbars, Ctrl+←/→ jumps group-to-group, Down opens dropdowns, Space/Enter activates, Esc unwinds. *(Partial: tab strip arrows + Home/End + Enter/Space done. Toolbar roving focus, Ctrl+←/→, Down for dropdowns, Esc unwinding all missing.)*
- [ ] **FR-15** — Value-bearing wrappers (`bs-ribbon-combo-box`, `bs-ribbon-color-picker`, `bs-ribbon-toggle-button`, `bs-ribbon-check-box`) implement `ControlValueAccessor`.
- [ ] **FR-16** — Slot-based icons (`<i slot="icon">`) on every item. Library publishes `.ribbon-icon-large/medium/small` utility classes for size variants. *(Currently the `icon` attribute takes a glyph/emoji string and renders it as text. Slot-based projection + sized icon container utility classes not yet implemented.)*
- [ ] **FR-17** — `LiveAnnouncerController` integration: minimize/restore, contextual show/hide, overflow threshold crossings.
- [ ] **FR-18** — `prefers-reduced-motion` honored on popup transitions, layout switches, contextual reveal.
- [ ] **FR-19** — Theming via `--bs-ribbon-*` CSS custom properties; `data-bs-theme="dark"` respected; works under `[dir="rtl"]`. *(Partial: existing `mp-ribbon` styles use `--bs-border-color`/`--bs-body-bg`/`--bs-primary`/etc. fallbacks. No `--bs-ribbon-*` namespace yet; dark/RTL not verified.)*
- [ ] **FR-20** — Demo page at `/advanced/ribbon` covering: full Home tab, Insert tab, Picture Tools contextual tab, QAT, layout toggle, minimize toggle, KeyTips legend, code-block snippets. *(Partial: route + demo component exist. Home + Insert + Design + Layout tabs populated with Office-style content. Layout toggle + minimize toggle render. Missing: Picture Tools contextual tab, QAT panel, KeyTips legend, code-block snippets.)*
- [ ] **FR-21** — Vitest specs per element + ARIA spec file (`mp-ribbon.aria.spec.ts`). Playwright e2e for the demo page covering: layout switch, contextual show/hide, KeyTips drill-down, keyboard nav to every command, minimize/restore. *(Only a generated demo `ribbon.component.spec.ts` exists. No lib-level Vitest specs and no ARIA / e2e coverage yet.)*
- [ ] **FR-22** — Smoke-tested in Chrome and Firefox (per `feedback_firefox_flex_shrink`). *(Chrome verified via demo screenshots; Firefox pending.)*

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

### Milestone 1: Skeleton & sizing engine — *In Progress*
- [x] Entry point + path alias + Nx wiring
- [x] `mp-ribbon` + `mp-ribbon-group` + `mp-ribbon-button` *(`mp-ribbon-tab` element not yet — tabs are an array input today; see FR-2 deviation)*
- [ ] `ReduceOrderController` (ResizeObserver-driven) *(MVP inlined on `mp-ribbon` + `mp-ribbon-group`; not yet extracted into a reactive controller, no intermediate steps, no author API)*
- [x] Default reduceOrder generator *(MVP: rightmost-first → popup, leftmost-popup-first on grow)*
- [x] Tab strip ARIA + arrow-key navigation

### Milestone 2: Remaining item kinds (Classic) — *Partial*
- [x] SplitButton, DropdownButton, ToggleButton, CheckBox *(Lit elements only)*
- [x] ComboBox, ColorPicker, GroupButton *(Lit elements only)*
- [x] Gallery *(GalleryItem still pending)*
- [ ] TemplateItem custom-slot wrapper
- [ ] Angular wrappers for non-Button items
- [ ] `ControlValueAccessor` wrappers

### Milestone 3: Accessibility & keyboard parity
- [ ] All ARIA roles + attributes *(tablist/tab/tabpanel done; group toolbar role + dialog-launcher ordering + overflow popup states pending)*
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
- [ ] `[layout="simplified"]` mode *(attribute accepted, render path unchanged)*
- [ ] Single-row condensed style
- [ ] Simplified-specific overflow chevron

### Milestone 6: Contextual tabs & QAT
- [ ] `mp-ribbon-contextual-tab-set`
- [ ] `mp-quick-access-toolbar`
- [ ] Live announcements

### Milestone 7: Demo — *Partial*
- [x] Demo route + page
- [x] Sidebar entry
- [x] Home + Insert + Design + Layout tabs populated with Office-style content
- [ ] Picture Tools contextual tab demo
- [ ] QAT demo
- [ ] KeyTips legend
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

---

## Related
- Issue #330
- Issue #327 (a11y baseline) — patterns and PRD followed for ARIA/keyboard.
- Reference components: `dock/`, `tile-manager/`, `tab-control/`, `multi-range/`.
- Future spin-offs: Backstage / File menu, Mini Toolbar, Tell-Me command palette.
- See `docs/prd/wc-aria-accessibility.md` for the workspace-wide ARIA conventions this PRD inherits.

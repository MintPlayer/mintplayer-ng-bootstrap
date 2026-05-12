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
- **Visual version themes** (FR-25/26/27): `[version]` input on `bs-ribbon` reflects to `version="office-XXXX"` on `mp-ribbon`'s host; per-version `:host([version="..."])` rule groups in `mp-ribbon.element.ts` set a complete `--bs-ribbon-*` token set; all element shadow CSS (ribbon / group / button) is tokenised so it consumes those variables via CSS-variable inheritance (no attribute propagation needed). `--bs-ribbon-app-accent` cascades for tab strip / active label colour. Demo has Version + App-accent dropdowns; verified visually across all four versions and with Word / PowerPoint accents.

**Deviations from the PRD that need to be reconciled before this milestone closes:**
- **Item sizes are reflected as class `ribbon-item-<size>`** rather than `data-size="<size>"` on the host (FR-5). Affects external CSS hooks.
- **Group body uses `role="region"` instead of `role="toolbar"`** (FR-13). Affects screen-reader semantics and roving-focus design.
- **Item icons take a `string` attribute** (emoji / glyph) rather than a `<slot name="icon">` (FR-16). Consumers cannot project SVG/`<i class="bi-*">`.

**Not yet started:**
- Intermediate `large` → `medium` → `small` ReduceOrder steps; author-declared `[reduceOrder]` / `[idealSizes]` / `[priority]` API on tabs and groups (FR-6 P0 partial, FR-23). MVP collapse-to-popup landed but only the single rightmost-first → popup default.
- Menu / sub-item content for split-button / dropdown-button (FR-28/29/30/31). Lit elements have the visual shape and `menu-toggle` event but no slot or overlay; needs `OverlayController` extraction + three new menu-content elements + Angular wrappers.
- Visual-regression Playwright screenshots committed for each version + a CI assertion (FR-25 closing checkpoint).
- Office 2007 alternative Black / Silver colour schemes; Office 2016 Dark Gray / Black themes — only the Blue/Colorful variants ship under `office-2007` / `office-2016` (filed for follow-up if requested).
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
- [x] **FR-2** — Tab strip with `mp-ribbon-tab` elements; arrow-key navigation; Home/End; manual activation (Enter/Space). *(Landed. `mp-ribbon-tab` is a new Lit element that hides via `:host(:not([active])) { display: none }` and becomes the tabpanel for its slotted groups when active. `mp-ribbon` watches its default slot, builds the tab strip from slotted `<mp-ribbon-tab>` children (handling Angular `<bs-ribbon-tab>` wrappers via the same inside-querySelector fallback used elsewhere), and sets/removes the `active` attribute on the right child. The old JSON `[tabs]` input is gone — clean break per `feedback_breaking_changes_ok`.)*
- [x] **FR-3** — Groups (`mp-ribbon-group`) with header label, optional dialog launcher button, slot for items. *(Label + dialog launcher render in the group footer; default slot accepts item children. Will need revisiting once toolbar role lands per FR-13.)*
- [x] **FR-4** — All nine item kinds, each as its own Lit element + Angular wrapper: Button, SplitButton, DropdownButton, ToggleButton, CheckBox, ComboBox, ColorPicker, GroupButton (toggle strip), Gallery (+ GalleryItem), and a TemplateItem custom-slot wrapper. *(All ten Lit elements + all ten Angular wrappers shipped. `mp-ribbon-gallery-item` and `mp-ribbon-template-item` Lit elements added. Each value-bearing wrapper implements `ControlValueAccessor` — see FR-15.)*
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
- [ ] **FR-10** — Contextual tab sets via `mp-ribbon-contextual-tab-set`; coloured header band (themed via `--bs-ribbon-contextual-color`); show/hide announced via live region. *(Visual portion landed: `mp-ribbon-contextual-tab-set` wraps tabs with `[label]`/`[color]`/`[hidden]`; `mp-ribbon` parses contextual sets out of the slot, renders a per-set chip in a band above the tab strip, and gives each contextual tab a coloured top-border + accent-tinted active state. Set fires `contextual-visibility-change` on `hidden` toggle so the ribbon re-processes the slot. If the active tab vanishes (its set just hid), the ribbon falls back to the first visible tab. **Missing: live-region announcement** ("Picture Tools, contextual, now available") on show/hide — that depends on FR-17 wiring.)*
- [ ] **FR-11** — Quick Access Toolbar (`mp-quick-access-toolbar`) as a sibling element to `mp-ribbon`. Persists user-pinned commands. Independent ARIA `role="toolbar"`.
- [ ] **FR-12** — KeyTips: Alt activates overlay; `data-key-tip="X"` on tabs/items; library auto-generates fallback tips from first letters with deterministic collision resolution; Esc unwinds; two-level drill-down.
- [ ] **FR-13** — ARIA model matches `project_wc_aria_decisions`: `role="tablist"`/`tab`/`tabpanel` for tab strip; each group body `role="toolbar"`; dialog launcher is a focusable button last in tab order; overflow buttons expose `aria-haspopup`/`aria-expanded`; QAT is a separate toolbar region. *(Partial: tab strip uses `role="tablist"`/`tab`/`tabpanel` correctly. Group body is `role="region"` — needs to change to `toolbar`. Dialog-launcher tab order, overflow `aria-haspopup`/`aria-expanded`, QAT region not yet present.)*
- [ ] **FR-14** — Keyboard model: arrows in tab strip, Tab/Shift+Tab inside toolbars, Ctrl+←/→ jumps group-to-group, Down opens dropdowns, Space/Enter activates, Esc unwinds. *(Partial: tab strip arrows + Home/End + Enter/Space done. Toolbar roving focus, Ctrl+←/→, Down for dropdowns, Esc unwinding all missing.)*
- [x] **FR-15** — Value-bearing wrappers implement `ControlValueAccessor`. *(Landed: `bs-ribbon-toggle-button` (boolean `pressed`), `bs-ribbon-check-box` (boolean `checked`), `bs-ribbon-combo-box` (string `value` + `[options]` array), `bs-ribbon-color-picker` (string hex `color`), `bs-ribbon-group-button` (string `selectedValue` + `[buttons]` radio strip). Each provides `NG_VALUE_ACCESSOR` via `useExisting: forwardRef(...)`, supports `[(ngModel)]` / `[formControl]`, and forwards `setDisabledState`. Gallery is selection-event-based rather than CVA (consumer manages `[selected]` per item).)*
- [ ] **FR-16** — Slot-based icons (`<i slot="icon">`) on every item. Library publishes `.ribbon-icon-large/medium/small` utility classes for size variants. *(Currently the `icon` attribute takes a glyph/emoji string and renders it as text. Slot-based projection + sized icon container utility classes not yet implemented.)*
- [ ] **FR-17** — `LiveAnnouncerController` integration: minimize/restore, contextual show/hide, overflow threshold crossings.
- [ ] **FR-18** — `prefers-reduced-motion` honored on popup transitions, layout switches, contextual reveal.
- [ ] **FR-19** — Theming via `--bs-ribbon-*` CSS custom properties; `data-bs-theme="dark"` respected; works under `[dir="rtl"]`. *(Partial: existing `mp-ribbon` styles use `--bs-border-color`/`--bs-body-bg`/`--bs-primary`/etc. fallbacks. No `--bs-ribbon-*` namespace yet; dark/RTL not verified.)*
- [ ] **FR-20** — Demo page at `/advanced/ribbon` covering: full Home tab, Insert tab, Picture Tools contextual tab, QAT, layout toggle, minimize toggle, KeyTips legend, code-block snippets. *(Partial: route + demo component exist. Home + Insert + Design + Layout tabs populated with Office-style content. Layout toggle + minimize toggle render. Missing: Picture Tools contextual tab, QAT panel, KeyTips legend, code-block snippets.)*
- [ ] **FR-21** — Vitest specs per element + ARIA spec file (`mp-ribbon.aria.spec.ts`). Playwright e2e for the demo page covering: layout switch, contextual show/hide, KeyTips drill-down, keyboard nav to every command, minimize/restore. *(Only a generated demo `ribbon.component.spec.ts` exists. No lib-level Vitest specs and no ARIA / e2e coverage yet.)*
- [ ] **FR-22** — Smoke-tested in Chrome and Firefox (per `feedback_firefox_flex_shrink`). *(Chrome verified via demo screenshots; Firefox pending.)*
- [x] **FR-25** — Visual **version themes** selectable via `[version]` on `bs-ribbon` / `mp-ribbon`. Four values: `"office-2007" | "office-2010" | "office-2013" | "office-2016"`. Default `"office-2016"`. *(Landed: `[version]` reflects to the `version` attribute on the `<mp-ribbon>` host; shadow-DOM `:host([version="..."])` rule groups in `mp-ribbon.element.ts` define a complete `--bs-ribbon-*` token set per version. **CSS custom properties inherit through light DOM into slotted children automatically**, so no attribute propagation is needed — `mp-ribbon-group` / `mp-ribbon-button` etc. just consume `var(--bs-ribbon-*)` and get the right value. This is the workspace's first per-component visual-variant system.)*
- [x] **FR-26** — Single `--bs-ribbon-app-accent` CSS custom property serves as the consumer hand-off point for picking an app signature colour (Word `#2B579A` / Excel `#217346` / PowerPoint `#B7472A` / Outlook `#0078D4` / OneNote `#7719AA` / Access `#A4373A`). It cascades into the active-tab label colour (2013) and the full tab strip (2016). Library does NOT ship per-app presets. *(Landed: Angular wrapper exposes `[appAccent]` input, set as inline `[style.--bs-ribbon-app-accent]` on the inner `mp-ribbon`. Fallback default for the per-version blocks is `#2B579A` (Word) for 2013/2016 — falls back to `var(--bs-primary, #0d6efd)` for the neutral baseline.)*
- [x] **FR-27** — Demo page exposes a version-picker dropdown in the controls bar, cycling through all four versions. Triggers re-render of the existing Home/Insert/Design/Layout content so visual differences are immediately observable. *(Landed: two `<select>` dropdowns in the controls bar — Version (4 options) + App accent (6 Microsoft canonical app colours). Bound via `signal<RibbonVersion>` and `signal<string>` on the demo component.)*
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

### Milestone 9: Visual version themes (FR-25/26/27) — *Mostly Landed*
- [x] Tokenisation pass — replaced hardcoded colour literals in `mp-ribbon` / `mp-ribbon-group` / `mp-ribbon-button` shadow styles with `var(--bs-ribbon-*, fallback)` references (closed FR-19 gap as a side effect)
- [x] `[version]` input + `[attr.version]` host binding on `BsRibbonComponent`; attribute reflection on `MpRibbon`
- [x] Per-version `:host([version="office-XXXX"])` rule groups in `mp-ribbon.element.ts` static styles, defining a complete `--bs-ribbon-*` token set per version
- [x] CSS-variable inheritance into slotted `mp-ribbon-group` / `mp-ribbon-button` — no attribute propagation needed because custom properties cross shadow boundaries via DOM inheritance
- [x] `--bs-ribbon-app-accent` cascading into active-tab label colour + tab strip; consumer hand-off via `[appAccent]` input
- [x] Demo version-picker dropdown + app-accent dropdown (6 Microsoft canonical colours)
- [ ] Visual-regression Playwright screenshot per version for the Insert tab (committed to repo + CI assertion)
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
- **Touch Mode** (an orthogonal Office 2013+ toggle that ~doubles button padding and tab height) is out of scope for FR-25; would be a separate `[touchMode]` input later.
- **Office 2007's Aero glass blur** behind the title is an OS-level effect, not a ribbon style; not reproducible cross-browser and explicitly omitted.
- The `office-2007` theme's `linear-gradient` tab strip will conflict with `--bs-ribbon-app-accent` if a consumer sets it — for 2007 the accent has no effect (no per-app colouring existed in that version). Document this.

**Out-of-scope variations** (filed for later issues if demand arises):
- Office 2007's Black / Silver colour schemes (only the Blue scheme is shipped under `office-2007`).
- Office 2016's Dark Gray / Black themes (the Colorful theme is shipped under `office-2016`).
- Office 2019 / Microsoft 365 "Coloured Header" / Backstage redesign.
- Standalone Touch Mode toggle.

---

## Related
- Issue #330
- Issue #327 (a11y baseline) — patterns and PRD followed for ARIA/keyboard.
- Reference components: `dock/`, `tile-manager/`, `tab-control/`, `multi-range/`.
- Future spin-offs: Backstage / File menu, Mini Toolbar, Tell-Me command palette.
- See `docs/prd/wc-aria-accessibility.md` for the workspace-wide ARIA conventions this PRD inherits.

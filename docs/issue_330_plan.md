# Development Plan: Issue #330

**Issue**: #330
**Title**: Ribbon
**Type**: Feature (new component)
**Priority**: Medium

## Executive Summary

Add a Microsoft Office–style Ribbon component to `libs/mintplayer-ng-bootstrap`. Replicates SyncFusion's Angular Ribbon API surface (tabs / groups / items / contextual tabs / QAT / KeyTips) while preferring Office-faithful behaviour where SyncFusion diverges from Microsoft's own guidance. Ships as Lit web components (`mp-ribbon-*`) with thin Angular wrappers (`bs-ribbon-*`); the WC layer is the source of truth so React/Vue wrappers can be built later without re-implementation.

Backstage / File menu is intentionally **not** part of this issue and will spin off as its own issue once the core ribbon is stable.

---

## Problem Statement

### Current Behavior
No ribbon component exists in the library. Consumers building Office-like productivity UIs have to compose `bs-navbar` + `bs-button-group` + `bs-dropdown` by hand, which does not give them tab strips, group labels, dialog launchers, sizing/overflow, contextual tabs, QAT, KeyTips, or coherent ribbon a11y.

### Expected Behavior
A new secondary entry point `@mintplayer/ng-bootstrap/ribbon` exporting `bs-ribbon` and the full set of child components and directives, backed by `mp-ribbon-*` web components. Authors declare ribbons as a tree of elements; sizing, overflow, keyboard, and ARIA are handled by the component.

### Impact
- Closes a major feature gap vs. SyncFusion / DevExtreme / Telerik for productivity-app authors.
- Adds the first complex *composition* primitive to the library (vs. dock/scheduler which own their internal rendering) — establishes precedent for future composite WCs.

---

## Technical Analysis

### New files (high level)

```
libs/mintplayer-ng-bootstrap/ribbon/
├── src/
│   ├── index.ts
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ribbon.component.ts
│   │   │   ├── ribbon-tab.component.ts
│   │   │   ├── ribbon-group.component.ts
│   │   │   ├── ribbon-collection.component.ts
│   │   │   ├── ribbon-button.component.ts
│   │   │   ├── ribbon-split-button.component.ts
│   │   │   ├── ribbon-dropdown-button.component.ts
│   │   │   ├── ribbon-toggle-button.component.ts
│   │   │   ├── ribbon-check-box.component.ts
│   │   │   ├── ribbon-combo-box.component.ts
│   │   │   ├── ribbon-color-picker.component.ts
│   │   │   ├── ribbon-group-button.component.ts        (Bold/Italic/Underline strip)
│   │   │   ├── ribbon-gallery.component.ts
│   │   │   ├── ribbon-gallery-item.component.ts
│   │   │   ├── ribbon-contextual-tab-set.component.ts
│   │   │   ├── ribbon-template-item.component.ts       (custom-slot wrapper)
│   │   │   ├── quick-access-toolbar.component.ts
│   │   │   └── quick-access-toolbar-item.component.ts
│   │   ├── directives/
│   │   │   └── ribbon-key-tip.directive.ts             (host-binds [data-key-tip])
│   │   ├── value-accessors/
│   │   │   ├── ribbon-combo-box.value-accessor.ts
│   │   │   ├── ribbon-color-picker.value-accessor.ts
│   │   │   ├── ribbon-toggle.value-accessor.ts
│   │   │   └── ribbon-check-box.value-accessor.ts
│   │   ├── types/
│   │   │   ├── ribbon-size.ts                          ('large'|'medium'|'small'|'popup')
│   │   │   ├── ribbon-layout.ts                        ('classic'|'simplified')
│   │   │   ├── reduce-order.ts
│   │   │   └── ribbon-events.ts
│   │   └── web-components/
│   │       ├── mp-ribbon.element.ts
│   │       ├── mp-ribbon.element.html
│   │       ├── mp-ribbon.element.scss
│   │       ├── mp-ribbon-tab.element.ts                (+ .html + .scss)
│   │       ├── mp-ribbon-group.element.ts              (+ .html + .scss)
│   │       ├── mp-ribbon-button.element.ts             (+ .html + .scss)
│   │       ├── mp-ribbon-split-button.element.ts       (+ .html + .scss)
│   │       ├── mp-ribbon-dropdown-button.element.ts    (+ .html + .scss)
│   │       ├── mp-ribbon-toggle-button.element.ts      (+ .html + .scss)
│   │       ├── mp-ribbon-check-box.element.ts          (+ .html + .scss)
│   │       ├── mp-ribbon-combo-box.element.ts          (+ .html + .scss)
│   │       ├── mp-ribbon-color-picker.element.ts       (+ .html + .scss)
│   │       ├── mp-ribbon-group-button.element.ts       (+ .html + .scss)
│   │       ├── mp-ribbon-gallery.element.ts            (+ .html + .scss)
│   │       ├── mp-ribbon-contextual-tab-set.element.ts (+ .html + .scss)
│   │       ├── mp-quick-access-toolbar.element.ts      (+ .html + .scss)
│   │       ├── controllers/
│   │       │   ├── reduce-order.controller.ts          (ResizeObserver-driven sizing)
│   │       │   ├── key-tips.controller.ts              (Alt-overlay, drill-down, collision resolution)
│   │       │   └── overflow.controller.ts
│   │       └── shared/
│   │           ├── size-policy.ts
│   │           └── ribbon-icon-styles.ts
│   └── test-setup.ts
├── ng-package.json
├── project.json (or inherits via libs/mintplayer-ng-bootstrap/project.json)
├── tsconfig.lib.json
├── tsconfig.spec.json
└── vitest.config.ts
```

Plus generated (codegen-wc):
- `mp-ribbon.element.template.ts`, `mp-ribbon-*.element.template.ts` per WC.
- `mp-ribbon.styles.ts` etc.

### Files to modify

- `libs/mintplayer-ng-bootstrap/src/index.ts` — re-export the ribbon entry point once stable.
- `tsconfig.base.json` — add path alias `@mintplayer/ng-bootstrap/ribbon`.
- `libs/mintplayer-ng-bootstrap/project.json` — codegen-wc target already globs `**/*.element.html` so no edit needed; verify after first build.
- `libs/mintplayer-ng-bootstrap/ng-package.json` (umbrella) — add ribbon secondary entry point.
- `apps/ng-bootstrap-demo/src/app/pages/advanced/advanced.routes.ts` — register `/ribbon` route.
- `apps/ng-bootstrap-demo/src/app/pages/advanced/ribbon/` — new demo files.
- Demo sidebar / nav for advanced category — add Ribbon link.

### Dependencies

- Lit 3 (already in monorepo).
- `BsRovingFocusDirective`, `LiveAnnouncerController`, `BsIdService`, `BsOverlayStackService` — reuse from `libs/mintplayer-ng-bootstrap/a11y/`.
- Codegen tool `tools/scripts/build-web-components.mjs` — picks up new `.element.html` / `.element.scss` files automatically.
- No new npm dependencies.

### Architecture considerations

- **DOM is the source of truth.** A ribbon is the tree of elements the author wrote. The `mp-ribbon` element observes slot mutations and reflows. No `[tabs]="..."` config-input mode.
- **WC primitives own behaviour, wrappers own Angular integration.** All keyboard handling, ARIA wiring, reduceOrder execution, KeyTips, and announcer plumbing lives in Lit. Angular wrappers exist for: signal-input ergonomics, output event aliases, `ControlValueAccessor` integration on value-bearing items.
- **Light-DOM composition for items.** `mp-ribbon-tab` etc. project their children via named slots (`slot="groups"`, `slot="qat"`, `slot="contextual"`). Avoids shadow-DOM-traversal headaches and keeps inspectability/themeability simple.
- **Size variants via CSS variables + utility classes**, not via per-item attributes that fight CSS. `mp-ribbon-button` reflects `data-size="large|medium|small"`; styles in `mp-ribbon-button.element.scss` switch icon size, layout direction, label visibility.
- **ARIA model** (per `project_wc_aria_decisions`):
  - `mp-ribbon` → `role="region"` `aria-label="Ribbon"`.
  - Tab strip → `role="tablist"`; tabs → `role="tab"` with `aria-selected`, `aria-controls`; tabpanel → `role="tabpanel"` with `aria-labelledby`.
  - Each group body → `role="toolbar"` with `aria-label` from group header.
  - Group header → not focusable; `aria-hidden="true"` (label is on the toolbar).
  - Dialog launcher → focusable button, last in toolbar tab order, `aria-label="<group> dialog options"`.
  - Collapsed overflow → button with `aria-haspopup="menu"`, `aria-expanded`.
  - Contextual tab set → wrapping `role="group"` with `aria-label="<tab-set-name>, contextual"`; `LiveAnnouncerController.announce()` on show.
  - QAT → separate `role="toolbar"` `aria-label="Quick Access Toolbar"` outside the ribbon's region.
  - Minimize state changes announced (`"Ribbon minimized"` / `"Ribbon restored"`).
- **KeyTips** controller responsibilities: collect `data-key-tip` from rendered items; on Alt-down show overlay badges; on letter press, advance state machine; on second-level letter, focus or activate target; Esc unwinds. Collisions: explicit author tip wins, library auto-generates fallback tips from first letter of label, deduping by suffix.

---

## Implementation Plan

### Phase 1 — Skeleton & sizing engine

1. Create `libs/mintplayer-ng-bootstrap/ribbon/` skeleton with `ng-package.json`, `tsconfig.lib.json`, `index.ts`.
2. Add path alias in `tsconfig.base.json`.
3. Implement `mp-ribbon` (Lit) + `mp-ribbon-tab` + `mp-ribbon-group` + `mp-ribbon-button` only.
4. Implement `ReduceOrderController` using `ResizeObserver`. Default reduceOrder if author omits: collapse rightmost group first to Popup, then next, then next.
5. Stub Classic layout only.
6. Build `BsRibbonComponent` Angular wrapper + matching child wrappers; signal inputs.
7. Vitest specs for: reduceOrder list execution, default fallback, popup activation.

### Phase 2 — Remaining item kinds (Classic layout)

1. Implement `mp-ribbon-split-button`, `mp-ribbon-dropdown-button`, `mp-ribbon-toggle-button`, `mp-ribbon-check-box`, `mp-ribbon-combo-box`, `mp-ribbon-color-picker`, `mp-ribbon-group-button`, `mp-ribbon-gallery`, `mp-ribbon-gallery-item`, `mp-ribbon-template-item`.
2. Angular wrappers for each.
3. `ControlValueAccessor` wrappers for value-bearing items.
4. Per-item vitest specs covering activation, disabled state, slot composition, size variants.

### Phase 3 — Accessibility & keyboard

1. Wire all ARIA roles + attributes per Architecture above.
2. Keyboard model:
   - Tab strip: Arrow keys + Home/End cycle tabs (manual activation; Enter/Space selects).
   - Inside tabpanel: `BsRovingFocusDirective` equivalent; Tab/Shift+Tab between items; Ctrl+←/→ jumps group-to-group; Down arrow opens dropdown popups; Space/Enter activates.
   - Ctrl+F1 toggles `minimized`. Double-click tab toggles. Esc closes popups / unwinds KeyTips.
3. `LiveAnnouncerController` integration:
   - Announce minimize/restore.
   - Announce contextual-tab-set show/hide ("Picture Tools, contextual, now available").
   - Announce overflow collapse threshold crosses.
4. `prefers-reduced-motion` honored for popup open/close transitions.
5. ARIA spec file `mp-ribbon.aria.spec.ts` covering all roles and tab/toolbar invariants.

### Phase 4 — KeyTips

1. `KeyTipsController` (Lit reactive controller on `mp-ribbon`).
2. Alt activates overlay (only when ribbon root contains focus or document.activeElement is body).
3. Letter resolution: explicit `data-key-tip` first, generated fallback (first letter of label, deduped).
4. Two-level drill-down: pressing tab letter switches to that tab and rebuilds overlay for its toolbar items.
5. Esc / Alt closes overlay; first-level Esc returns to tab strip, second closes entirely.
6. Skip on screen-reader users (detect via `aria-disabled` toggle? — investigate; fall back to documenting that screen-reader-mode-aware ribbons should disable KeyTips via attribute).
7. vitest + Playwright specs.

### Phase 5 — Simplified layout

1. Add `[layout="simplified"]` mode on `mp-ribbon`.
2. Single-row condensed icons; hide group headers; thin separators.
3. Overflow becomes a three-dot chevron at right edge of tab body — all-items overflow popup (Office behaviour in Simplified differs from Classic).
4. Vitest specs for both layouts; visual regression via Playwright screenshot diff in demo.

### Phase 6 — Contextual tab sets & QAT

1. `mp-ribbon-contextual-tab-set` element wrapping `<mp-ribbon-tab slot="contextual">` children.
2. Coloured header band; CSS custom property `--bs-ribbon-contextual-color` set per tab set.
3. `[hidden]` toggles visibility; live-announcer fires on transitions.
4. `mp-quick-access-toolbar` element (separate, composed by consumer outside `mp-ribbon`); list of `mp-ribbon-button` clones via `data-pinned` attribute or explicit children.
5. Specs.

### Phase 7 — Demo page

1. `apps/ng-bootstrap-demo/src/app/pages/advanced/ribbon/ribbon.component.{ts,html,scss}`.
2. Demo includes: full Home tab with Clipboard/Font/Paragraph/Styles groups; Insert tab; Picture Tools contextual tab; QAT above; layout toggle; minimize toggle; KeyTips visible legend.
3. Code-block snippets.
4. Route registration in `advanced.routes.ts`.
5. Sidebar entry.

### Phase 8 — Build / lint / release plumbing

1. Verify codegen-wc target picks up new `.element.html` / `.element.scss` files.
2. Add secondary entry point to umbrella `ng-package.json`.
3. README snippet (only if user explicitly requests; otherwise skip per "Default to no comments / docs" rule).
4. Final `npm test`, `npm run build`, `npm start` smoke test in browser including Firefox (per `feedback_firefox_flex_shrink` memory).

---

## Test Scenarios

### Scenario 1: Default reduceOrder collapses rightmost group first
- **Given**: a ribbon with Tab "Home" containing groups [Clipboard, Font, Paragraph, Styles] and no explicit `reduceOrder`.
- **When**: container width is reduced from 1200 to 800 px.
- **Then**: Styles collapses to Popup first, then Paragraph, then Font; Clipboard never collapses while space remains.

### Scenario 2: Author-declared reduceOrder is respected
- **Given**: same ribbon with `[reduceOrder]="[['Styles','medium'],['Paragraph','medium'],['Styles','small'],['Styles','popup'],['Paragraph','popup'],['Font','popup'],['Clipboard','popup']]"`.
- **When**: width shrinks.
- **Then**: steps execute in declared order until the tab body fits.

### Scenario 3: Tab strip keyboard navigation
- **Given**: ribbon with focus on the first tab.
- **When**: user presses Right arrow three times then Enter.
- **Then**: focus moves Home → Insert → Layout → Review; on Enter, Review becomes selected and its tabpanel is shown.

### Scenario 4: Group toolbar roving tabindex
- **Given**: focus enters the Font group's toolbar.
- **When**: user presses Tab and Shift+Tab.
- **Then**: focus walks items left to right within the group; after the last item Tab moves to the first item of the next group.

### Scenario 5: KeyTips drill-down
- **Given**: ribbon focused; no popup open.
- **When**: user presses Alt, then "H".
- **Then**: KeyTips overlay shows; after H, Home tab becomes active and overlay refreshes to show item-level tips; pressing "B" activates the Bold button.

### Scenario 6: Contextual tab set show / hide
- **Given**: `mp-ribbon-contextual-tab-set [hidden]="!imageSelected"` containing "Picture Tools" tabs.
- **When**: `imageSelected` flips true.
- **Then**: the contextual tab set is announced via live region; tabs render with coloured header; selecting one shows its toolbar.

### Scenario 7: Minimize / restore
- **Given**: ribbon expanded.
- **When**: user presses Ctrl+F1 (or double-clicks a tab).
- **Then**: tabpanels hide; tab strip remains; `aria-expanded` on the strip flips to false; live announcer says "Ribbon minimized".

### Scenario 8: Layout switch retains state
- **Given**: ribbon with Insert tab selected and one item in QAT.
- **When**: `[layout]` flips from "classic" to "simplified".
- **Then**: same tab remains selected; QAT items persist; visual layout updates; ARIA structure unchanged.

### Scenario 9: ControlValueAccessor on combo box
- **Given**: `<bs-ribbon-combo-box [formControl]="fontFamily">` inside a reactive form.
- **When**: user selects a value.
- **Then**: `fontFamily.value` updates; `fontFamily.markAsDirty()` fires; `valueChanges` emits.

### Scenario 10: Reduced motion
- **Given**: `prefers-reduced-motion: reduce` user setting.
- **When**: a popup opens / closes.
- **Then**: no transition; immediate visibility flip.

---

## Acceptance Criteria

- [ ] `@mintplayer/ng-bootstrap/ribbon` entry point builds via `npm run build` with no warnings.
- [ ] All nine item kinds render in both Classic and Simplified layouts.
- [ ] `reduceOrder` algorithm (author-declared and default) produces deterministic, debuggable collapse sequences on resize.
- [ ] Tab strip ARIA matches `tablist`/`tab`/`tabpanel`; group bodies are `role="toolbar"`; QAT is a separate toolbar.
- [ ] Keyboard model implements: arrow nav in tab strip, roving focus in toolbars, Ctrl+←/→ group jump, Down for dropdowns, Space/Enter activation, Ctrl+F1 minimize, Esc unwind.
- [ ] KeyTips: Alt activates overlay; drill-down works two levels; collisions are resolved deterministically.
- [ ] Contextual tab sets render with coloured band and are announced via live region on show.
- [ ] `LiveAnnouncerController` integration covers minimize/restore + contextual show/hide + overflow threshold cross.
- [ ] `prefers-reduced-motion` honored on all transitions.
- [ ] Value-bearing item wrappers implement `ControlValueAccessor` and pass form-integration vitest specs.
- [ ] Demo page covers: full Home tab, Insert tab, Picture Tools contextual tab, QAT, layout toggle, minimize toggle, KeyTips legend.
- [ ] Smoke-tested in Chrome **and Firefox** (per `feedback_firefox_flex_shrink`).
- [ ] No accessibility regressions in existing axe-core CI (when wired per `project_aria_outstanding_followups`).

---

## Build & Test Commands

```bash
# Codegen + build the new entry point (cached via Nx)
npx nx build mintplayer-ng-bootstrap

# Unit tests for the ribbon
npx nx test mintplayer-ng-bootstrap --testPathPattern=ribbon

# Lint
npx nx lint mintplayer-ng-bootstrap

# Serve demo
npm start
# then open http://localhost:4200/advanced/ribbon

# Full repo build + tests
npm run build
npm test
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/dock/` — closest architectural precedent (Lit WC + Angular wrapper + slotted children + a11y).
- `libs/mintplayer-ng-bootstrap/tile-manager/` — best a11y precedent (full ARIA + keyboard alternative for drag).
- `libs/mintplayer-ng-bootstrap/tab-control/` — tab strip + roving focus pattern to reuse.
- `libs/mintplayer-ng-bootstrap/button-group/` — visual reference for item groupings.
- `libs/mintplayer-ng-bootstrap/dropdown/` — popup/positioning pattern; KeyTips overlay can borrow positioning logic.
- `libs/mintplayer-ng-bootstrap/a11y/` — `BsRovingFocusDirective`, `LiveAnnouncerController`, `BsIdService`, `BsOverlayStackService`.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler-core/` — example of shared types/util packaging for a WC.
- `tools/scripts/build-web-components.mjs` — codegen entry point.
- `docs/prd/wc-aria-accessibility.md` — referenced for ARIA decisions.

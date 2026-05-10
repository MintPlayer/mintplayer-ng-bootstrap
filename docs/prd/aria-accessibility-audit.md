# PRD: Library-wide ARIA & accessibility audit

**Status:** **Implemented** — every Critical + Major item closed on `feat/aria-accessibility`. The drag-keyboard family (scheduler / dock / tile-manager) was split into a companion PRD ([`wc-aria-accessibility.md`](./wc-aria-accessibility.md)) and shipped, then extended by [`scheduler-keyboard-grid-nav.md`](./scheduler-keyboard-grid-nav.md). See §11 + §14 for the fully-tracked closing log.
**Author:** Pieterjan (audit by 5-agent ARIA team)
**Date:** 2026-05-09 (status last updated 2026-05-10)
**Library:** `@mintplayer/ng-bootstrap` (all entry points)
**Standards target:** [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) + [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/), conformance to **WCAG 2.2 AA**.
**Companion PRDs:**
- [`wc-aria-accessibility.md`](./wc-aria-accessibility.md) — splitter / dock / scheduler / tile-manager / calendar Lit-WC layer (resolves the §10 deferred drag-keyboard family).
- [`scheduler-keyboard-grid-nav.md`](./scheduler-keyboard-grid-nav.md) — extends the scheduler keyboard model with cell nav, range selection, Enter-driven move-mode, cross-day resize.

---

## 1. Motivation

`@mintplayer/ng-bootstrap` ships ~70 Angular components plus a growing set of Lit web components (dock, scheduler, tile-manager, multi-range). Accessibility has been added ad-hoc — some components are well-tagged (accordion, close, spinner, toast's live region), others are entirely opaque to assistive tech (signature-pad canvas, custom comboboxes, color-picker wheel, drag-and-drop layouts).

A library-wide audit was run across every DOM-rendering component and directive. This PRD captures the findings, classifies them by severity, and proposes a per-component remediation plan. The intent is **not** a single mega-PR — it is a tracking document so each component's a11y debt can be paid down in its own PR with a stable target pattern from the WAI-ARIA APG.

A library that's sold as a Bootstrap-replacement-with-Angular-ergonomics needs to clear the bar Bootstrap clears. Right now we don't.

## 2. Goals / non-goals

**Goals**

- **G1. Screen reader compatibility.** A user with NVDA (Firefox/Chrome on Windows), JAWS (Chrome), VoiceOver (Safari/macOS, iOS), or TalkBack (Android) can perceive, navigate, and operate every interactive component using the keyboard or assistive-tech gestures alone. This is the headline goal — every other goal exists to support it.
- **G2.** Every interactive component matches a named WAI-ARIA APG pattern (combobox, dialog, slider, tabs, tree, etc.) and implements that pattern's **required** attributes verbatim. Recommended attributes are added where they meaningfully improve the SR experience.
- **G3.** Every modal-class overlay (`modal`, `offcanvas`, `popover`, `context-menu`, datepicker dialog) has a working focus trap, return-focus on close, Escape-to-dismiss, and applies `inert`/`aria-hidden` to background content.
- **G4.** Every custom interactive control (slider, combobox, menu, tablist, treeview, radiogroup) has full keyboard parity with its APG pattern — arrow keys, Home/End, typeahead where specified.
- **G5.** Every dynamic state change a sighted user can see (selection, expansion, busy, sorted, current page, copied) is exposed to assistive tech via a matching `aria-*` attribute or live-region announcement.
- **G6.** Decorative animation (carousel auto-advance, marquee, parallax, dock/tile-manager reflow) honours `prefers-reduced-motion: reduce`.
- **G7. Tested at two levels.** Unit-level vitest specs assert the *exact* expected ARIA attribute set per component (positive presence, not just "no axe violations"). E2e Playwright specs run `@axe-core/playwright` on every demo page and fail on `critical`/`serious` violations. Both block CI on regressions.

**Non-goals**

- **WCAG AAA** conformance. AA is the bar; AAA is per-feature on request.
- **Screen-reader-specific shims.** We target the spec; we don't paper over individual SR/browser bugs unless they cause total breakage.
- **Translation of `aria-label` defaults.** Strings like `"Close"`, `"Toggle navigation"` stay English in this PRD; i18n is its own track.
- **Replacement of working native HTML controls with custom ARIA widgets.** Where a native `<select>`, `<input type="range">`, `<button>`, or `<details>` does the job, we keep the native element instead of rebuilding it as a `role="listbox"` / `role="slider"` widget. **However**, the Angular components that wrap those natives — `bs-select`, `bs-range`, `bs-toggle-button`, etc. — still need full ARIA wiring: accessible names (from `<label>`, `aria-label`, `aria-labelledby`, or floating-label association), `aria-describedby` to help/error text, and mirrored `aria-invalid` / `aria-required` / `aria-disabled` / `aria-busy` from bound state. That wiring is **in scope** and called out per-component in §5 (e.g. `range` lacks `aria-label`, `select` ships a placeholder label, `toggle-button` has no fallback name when used standalone).

## 3. Scope

**In scope — `@mintplayer/ng-bootstrap`:** every directory under `libs/mintplayer-ng-bootstrap/` that emits DOM (component, directive, or Lit web component). Pure-logic directives (`navigation-lock`, `viewport`, `no-noscript`, `button-type`) are confirmed N/A and listed for completeness.

**In scope — `@mintplayer/ng-qr-code`:** the `<qr-code>` component renders a `<canvas>` with **no `role`, no `aria-label`, no fallback text** (`libs/mintplayer-ng-qr-code/src/lib/components/qr-code/qr-code.component.html`). Same gap class as `signature-pad`. The fix is a one-liner — `role="img"` + a derived `aria-label` like *"QR code for {value}"* (or an `[ariaLabel]` input override). **Critical** severity.

**In scope — `@mintplayer/ng-swiper`:** swipe directives (`swipe`, `swipe-container`, `swipe-viewport`) are pointer/touch-only. Per APG drag-and-drop guidance, anything driven by drag must have a keyboard alternative. This shares the same hard problem as `dock`, `scheduler`, and `tile-manager` (covered in §10 open questions) and should be solved together. Severity **Major** — the directives compose into UI components that may already work via underlying focus order.

**Out of scope:** pure-logic libraries (`mintplayer-dijkstra`, `mintplayer-encode-utf8`, `mintplayer-pagination`, `mintplayer-qr-code` — generator only), animation factories (`mintplayer-ng-animations`), and a11y-irrelevant directives (`mintplayer-ng-click-outside`, `mintplayer-ng-focus-on-load`). The snippet library `mintplayer-ng-bootstrap-snippets` is also out of scope — fixes to the source components automatically propagate to its rendered output.

## 4. Methodology

5 parallel research agents each took a thematic chunk (form controls A, selectors+date/time, overlays, navigation, data display + layout) and reported, per component:

- Render path (template, host bindings, Lit element if any) with file:line refs
- Current `role` / `aria-*` / `tabindex` state — static and dynamic
- Matching APG pattern + required and recommended attributes
- Gaps, classified as **Critical** / **Major** / **Minor**
- Keyboard support state

Findings were consolidated into the gap matrix in §5.

## 5. Findings

### 5.1 Critical — control is not operable or not perceivable to assistive tech

| Component | File ref | Issue |
|---|---|---|
| `signature-pad` | `signature-pad.component.html:1` | Canvas has no `role`, no `aria-label`, no keyboard support — completely invisible/unusable to SR + keyboard users. |
| `searchbox`, `multiselect`, `select2`, `typeahead` (all four share the same dropdown plumbing) | `bsDropdown` directive set, `select2.component.html:2,16,18`, `typeahead.component.html:9-27` | All four are combobox patterns built on `[bsDropdown]` + `bsDropdownToggle` + `<bs-dropdown-menu>` + `<bs-dropdown-item>`. The dropdown directives today emit only `aria-haspopup="true"` and `aria-expanded` on the toggle — and `"true"` should be `"menu"` or `"listbox"` (`dropdown-toggle.directive.ts:7`). The menu and item templates emit no role. `select2` and `typeahead` *manually* re-add `role="combobox"`/`"listbox"`/`"option"` on each instance; `searchbox` and `multiselect` don't, so they get nothing. **The fix is to teach the dropdown directives a `role: 'menu' \| 'listbox'` mode** (default `'menu'`); that lifts the role assignment, `aria-haspopup` value, and `aria-selected` mirroring (already wired via `[isSelected]`) into the shared primitive. Combobox-specific wiring on the **input** element — `role="combobox"`, `aria-controls` to the menu ID, `aria-activedescendant` of the highlighted option — stays in a small `bsCombobox` directive that pairs an input with a dropdown menu. |
| `calendar` | `calendar.component.html:1`–`43` | Day grid is a bare `<table>` with no `role="grid"`/`role="presentation"`, day cells lack `role="gridcell"`, no `aria-selected` on selected date, no `aria-current="date"` on today, no arrow-key navigation. |
| `timepicker` | `timepicker.component.html:1`–`27` | Hour/minute inputs have no `role="spinbutton"`, no `aria-valuenow/min/max`, no `aria-label`. Preset items have no `aria-selected`. |
| `color-picker` (wheel + sliders) | `color-wheel.component.ts:16`, `slider.component.ts:14` | Wheel and brightness/alpha sliders have no `role`, no `aria-label`, no `aria-valuenow/min/max`, no keyboard support — pointer-only. |
| `modal` | `modal.component.ts:14`, `modal-host.component.ts:25` | Has `role="dialog"` + `aria-modal="true"` but no `aria-labelledby`, no focus trap, no return-focus on close. |
| `offcanvas` | `offcanvas.component.ts:15` | Same pattern, same gaps as modal. |
| `popover` | `popover.component.ts:19` | Click-triggered disclosure tagged `role="tooltip"`. Wrong pattern; should be `role="dialog"` (or `role="menu"` if menu-like). No `aria-labelledby`. |
| `tooltip` | `tooltip.component.ts:19`, `tooltip.directive.ts:14` | Trigger element has no `aria-describedby` linking to tooltip — tooltip exists but is not associated with anything for SR. |
| `dropdown-toggle` + `dropdown-menu` + `dropdown-item` | `dropdown-toggle.directive.ts:7`–`8`, `dropdown-menu.component.html:1`, `dropdown-item.component.html:1` | Same primitive as the combobox row above. In `'menu'` mode (default), toggle should emit `aria-haspopup="menu"`, menu `<ul>` should be `role="menu"`, items `<li>` should be `role="menuitem"`. Today none of those are emitted. Roving tabindex / ArrowUp/Down navigation is also missing — that's a separate concern handled by the `BsRovingFocus` primitive in §8 Phase A. |
| `context-menu` | `context-menu.directive.ts:12` | Overlay has no `role="menu"`, items no `role="menuitem"`, no Escape, no keyboard nav. |
| `navbar` | `navbar.component.html:16` | Toggler `aria-controls="navbar-collapse"` references an ID that doesn't exist in the rendered DOM. |
| `navbar-toggler` | `navbar-toggler.component.html:1` | Renders as `<div><div><div></div></div></div>` — not a `<button>`, no role, no `aria-label`/`aria-expanded`/`aria-controls`, no keyboard handler. |
| `playlist-toggler` | `playlist-toggler.component.html` | `<div>` with click handler, no `role="button"`, no `aria-label`, no `aria-pressed`/`aria-expanded`, no keyboard support. |
| `table` | `table.component.html` | `role="grid"` slapped on a native `<table>`. Browsers may discard native table semantics in favour of grid. Either drop `role="grid"` or commit to a real grid (cell focus, arrow-key nav). |
| `virtual-datatable` | `virtual-datatable.component.html` | CDK virtual scroll — viewport rows visible to SR, but no `aria-rowcount`/`aria-colcount`/`aria-rowindex` so total dataset and current position are unannounceable. |
| `progress-bar` (indeterminate) | `progress.component.html:3` | Sets `aria-valuenow="infinite"` — not a number, invalid per spec. Indeterminate progress should *omit* `aria-valuenow`. |
| `resizable` | `resizable.component.ts` | Resize glyphs are unsemantic `<div>`s. Should be `role="separator"` with `aria-valuenow`/min/max + arrow-key resize per APG Window Splitter. |
| `scheduler` | `scheduler/*` | Drag-driven calendar UI — no roles, no keyboard alternative, no live announcements. Pointer-only. |
| `rating` | `rating.component.ts:1`–`48` | `radiogroup` + `radio` semantics correct, but **no arrow-key navigation** — APG radiogroup requires Left/Right (or Up/Down) to move focus. Currently mouse only. |
| `qr-code` (sibling lib) | `mintplayer-ng-qr-code/src/lib/components/qr-code/qr-code.component.html` | `<canvas>` has no `role`, no `aria-label`, no fallback text. SR users perceive an empty box. Should be `role="img"` + `aria-label` derived from `value()`. |

### 5.2 Major — control works but state is unreadable, or pattern is incomplete

| Component | Issue |
|---|---|
| `range` | Native `<input type="range">` with no `aria-label`. |
| `multi-range` | Group `aria-label` is optional; if unset, the `role="group"` has no name. Individual thumbs share the group label — no per-thumb `aria-label` (e.g. "Minimum", "Maximum"). |
| `file-upload` | Dropzone `<div>` has no role to signal it's a drop target. No live announcement of upload progress / completion. Per-file progress bar isn't labelled to its file. |
| `datepicker` | Trigger button has no `aria-haspopup="dialog"`, no `aria-expanded`. Also inherits all `calendar` gaps. |
| `toast` | `aria-live="assertive"` + `aria-atomic="true"` are present, but no `role="status"` / `role="alert"` — explicit role is more reliably picked up than `aria-live` on a bare `<div>`. |
| `has-overlay` | Empty template; doesn't apply `aria-hidden="true"` or `inert` to background content when an overlay is open, so SR users still hear behind-the-modal content. |
| `breadcrumb` | Has `<nav aria-label>`, but no `aria-current="page"` on the active crumb. The `<li>` template is commented out — items render directly into `<ol>`. |
| `pagination` | Not wrapped in `<nav aria-label>`. Active page lacks `aria-current="page"` (only `.active` class). |
| `tab-control` | Has `role="tablist"`/`tab`/`tabpanel`/`aria-selected`/`aria-controls`/`aria-labelledby` — correct ARIA. **Missing roving `tabindex`** (all tabs are `tabindex="0"`) and **no ArrowLeft/Right** keyboard navigation. |
| `treeview` | Has `role="tree"`/`treeitem`/`aria-expanded` + roving `tabindex`. **Missing `aria-level`, `aria-setsize`, `aria-posinset`** — SR users can't perceive tree depth or position. No ArrowRight/Left expand-collapse, no Home/End. |
| `scrollspy` | Spans-with-click-handlers, not buttons or links. Not in tab order. No `aria-current="location"` on active section link. Not wrapped in `<nav>`. |
| `list-group-item` | Template has commented-out `<li>` — items render without the list-item wrapper, so the parent `<ul>` advertises a list with zero items. |
| `priority-nav` | Server-side fallback uses a `<label role="button">` instead of a real `<button>`. Container has no `<nav>` landmark. |
| `carousel` | Slide indicators have `aria-current` + `aria-label`, prev/next have `aria-label`. Missing `role="region"` + `aria-roledescription="carousel"` on the container, `aria-roledescription="slide"` + `aria-label="N of M"` on slides, and no play/pause control for auto-advance. |
| `button-group` | Hardcoded `aria-label="Basic example"` placeholder shipped to consumers. |
| `datatable` | Sortable `<th>` headers have a `.sort` class but no `aria-sort="ascending"/"descending"/"none"`. |
| `code-snippet` | Copy button has visible text but no `aria-label` for icon-only mode, and the "Copied" feedback is not in a live region — SR users get no confirmation. |
| `dock` | Drop joysticks have `aria-label`s, but draggable panes have none, and there's no keyboard alternative to pointer drag. |
| `tile-manager` | Has a polite live region (good), but the grid container has no `role="region"` / `aria-label`. Tiles lack `aria-describedby` for move/resize instructions. |
| `placeholder` | Skeleton glow with no `aria-busy` on the wrapper and no `role="status"` for "loading" announcements. Skeleton itself isn't `aria-hidden` from SR. |
| `marquee` | Scrolling content with no `aria-label`; no `prefers-reduced-motion` handling — content scrolls regardless. |
| `select` | Hardcoded `aria-label="Default select example"` placeholder shipped to consumers. Should be empty by default and configurable. |

### 5.3 Minor — labels could be richer, edge cases

- `tooltip` — APG 1.2 says tooltips should dismiss on Escape without closing the underlying control. Not implemented.
- `dropdown-divider` — no `role="separator"`. Bootstrap's CSS-only divider is fine for sighted users; SR users get no rest point.
- `accordion` — APG-correct for required attributes; Home/End and ArrowUp/Down between headers are recommended-but-optional and unimplemented.
- `select2` — `aria-selected="…|| null"` should be `"true"`/`"false"` strings, not `null`.
- `parallax`, `marquee`, `carousel` — no `prefers-reduced-motion: reduce` shortcut.
- `badge` — fine if decorative; if used for unread counts, needs `aria-label` ("3 unread"). No guidance is enforced today.
- `toggle-button` — depends on parent `<label>` for its accessible name; standalone usage has no fallback.

### 5.4 Already correct

`accordion`, `alert`, `close`, `spinner`, `form`, `input-group`, `floating-labels`, `card`, `container`, `grid`, `shell`, `viewport`, `sticky-footer`, `button-type`, `navigation-lock`, `no-noscript`, `calendar-month` (service), `font-color` (pipe).

## 6. Cross-cutting concerns

These show up in multiple components and want one shared solution rather than N point fixes.

### 6.1 Focus trap + return-focus for modal-class overlays

`modal`, `offcanvas`, `popover` (when click-triggered), `context-menu`, and the calendar dialog inside `datepicker` all need:

- Focus trap while open (Tab cycles inside the overlay).
- Initial focus to a specified target or first tabbable element.
- Return focus to the trigger on close.
- Escape-to-close (where appropriate).
- `aria-hidden="true"` or `inert` on background content while open.

Today **none** of them do all four. Build this once in a shared `BsOverlayFocusManager` (or extend `has-overlay`, which already exists and is conspicuously empty) and adopt it from every overlay component.

### 6.2 ARIA-aware dropdown directives + thin combobox

The library already has a unified dropdown primitive (`[bsDropdown]` + `bsDropdownToggle` + `<bs-dropdown-menu>` + `<bs-dropdown-item>`). It's used by **plain dropdown menus, context menus, searchbox, multiselect, select2, typeahead, and priority-nav's overflow** — every menu and combobox in the library. The cleanest way to fix all of them is to teach the existing primitive about ARIA modes, not to introduce a parallel combobox directive set.

Concretely:

- Add a `role: 'menu' | 'listbox'` input on `[bsDropdown]` (default `'menu'`).
- `bsDropdownToggle` emits `aria-haspopup="menu" | "listbox"` based on the mode (replaces today's hardcoded `"true"`).
- `<bs-dropdown-menu>` template binds `[attr.role]` to `'menu' | 'listbox'`.
- `<bs-dropdown-item>` template binds `[attr.role]` to `'menuitem' | 'option'`, and in listbox mode mirrors the existing `[isSelected]` input to `aria-selected`.
- The dropdown directive auto-generates IDs for the menu and items (so `aria-controls` / `aria-activedescendant` consumers have stable targets to point at).

That covers ~70% of the searchbox/multiselect/select2/typeahead fix and 100% of the dropdown/context-menu fix in one change.

The remaining ~30% — **combobox-specific wiring on the `<input>` element** — lives in a thin `bsCombobox` directive applied to the input. It's a separate directive because the input isn't part of the dropdown directive set: it sits next to the toggle, not on it. `bsCombobox` is responsible for:

- `role="combobox"`, `aria-autocomplete="list"`, `aria-haspopup="listbox"` on the input.
- `aria-controls` pointing at the dropdown's auto-generated menu ID.
- `aria-activedescendant` updated as the user arrows through options (interop with the `BsRovingFocus`/active-descendant primitive in §6.3).
- Forwarding `aria-expanded` from the dropdown's `isOpen` state.

Consumers (`searchbox`, `multiselect`, `select2`, `typeahead`) drop their hand-rolled `role="combobox"` / `role="listbox"` / `role="option"` template attributes once they set `[role]="'listbox'"` on `[bsDropdown]` and add `bsCombobox` to their input.

### 6.3 Keyboard navigation for menu / tab / tree patterns

`dropdown-menu`, `context-menu`, `tab-control`, `treeview`, `priority-nav`'s overflow menu, and `rating`'s radiogroup all want some form of arrow-key roving focus. APG specifies the exact key set per pattern. A single `bsRovingFocus` directive (similar to CDK's `FocusKeyManager` but without dragging in CDK) covers all of them.

### 6.4 Live regions for dynamic feedback

Single source of truth for "tell SR the thing happened":
- `code-snippet` "Copied!"
- `file-upload` "File added / uploaded / removed"
- `placeholder` "Loading…"
- `searchbox` / `typeahead` "5 results"
- `tile-manager` "Tile moved to row 3, column 2"

A `BsLiveAnnouncer` service (or just adopt CDK's `LiveAnnouncer`) fixes all of these consistently.

### 6.5 Reduced-motion respect

`carousel` auto-advance, `marquee`, `parallax`, `tile-manager` reflow animation, `dock` panel transitions, accordion open animation. Add a `prefers-reduced-motion: reduce` media query branch to each, or wire it once via a shared `BsReducedMotionService`.

### 6.6 ID generation for ARIA relationships

ARIA relationship attributes (`aria-controls`, `aria-labelledby`, `aria-describedby`, `aria-activedescendant`) require the target element to have an `id`. Many components need to generate IDs at runtime: dropdown menu ↔ toggle, modal ↔ title, accordion header ↔ panel, tab ↔ tabpanel, calendar grid ↔ caption, combobox input ↔ listbox option.

Approach: a small `BsIdService` in `@mintplayer/ng-bootstrap/a11y`:

```ts
@Injectable({ providedIn: 'root' })
export class BsIdService {
  private counter = 0;
  next(prefix: string): string { return `${prefix}-${++this.counter}`; }
}
```

Why a service rather than a module-level `let counter = 0`:

- **SSR isolation** — each server request gets a fresh injector, so the counter doesn't leak across concurrent requests on the same Node process.
- **Mockable in unit tests** — vitest specs override the service to return deterministic IDs (`'test-1'`, `'test-2'`), so `aria-controls` assertions are stable across runs.
- **Future-proof** — if the workspace later commits to `@angular/cdk/a11y`'s `_IdGenerator` (already a transitive dep via the recent stepper PR), we swap the implementation without touching consumers.

Consumer pattern — honour an explicit `id` on the host element when present, generate one otherwise:

```ts
private el = inject(ElementRef<HTMLElement>);
private ids = inject(BsIdService);
readonly menuId = computed(() => this.el.nativeElement.id || this.ids.next('bs-dropdown'));
```

This is the standard CDK/Material pattern. It plays well with consumers who already label elements for tests or anchors and falls back gracefully when they don't.

### 6.7 Default `aria-label` strings

Several components ship hardcoded English placeholders (`"Default select example"`, `"Basic example"`). These are demo-doc detritus that leaked into runtime. Either remove the default entirely (force consumer to provide) or expose an input with a sensible default that matches the component's role.

## 7. Target patterns reference

Quick map from component to APG pattern. Implementations should follow the pattern's required attributes verbatim before adding anything custom.

| Component(s) | APG pattern | Spec link key |
|---|---|---|
| `modal`, `offcanvas` | Modal Dialog | `dialog/dialog-modal` |
| `popover` (click) | Dialog (Modal or Modeless) | `dialog/dialog-modal` |
| `tooltip` | Tooltip | `tooltip` |
| `dropdown-menu`, `context-menu` | Menu Button / Menu | `menu-button`, `menu` |
| `searchbox`, `multiselect`, `select2`, `typeahead` | Combobox (with Listbox popup) | `combobox/combobox-autocomplete-list` |
| `tab-control` | Tabs (Manual or Automatic Activation) | `tabs/tabs-manual` |
| `accordion` | Accordion | `accordion` |
| `treeview` | Tree View | `treeview/treeview-navigation` |
| `range` | Slider | `slider` |
| `multi-range` | Slider (Multi-Thumb) | `slider/slider-multithumb` |
| `rating` | Radio Group (or Slider) | `radio` |
| `timepicker` | Spinbutton | `spinbutton` |
| `calendar`, `datepicker` | Date Picker Dialog | `dialog-modal/datepicker-dialog` |
| `color-picker` wheel | Slider 2-D / custom | composite of `slider` |
| `progress-bar` | Progressbar | `meter` (and ARIA `progressbar`) |
| `spinner` | Status (Live Region) | `alert` |
| `toast` | Status / Alert | `alert` |
| `alert` | Alert | `alert` |
| `carousel` | Carousel | `carousel` |
| `breadcrumb` | Breadcrumb | `breadcrumb` |
| `pagination` | (no formal pattern; nav + aria-current) | n/a |
| `navbar` | Disclosure Navigation Menu | `disclosure/disclosure-navigation` |
| `resizable` | Window Splitter | `windowsplitter` |
| `tile-manager`, `dock`, `scheduler` | (no formal pattern; needs custom + drag-and-drop a11y per APG) | composite |
| `file-upload` | (no formal pattern; native `<input type="file">` + dropzone with live region) | n/a |

## 8. Rollout

This PRD does not ship as a single PR — there are 23 critical components, each with its own pattern and complexity. The shape is:

**Phase A — shared infrastructure**, all housed in a new `@mintplayer/ng-bootstrap/a11y` entry point. Each lands as its own PR; subsequent component fixes depend on them:

0. `BsIdService` — see §6.6. The smallest piece; the other primitives all depend on it for `aria-controls` / `aria-labelledby` / `aria-activedescendant` targets. Lands first.
1. `BsOverlayFocusManager` (or finish `has-overlay`) — focus trap + return-focus + background `inert`. Reused by `modal`, `offcanvas`, `popover`, `context-menu`, `datepicker`.
2. `BsRovingFocus` directive — arrow-key navigation + active-descendant primitive. Reused by `dropdown-menu`, `context-menu`, `tab-control`, `treeview`, `rating`, `priority-nav`, and the listbox side of `bsCombobox`.
3. **Dropdown ARIA mode + `bsCombobox`** (see §6.2 for full design). Extend the existing `[bsDropdown]` / `bsDropdownToggle` / `bs-dropdown-menu` / `bs-dropdown-item` primitive with a `role: 'menu' | 'listbox'` input and auto-generated IDs (via `BsIdService`); add a thin `bsCombobox` directive for the input-side `role="combobox"` + `aria-controls` + `aria-activedescendant` wiring. Reused by `searchbox`, `multiselect`, `select2`, `typeahead`, **and** fixes the menu-mode gaps on `dropdown` + `context-menu` + `priority-nav` overflow in the same change.
4. `BsLiveAnnouncer` service (or adopt `@angular/cdk/a11y`'s) — single live region for all "thing happened" announcements.

**Phase B — per-component fixes** (one PR per component, can run in parallel after Phase A lands):

Critical first, in priority order: `signature-pad`, `searchbox`+`multiselect`+`select2`+`typeahead`, `calendar`+`datepicker`, `timepicker`, `color-picker`, `modal`+`offcanvas`, `popover`, `tooltip`, `dropdown-menu`+`context-menu`, `navbar`+`navbar-toggler`+`playlist-toggler`, `table`+`virtual-datatable`, `progress-bar`, `resizable`, `scheduler`, `rating`.

Then majors: `tab-control`, `treeview`, `breadcrumb`, `pagination`, `scrollspy`, `list-group`, `priority-nav`, `carousel`, `button-group`, `select`, `datatable`, `code-snippet`, `dock`, `tile-manager`, `placeholder`, `marquee`, `range`, `multi-range`, `file-upload`, `toast`, `has-overlay`.

Then minors as cleanup.

**Phase C — regression gating** (two complementary layers):

**Layer 1 — vitest unit tests** (per component, alongside the component itself):

The workspace already runs vitest in every lib (`libs/*/vitest.config.ts`). Add an `<component>.aria.spec.ts` next to each interactive component asserting the *expected* attribute set after render. Example shape for `bs-modal`:

```ts
// modal.aria.spec.ts
it('renders dialog ARIA when open', () => {
  const el = render(BsModalComponent, { isOpen: true, titleId: 'm-t' });
  const dialog = el.querySelector('[role="dialog"]')!;
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby', 'm-t');
  expect(dialog).toHaveAttribute('tabindex', '-1');
});

it('moves focus into the dialog on open and returns it on close', () => { … });
it('closes on Escape', () => { … });
```

These run on every PR (cheap, fast feedback), are deterministic, and fail loudly if a refactor strips an attribute. Coverage target: **every component listed in §7's pattern table** has at least one `*.aria.spec.ts`.

**Layer 2 — Playwright + axe-core e2e** (across the demo app):

- Add `@axe-core/playwright` to the existing Playwright suite. Every demo page (`apps/demo/src/app/pages/*`) gets `await new AxeBuilder({ page }).analyze()` with zero `critical`/`serious` violations as the gate.
- Per-pattern interaction specs verify keyboard parity end-to-end (e.g. *open `bs-typeahead`, type, ArrowDown, ArrowDown, Enter — assert selected value and that `aria-activedescendant` tracked the highlight*).

**CI gating:** both layers run on every PR. A PR that introduces a new `critical`/`serious` axe violation, or removes an asserted ARIA attribute, fails CI.

## 9. Success criteria

1. **`axe-core` clean** — every demo page passes `axe.analyze()` with zero `critical` or `serious` issues.
2. **Pattern-match** — every component in §7 implements the listed APG pattern's required attributes; verified by a `*.aria.spec.ts` per component (vitest, Phase C Layer 1).
3. **Keyboard parity** — for every component in the keyboard-navigated set (slider, combobox, menu, tabs, tree, dialog, radiogroup), the APG-required key set is bound and verified by Playwright interaction specs.
4. **No focus-leak overlays** — `modal`, `offcanvas`, `popover`, `context-menu`, datepicker dialog all trap focus, return focus on close, and apply `inert`/`aria-hidden` to background.
5. **Screen reader smoke test** — the demo home page is navigable end-to-end with NVDA (Firefox) and VoiceOver (Safari) using only the keyboard. Pieterjan or a designated reviewer signs off after a manual pass. (At least one mobile pass — TalkBack on Chrome Android — for swipe/dock-class components once their keyboard alternatives land.)
6. **Sibling libs done too** — `qr-code` canvas labelled, swiper directives have a documented keyboard story (or a follow-up PRD if scope balloons).
7. **No silent regressions** — Phase C tests block merges that introduce a `critical`/`serious` axe violation or remove an asserted ARIA attribute.

## 10. Open questions — resolutions

Originally these were open. The branch `feat/aria-accessibility` resolved them as follows:

- **Adopt `@angular/cdk/a11y`?** **Yes, partially.** `BsOverlayFocusDirective` wraps CDK's `ConfigurableFocusTrap`. `BsLiveAnnouncerService` wraps CDK's `LiveAnnouncer` (adds dedup of consecutive identical messages). `BsRovingFocus` is hand-rolled (CDK's `FocusKeyManager` ties focus management to `@Input` query lists in a way that doesn't compose with our content-projection model). `BsIdService` is hand-rolled (CDK's `_IdGenerator` is `_`-prefixed/unstable; our service is one file). All four primitives live in `@mintplayer/ng-bootstrap/a11y`.
- **Carousel auto-advance default.** **Not changed.** Carousel still auto-advances; the play/pause button + APG-recommended off-by-default is a tracked follow-up (see §11). Breaking change deferred to a later batch.
- **`role="grid"` on `table`/`datatable`.** **Dropped.** `bs-table` no longer adds `role="grid"` (it conflicted with native `<table>` semantics). `bs-datatable` adds `aria-sort` to sortable headers + tabindex/Enter/Space keyboard activation. Virtualised `aria-rowcount`/`aria-rowindex` for virtual-datatable is a tracked follow-up (see §11) — needs CDK virtual scroll integration.
- **Color-picker wheel keyboard model.** **Both (a) and (b).** Wheel itself is keyboard-operable (`role="application"`, ArrowL/R = ±hue, ArrowU/D = ±saturation, Shift = fine, Page = ±30°, Home/End = saturation 100%/0%). Plus a user-toggleable checkbox reveals dedicated 1-D `bs-hue-strip` + `bs-saturation-strip` for users who find 2-D nav hard to spatialise (blind users in particular). The bs-slider primitive grew `[valueScale]` (default 100) and `[valueUnit]` (default "%") inputs so the same slider reports `aria-valuenow` and `aria-valuetext` in the natural unit ("171°" for hue, "47%" for brightness). Browser detection of SR usage is impossible by design (privacy + adversarial-design protections), so the toggle is user-controlled.
- **`scheduler` and `dock` and `tile-manager` keyboard alternative to drag.** **Deferred to its own PRD.** All three share the same "drag → keyboard cut/paste mode" design problem. Scope is large (focus management, live announcements, mode state machine). Tracked as a single open item in §11.

## 11. Status as of 2026-05-10

Branch: `feat/aria-accessibility`. ~60 commits since branch start (75315daf). The implementation closed every Critical + Major audit item, including the drag-keyboard family that was originally deferred (resolved via the WC-layer companion PRDs — see header).

### Closed

**§5.1 Critical (24/24):**
- ✓ `signature-pad` — canvas role + ariaLabel
- ✓ `searchbox`, `multiselect`, `select2`, `typeahead` — all four migrated to bsCombobox + popupRole="listbox" + BsRovingFocus (activedescendant mode)
- ✓ `calendar` — aria-selected/current/disabled, scope, labelled nav buttons (arrow-key nav deferred — see follow-ups)
- ✓ `datepicker` — popup labelled, inherits calendar fixes
- ✓ `timepicker` — aria-labels on inputs (native `<input type="number">` provides spinbutton role natively), listbox preset dropdown
- ✓ `color-picker` — wheel keyboard nav, slider APG-conformant, hue+sat strips behind user toggle
- ✓ `modal`, `offcanvas` — `[bsOverlayFocus]` (focus trap + return-focus), aria-labelledby/describedby via context service
- ✓ `popover` — switched from role=tooltip to role=dialog, aria-labelledby/describedby, Esc dismiss
- ✓ `tooltip` — aria-describedby on trigger, Esc dismiss
- ✓ `dropdown-menu`, `context-menu` — popupRole-driven roles, items focusable in menu mode with arrow-key nav and Enter/Space activation
- ✓ `navbar` — aria-controls now points at a real id (collapse wrapper has the id, with `display: contents` to preserve the original flex layout)
- ✓ `navbar-toggler`, `playlist-toggler` — actual `<button>` elements with aria-expanded/controls
- ✓ `table`, `virtual-datatable` — role="grid" dropped, aria-sort on sortable headers, keyboard activation
- ✓ `progress-bar` — invalid `aria-valuenow="infinite"` removed, ariaLabel input added
- ✓ `resizable` — role=separator on glyphs, aria-orientation, descriptive aria-labels, arrow-key resize
- ✓ `rating` — arrow-key navigation + roving tabindex (kept inline rather than reusing BsRovingFocus because APG radiogroup auto-selects on arrow)
- ✓ `qr-code` (sibling lib) — canvas role + derived aria-label
- ✓ **`scheduler`** — resolved via companion PRDs. Phase 5 (`a13952e7`) shipped APG Grid roles, event labels, view-switcher `aria-pressed`. Phase 6 v1 (`614fb0fe`) shipped M-mode + arrow nudge. The full keyboard model (cell-grid nav, range selection, Enter-driven move-mode, Shift+Arrow resize, cross-day resize) shipped in `9ae72107` per [`scheduler-keyboard-grid-nav.md`](./scheduler-keyboard-grid-nav.md).

**§5.2 Major (all):**
- ✓ `range`, `multi-range`, `placeholder`, `marquee` — aria-labels and prefers-reduced-motion handling
- ✓ `file-upload` — region role, live announcements via BsLiveAnnouncer, per-file progress aria-label
- ✓ `toast` — explicit role=alert/status, configurable politeness
- ✓ `has-overlay` — confirmed it's a CSS-injection marker (not a missing-feature placeholder); JSDoc added
- ✓ `breadcrumb`, `pagination` — listitem roles, aria-current, nav landmarks, ellipsis as `<span>`
- ✓ `tab-control` — SSR-fallback roving tabindex (the JS `<mp-tab-control>` Lit element was already APG-conformant)
- ✓ `treeview` — aria-level/setsize/posinset on items
- ✓ `scrollspy` — `<nav>` landmark, aria-current="location", `<button>` items
- ✓ `list-group-item` — role="listitem"
- ✓ `priority-nav` — `<nav>` landmark, ariaLabel input
- ✓ `carousel` — region role + aria-roledescription, slide labels, conditional aria-live
- ✓ `button-group`, `select` — placeholder demo aria-labels removed, replaced with input
- ✓ `datatable` — aria-sort + keyboard activation
- ✓ `code-snippet` — "Copied to clipboard" announced via BsLiveAnnouncer (first consumer)
- ✓ **`dock`** — resolved via [`wc-aria-accessibility.md`](./wc-aria-accessibility.md) Phase 4 (`49bd9bb6` + `d8029544`: floating-pane dialog role, close button, intersection-handle keyboard resize) + Phase 7 (`32ca12b7`: pane move-mode `M` → `T`/`R`/`B`/`L`/`F`). Playwright e2e (`cd71ab96`) + a `findFocusedPaneOrigin` bug-fix (`9dc1c78d`) closed the entry-path gap.
- ✓ **`tile-manager`** — resolved via [`wc-aria-accessibility.md`](./wc-aria-accessibility.md) Phase 3 (`0d2f25b1`: `role="region"` + `role="button"` tiles, `M`-to-move, roving tabindex, drag-begin announcements).

### Phase A primitives (all shipped, all consumed)

| Primitive | Location | Consumers |
|---|---|---|
| `BsIdService` | `a11y/src/service/id.service.ts` | every component that auto-generates ids (modal, offcanvas, popover, dropdown menus, navbar collapse, color-picker toggle, …) |
| `BsRovingFocusDirective` + `BsRovingFocusItemDirective` | `a11y/src/roving-focus/` | typeahead, select2 (activedescendant mode); rating uses an inline equivalent |
| `BsOverlayFocusDirective` | `a11y/src/overlay-focus/` | modal, offcanvas |
| `BsLiveAnnouncerService` | `a11y/src/live-announcer/` | code-snippet, file-upload, tile-manager, scheduler, dock, typeahead, searchbox, placeholder |
| `BsComboboxDirective` | `dropdown/src/combobox/` (originally in a11y, moved to break a circular dep) | typeahead, select2 |

### §6 cross-cutting work

- §6.1 overlay focus: `BsOverlayFocusDirective` lands; modal + offcanvas adopt it. Background `inert` is delegated to each consumer (modal hides app-root differently from popover); the directive only owns the focus trap + return-focus.
- §6.2 dropdown ARIA mode: `popupRole: 'menu' | 'listbox'` input on `[bsDropdown]`. Renamed from `role` because `role` is a standard HTML attribute and consumer template `role="combobox"` on a `[bsDropdown]` wrapper was getting eaten as a directive-input bind. Fix in commit 86939054.
- §6.3 keyboard nav: `BsRovingFocus` covers the listbox case; `BsDropdownMenuComponent` rolls its own (simpler) menu-mode keyboard handler so it doesn't need the input-forwarding gymnastics. Rating uses an inline implementation because APG radiogroup auto-selects on arrow (different semantics from BsRovingFocus).
- §6.4 live regions: `BsLiveAnnouncerService` (CDK wrapper with dedup). Consumers: code-snippet "Copied", file-upload "Added N files", tile-manager "Dragging X / Move blocked", scheduler (view + event + move-mode + cell narration), dock (pane move-mode), typeahead/searchbox "N results found", placeholder "Loading complete".
- §6.5 reduced-motion: marquee added, others (carousel auto-advance, parallax, dock/tile-manager reflow) tracked as follow-ups.
- §6.6 ID generation: `BsIdService` shipped.
- §6.7 placeholder aria-labels: removed (select, button-group).

## 12. Architectural patterns / gotchas (lessons from the implementation)

These are conventions the rest of the branch follows; future a11y work should match.

### 12.1 Generated ids: read in `afterNextRender`, expose via signal

When two co-located directives both want to set `[attr.id]` (e.g. `BsDropdownItemComponent` and `BsRovingFocusItemDirective`), they race. The robust pattern:

- One directive (the "primary") sets `nativeElement.id` imperatively in `afterNextRender`. No `[attr.id]` host binding.
- Other directives on the same host READ `nativeElement.id` (also in `afterNextRender`, so it's read AFTER the primary set). They store the value in a **signal**, not a getter, so reactive consumers (like `BsRovingFocusDirective.activeDescendantId` computed) re-run when the id is resolved post-mount.

```ts
private readonly _itemId = signal<string>('');
get itemId(): string { return this._itemId(); }

constructor() {
  afterNextRender(() => {
    if (!this.elementRef.nativeElement.id) {
      this.elementRef.nativeElement.id = this.ids.next('bs-rovingitem');
    }
    this._itemId.set(this.elementRef.nativeElement.id);
  });
}
```

A plain `get itemId() { return this.elementRef.nativeElement.id; }` getter would be silently cached on first computed read (when id was still '') and never re-read — leading to `aria-activedescendant=""` on combobox inputs even after the items got real ids. Lesson learned the hard way during browser-testing of typeahead.

### 12.2 Avoid name-clashes with HTML attributes

Don't name a directive input the same as a standard HTML attribute the consumer might want to set on the host element. `role` collided (PR 86939054 → renamed to `popupRole`); `autocomplete` collided (B-3b → aliased to `bsComboboxAutocomplete`). The Angular template compiler binds matching static attributes to inputs, hijacking the consumer's intent.

### 12.3 Combobox + dropdown composition

Combobox patterns (typeahead, select2) compose:
1. `[bsDropdown] popupRole="listbox" [(isOpen)]` on the wrapper — drives roles, ids, aria-haspopup
2. `<input bsCombobox>` — emits role=combobox + aria-* from injected parent dropdown
3. `<bs-dropdown-menu *bsDropdownMenu bsRovingFocus mode="activedescendant">` — listbox keyboard model
4. `<bs-dropdown-item bsRovingFocusItem>` per option

bsCombobox auto-detects the parent's `rovingFocus` content child and forwards arrow keys to it. Falls back to emitting `(navigate)` events if not present.

### 12.4 Dropdown menu mode vs listbox mode

`bs-dropdown-item` participates in keyboard navigation differently per mode:
- **Menu mode (default):** items are tab targets (roving tabindex), arrow keys move via the menu's own keyboard handler (`BsDropdownMenuComponent.onKeydown`), Enter/Space dispatches click on the host.
- **Listbox mode:** items are NOT tab-reachable (tabindex=null from bs-dropdown-item; `bsRovingFocusItem` sets -1). Activedescendant is managed externally on a sibling combobox input.

The two paths don't fight because in listbox mode bs-dropdown-item's tabindex computed returns null, leaving the field clear for `bsRovingFocusItem`.

### 12.5 Template inputs are typed `Event`, not `KeyboardEvent`

`(keydown.enter)="handler($event)"` types `$event` as `Event`, NOT `KeyboardEvent`. Functions called from these handlers need a widened parameter type:

```ts
columnHeaderClicked(column: BsDatatableColumnDirective, event: MouseEvent | KeyboardEvent) { … }
onActivate(event: Event) { … }
```

If the handler genuinely needs `KeyboardEvent` shape, use `$any($event)` in the template — but most a11y handlers just read `event.shiftKey` (which exists on both Mouse and Keyboard events) or call `preventDefault()` (Event base class).

### 12.6 ngTemplateOutlet injector forwarding for context services

Modal/offcanvas/popover use a **context service** (e.g. `BsModalContextService`, component-scoped) to let inner directives (`bsModalHeader`, `bsModalBody`) publish their generated ids to the dialog renderer. Because these directives live inside the user's `*bsModal` template (a separate injector chain), forward the host component's injector via `<ng-container *ngTemplateOutlet="template; injector: injector">` so the inner directives can `inject(BsXxxContextService)`.

### 12.7 Vitest workspace modernization

`vitest.workspace.ts` (`defineWorkspace`) was deprecated in Vitest 4. Migrated to a root `vitest.config.ts` with a `projects: ['libs/*/vitest.config.ts', 'apps/*/vitest.config.ts']` field (commit 900331fa). `npm test` (nx run-many) is the canonical workspace runner; `npx vitest run "<pattern>"` from root now works for fast dev iteration. `npm run test:watch` simplified from `vitest --workspace=…` to bare `vitest`.

## 13. Follow-ups — items NOT in the original audit

These were discovered during implementation. None blocks shipping the branch as-is; each is its own future PR.

### 13.1 Critical follow-ups

- ~~**Calendar arrow-key navigation.**~~ ✓ **Shipped** in `4d442375` (APG Date Picker grid + arrow-key navigation). Single tab-stop into the body; ArrowLeft/Right=day, ArrowUp/Down=week, PageUp/Down=month, Ctrl+PageUp/Down=year, Home/End=week edges, Enter/Space selects. Implementation tracked under [`wc-aria-accessibility.md`](./wc-aria-accessibility.md) Phase 9 (Angular scope extension).
- ~~**Drag-keyboard family**~~ ✓ **Shipped** for `scheduler`, `dock`, `tile-manager` via [`wc-aria-accessibility.md`](./wc-aria-accessibility.md) Phases 3/6/7 + the scheduler follow-up [`scheduler-keyboard-grid-nav.md`](./scheduler-keyboard-grid-nav.md). The library-wide trigger key settled on `M` for the dock + tile-manager (T/R/B/L/F commits for dock; arrow-nudge for tile-manager); scheduler later adopted `Enter` after the cell-level grid model shipped. ⏳ **`mintplayer-ng-swiper` still deferred** — the swipe directives compose into existing components that already work via underlying focus order; opening a separate tracking issue if a consumer reports a gap.

### 13.2 Major follow-ups

- ✓ **Carousel play/pause button.** Shipped 2026-05-11. `<bs-carousel>` now renders a Play/Pause control whenever `[interval]` is set; consumers can override the default button via a `*bsCarouselPlayPause` projection slot (structural directive + `ngTemplateOutlet`, exposing `let-paused` / `let-toggle`). Two-way `[(paused)]="..."` model + public `play()` / `pause()` methods. `aria-live` is now computed: `off` while auto-advance is actually rotating, `polite` when paused / `interval` unset / `prefers-reduced-motion`. The audit's "auto-advance off by default" half was already satisfied — `[interval]` defaulted to `null` (no rotation) — so no BC needed there.
- ✓ **Virtual-datatable aria-rowcount / aria-rowindex.** Shipped 2026-05-11. `VirtualDatatableDataSource.length$` now exposes a `BehaviorSubject<number>` so the component can keep `aria-rowcount = totalRecords + 1` in sync without polling. Both the header `<table>` (via a new `[ariaRowCount]` input on `<bs-table>`) and the body `<table>` (raw `[attr.aria-rowcount]`) carry the same logical count. Header `<tr>` is `aria-rowindex="1"`; each `*cdkVirtualFor` row uses CDK's `let i = index` (absolute index in the source data, not render index) bound to `aria-rowindex="i + 2"`. Browser-verified end-to-end: `aria-rowcount="139"` on a 138-artist dataset, scrolling to the middle re-cycles rendered rows so they expose `aria-rowindex="59"…"77"` while the rowcount stays stable.
- ✓ **prefers-reduced-motion** on remaining components — fully shipped. Splitter / dock / scheduler in `332d2d4f`; marquee already had it; tile-manager from `ca7a0c9d`; carousel auto-advance with the APG bundle 2026-05-11; accordion slideUpDown in `86b4c319` (2026-05-11) along with a new `BsReducedMotionDirective` in `@mintplayer/ng-bootstrap/reduced-motion` that the carousel migrated to in the same commit. Parallax was reviewed and dropped — `background-attachment: fixed` is genuinely static (the image doesn't move on its own; scroll is user-controlled), so WCAG 2.3.3 doesn't apply.
- ✓ **More live-announcer consumers** (per §6.4) — fully shipped. ✓ tile-manager "Dragging X" / "Move blocked" (in Phase 3); ✓ scheduler "View changed", "Event added/updated/removed", "Move mode for X", "Move committed/cancelled", per-cell focus narration, selection range narration (Phases 5/6 + scheduler-keyboard-grid-nav PRD); ✓ dock pane move-mode entry/commit/cancel announcements (Phase 7); ✓ typeahead "N results found" / "1 result found" / `noSuggestionsText`; ✓ searchbox same triplet (gated on debounced in-flight requests so eager `[suggestions]` prepopulation doesn't fire); ✓ placeholder "Loading complete" on `isLoading` true→false transition.
- ⏳ **Axe-core CI integration** — tracked separately as `wc-aria-accessibility.md` Phase 8.2 (deferred to follow-up issue).

### 13.3 Polish issues found in browser testing

- **Dev server caching.** Angular's vite-based dev server (`nx serve`) sometimes serves stale chunks for lib changes. Forcing a rebuild requires a server restart or `.angular/cache` deletion. `npm test` (nx) is unaffected — it always builds from current source.

## 14. Resolved post-compaction (2026-05-10)

- **Datatable template type error.** Widened `DatatableSortBase.columnHeaderClicked(column, event: Event)` and read `shiftKey` via `(event as MouseEvent | KeyboardEvent).shiftKey`. Dev server builds clean.
- **Typeahead arrow-key navigation — verified end-to-end via Playwright.** Type "a" → 4 suggestions render; `aria-activedescendant` reports the first item id immediately on populate (the previously-noted "initial empty `aria-activedescendant`" polish issue is no longer reproducible — likely fixed as a side-effect of the signal-backed `_itemId` in `BsRovingFocusItemDirective`). ArrowDown/ArrowUp cycle correctly (item-4 → item-5 → item-6 → item-5). Enter activates the focused suggestion (alert with selected payload fires).
- **Hybrid TAB navigation in combobox.** User explicitly chose this over the strict APG default. `BsComboboxDirective` now intercepts TAB while the popup is open and a roving-focus is present: TAB advances `aria-activedescendant` (focus stays on the input — combobox semantics preserved), Shift+TAB retreats. At the last enabled option a forward TAB closes the popup and lets the browser advance focus normally; symmetric for Shift+TAB at the first option. Items remain `aria-activedescendant`-targeted, NOT focusable — so screen readers still announce "option N of M" as in any combobox. Three new specs in `typeahead.aria.spec.ts` lock the behavior. `BsRovingFocusDirective.firstEnabledIndex` / `lastEnabledIndex` were promoted from private to public for the boundary check.
- **Drag-keyboard family closed via WC-layer companion PRD.** Originally §10's last open item. [`wc-aria-accessibility.md`](./wc-aria-accessibility.md) ships all four Lit WCs (splitter, dock, tile-manager, scheduler) end-to-end, plus `bs-calendar` (Angular scope extension as Phase 9). Library-wide convention: `M` enters move/resize mode on a focused tile/pane (dock/tile-manager); `Enter` on a focused event (scheduler, post `9ae72107`). Live announcer narrates entry/commit/cancel uniformly via the shared `LiveAnnouncerController` (Lit) and `BsLiveAnnouncerService` (Angular). Demo pages all carry visible keyboard-shortcut panels.
- **Scheduler keyboard model graduated from Phase 6 v1 to v2.** [`scheduler-keyboard-grid-nav.md`](./scheduler-keyboard-grid-nav.md) shipped `9ae72107`. Cell-level grid nav (Arrow + Home/End/PageUp/Down/Ctrl+Home/End), linear time-range selection that crosses day boundaries on week view (Shift+Arrow), Enter-driven move-mode with `aria-pressed` on the moving event, Shift+Arrow end-edge resize + Alt+Shift start-edge resize, week-view cross-day resize, auto-scroll-on-arrow-nav. Renamed `event-click` → `event-selected` library-wide (fires on Tab too). Bare T/Y/M/W/D shortcuts removed in favour of `Alt+letter`. 656 unit tests + 12 new keyboard cases all green; manual browser smoke test confirmed end-to-end.
- **Dock keyboard pane move-mode bug-fix.** Discovered while writing the Phase 7.5 Playwright spec: `findFocusedPaneOrigin` looked up `.dock-tab[data-tab-id="${active.id}"]` but `active.id` is `${tabId}-header-button` (mp-tab-control's button id pattern), so the lookup never matched and `M`-on-tab silently failed in production. Stripping the `-header-button` suffix made M-mode entry work, validated by `dock-keyboard.spec.ts` × Chromium + Firefox (`9dc1c78d` + `cd71ab96`). Unit tests had been injecting `paneMoveMode` directly so missed the gap.
- **Live-announcer rolled out to typeahead / searchbox / placeholder.** §13.2's last 🟡 "more live-announcer consumers" item closed. Typeahead and searchbox both gate the announcement on a `requestInFlight` flag set by their respective request-emit branches — so a parent that prepopulates `[suggestions]` on first render does **not** fire a phantom announcement. Both wire `noSuggestionsText` / "1 result found" / "${count} results found" with overridable inputs (`resultsAnnouncementSingular`, `resultsAnnouncementPlural` taking a count → string formatter, `noResultsAnnouncement` on the searchbox). Placeholder announces `loadingCompleteText` ("Loading complete") on the `isLoading` true → false edge only — false → true is silent because the host's existing `aria-busy="true"` already conveys that state. Six new vitest cases per component (announce, singular, no-results, prepopulation no-op, clear-before-resolve, custom text) all green.
- **Virtual-datatable rowcount / rowindex.** §13.2 row 4 (#3 in the outstanding-followups memory) closed. Made `VirtualDatatableDataSource.totalRecords` reactive by replacing the private number with a `BehaviorSubject<number>` exposed as `length$`; existing `get length()` reads from it for backwards-compat. `BsVirtualDatatableComponent` runs an `effect()` that subscribes to `length$` and pushes `totalRowCount.set(n + 1)` (header included). `BsTableComponent` got an `ariaRowCount` input that forwards onto its inner `<table>` so the header table reports the same logical count as the body table. `*cdkVirtualFor` exposes `let i = index` — the absolute source-data index, not render index — used as `aria-rowindex="i + 2"` (1 header + 1-based). Browser-verified on the demo: 138 artists → both tables show `aria-rowcount="139"`, header tr `aria-rowindex="1"`, scrolling rotates rendered rows so they expose `aria-rowindex="59"…"77"` mid-scroll without disturbing the rowcount.
- **Carousel APG bundle.** §13.2 row 1 closed. New `*bsCarouselPlayPause` structural directive — consumer projects a `<ng-template>` that receives `let-paused` and `let-toggle` from the carousel's context. Two-way `[(paused)] = model<boolean>(false)` plus public `play()` / `pause()` methods. When the consumer doesn't project a template but `[interval]` is set, the carousel falls back to a built-in default Play/Pause button (mirroring the `defaultFileTemplate` pattern in file-upload), so APG compliance is "correct by default" for any consumer who turns auto-advance on. `aria-live` is a computed signal — `off` while auto-advance is rotating, `polite` when paused / unconfigured / under prefers-reduced-motion. Reduced-motion suppresses the auto-advance timer entirely (no rotation; matches tile-manager / scheduler / dock semantics). The "auto-advance off by default" half was already satisfied since `[interval]` defaulted to `null`. Browser-verified: clicking the default button flips text "Pause" ↔ "Play", `aria-pressed` toggles `false` ↔ `true`, `aria-live` flips `off` ↔ `polite`. 9 new vitest cases.

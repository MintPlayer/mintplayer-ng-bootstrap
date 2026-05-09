# PRD: Library-wide ARIA & accessibility audit

**Status:** Proposal
**Author:** Pieterjan (audit by 5-agent ARIA team)
**Date:** 2026-05-09
**Library:** `@mintplayer/ng-bootstrap` (all entry points)
**Standards target:** [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) + [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/), conformance to **WCAG 2.2 AA**.

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

## 10. Open questions

- **Adopt `@angular/cdk/a11y`?** It already provides `FocusTrap`, `FocusKeyManager`, `LiveAnnouncer`, `InteractivityChecker`. Memory note: this workspace is Angular-only (`project_workspace_angular_only`), so the framework-agnostic argument doesn't apply. CDK is the obvious choice unless it conflicts with the Lit-WC migration goal — in which case build the same primitives natively and keep the CDK option for the Angular-shell layer only.
- **Carousel auto-advance default.** APG recommends auto-advance be **off** by default and require an explicit "Play" button. We currently auto-advance. Breaking change — call out explicitly when the carousel fix lands (`feedback_breaking_changes_ok`).
- **`role="grid"` on `table`/`datatable`.** Either commit to a true grid (cell-level keyboard nav, `aria-rowindex`, `aria-colindex`) or drop the role and lean on native table semantics + `aria-sort` + `aria-rowcount`. Decision needed before fixing virtual-datatable.
- **Color-picker wheel keyboard model.** A 2-D control has no native keyboard mapping. Options: (a) two separate sliders for hue + saturation, (b) arrow keys = ± hue / shift+arrow = ± saturation, (c) input field as the keyboard fallback. Decide before implementing.
- **`scheduler` and `dock` keyboard alternative to drag.** APG's drag-and-drop guidance is "must have a keyboard alternative". For a calendar scheduler that means cut/paste-style keyboard mode. Significant scope — may warrant its own PRD if not trivially reducible to roving focus + Enter-to-grab.

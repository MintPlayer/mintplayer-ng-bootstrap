# PRD: BsAccordion `multi` Input & Noscript Restoration

## Overview

Two changes in one:

1. **Restore noscript support** — The accordion's pure-CSS noscript fallback was broken when the hidden radio `<input>` elements were removed in a prior commit. This restores them so the accordion works without JavaScript (SSR/noscript).

2. **Add `multi` input** — A new `multi` input on `BsAccordionComponent` that allows multiple tabs to be open simultaneously. When `multi` is `false` (default), the existing single-tab behavior is preserved. When `multi` is `true`, opening a tab does not close siblings.

## Changes Made

### 1. `accordion.component.ts` — new input

Added `multi = input(false)` alongside the existing inputs.

### 2. `accordion-tab.component.ts` — conditional sibling-close

The `setActive()` method now checks `this.accordion.multi()` before closing siblings:
- `multi=false`: opening a tab closes all siblings (existing behavior)
- `multi=true`: opening a tab leaves siblings untouched
- Closing a tab always recursively closes nested child accordion tabs (unchanged)

### 3. `accordion-tab.component.html` — restore hidden inputs

Re-added hidden `<input>` elements inside the `bsNoNoscript` div:
- `multi=false` → `<input type="radio">` with shared `[name]` (browser enforces single-selection)
- `multi=true` → `<input type="checkbox">` (each toggles independently)

Both are hidden via `class="d-none"` and exist only for the CSS `:checked` selector in noscript mode. In JS mode, `[checked]` is bound to `isActive()` to keep them in sync.

### 4. `accordion-tab.component.scss` — noscript CSS

Updated the noscript CSS rules:
- **Default hidden state:** `.noscript > .accordion-collapse { height: 0 !important; }` — all tabs are collapsed by default in noscript mode (since Angular animations don't run without JS)
- **Checked state:** both `input[type="radio"]:checked` and `input[type="checkbox"]:checked` selectors show the content (`height: auto !important`) and style the header (blue background, chevron rotation)

### 5. `accordion-tab-header.component.html` — `<button>` → `<label>`

Changed from `<button>` to `<label>` with:
- `[for]="accordionTab.accordionTabName()"` — associates with the hidden input for noscript click-to-toggle behavior
- `role="button"` — accessibility: announced as button by screen readers
- `tabindex="0"` — keyboard focusable (labels aren't focusable by default unlike buttons)
- `(keydown)="headerKeydown($event)"` — handles Enter/Space activation (labels don't natively activate on keypress)
- All existing bindings preserved: `[class.collapsed]`, `[class.bg-unset]`, `aria-expanded`, `aria-controls`

### 6. `accordion-tab-header.component.ts` — keyboard handler

Added `headerKeydown()` method for Enter/Space key activation, since `<label>` elements don't natively respond to keyboard activation like `<button>` does.

### 7. Demo page — multi mode showcase

Added a "Multi (multiple tabs open)" section between the single-level and multi-level demos, demonstrating `[multi]="true"`.

## How Noscript Works

### With JavaScript (normal mode)
1. User clicks the `<label>` header
2. `headerClicked()` calls `event.preventDefault()` — prevents the label from natively toggling the hidden input
3. `setActive()` manages state via signals
4. `[checked]="isActive()"` binding keeps the hidden input in sync
5. `[@slideUpDown]` animation handles content visibility

### Without JavaScript (noscript/SSR mode)
1. `BsNoNoscriptDirective` adds `.noscript` class to the outer div during SSR
2. CSS rule `.noscript > .accordion-collapse { height: 0 !important; }` hides all tab content
3. User clicks the `<label>` → browser natively toggles the associated radio/checkbox via `[for]`
4. CSS rule `.noscript > input:checked ~ .accordion-collapse { height: auto !important; }` shows the checked tab's content
5. For radios (`multi=false`): browser enforces only one checked at a time via shared `[name]`
6. For checkboxes (`multi=true`): each can be checked/unchecked independently

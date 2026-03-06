# PRD: TabControl Noscript Compatibility

## Problem

When JavaScript is disabled in the browser, the `bs-tab-control` component is non-functional:
1. **No tab content visible** -- Tab pages use `display: none` by default and rely on Angular's `[class.d-block]="tabControl.activeTab() === this"` binding to show the active page. Without JS, no binding runs, so nothing is visible.
2. **Tab headers don't work** -- The tab headers are `<button>` elements with `(click)="setActiveTab(tab)"`. Without JS, clicks do nothing.

## Goal

Make the tab-control work without JavaScript, using the same `<input type="radio">` + `<label>` + CSS `:checked` pattern already used in the carousel and accordion components.

## Reference Implementations

### Accordion (closest match)
- Each `bs-accordion-tab` renders a hidden `<input type="radio">` (or checkbox for `multi` mode) with `bsNoNoscript`
- The header uses `<label [for]="accordionTabName()">` instead of `<button>`
- The label has `role="button"`, `tabindex="0"`, and `(keydown)` handler for Enter/Space
- When JS is active, `(click)` calls `event.preventDefault()` to prevent the label from natively toggling the radio, and manages state via signals instead
- CSS uses `.noscript > input:checked ~ .accordion-collapse` to show content and style headers

### Carousel
- Server-side renders a completely separate HTML branch (`@if (isServerSide)`) with radio inputs, labels for indicators/prev/next, and CSS Grid + opacity for visibility
- CSS uses `.car-radio.noscript:checked + .carousel-item` for slide visibility

## Implementation

Radio inputs are rendered at the **top level of `bs-tab-control`** (not inside each `bs-tab-page`). This allows CSS general sibling selectors (`~`) to reach both the tab header strip and the tab content from a single set of radio inputs, without needing `:has()`.

### 1. Hidden radio inputs in `bs-tab-control` template

At the top of `tab-control.component.html`, one hidden radio per tab:

```html
@for (tab of orderedTabPages(); track tab) {
    <input type="radio" class="d-none" bsNoNoscript
        [name]="tabControlName()"
        [id]="tab.tabName()"
        [checked]="checkedTab() === tab"
        [disabled]="tab.disabled()">
}
```

- All radios share the same `[name]` (the tab control's unique name) -- browser enforces single-selection
- `[checked]` uses `checkedTab()`, a computed signal that synchronously returns the first non-disabled tab when `selectFirstTab()` is true and no active tab is set (ensuring SSR renders the first tab as checked)
- `bsNoNoscript` adds `.noscript` class during SSR
- `[disabled]` prevents noscript activation of disabled tabs
- Radios are placed before the tab strip so the CSS `~` combinator can reach forward to both `.tsc` and `.tab-content`

### 2. `<label>` headers instead of `<button>`

In `tab-control.component.html`, the tab strip is defined once in an `<ng-template>` and rendered via `ngTemplateOutlet` for both top and bottom positions:

```html
<label
    [for]="tab.tabName()"
    [id]="tab.tabName() + '-header'"
    class="nav-link text-nowrap"
    [class.active]="activeTabValue === tab"
    [class.disabled]="tab.disabled()"
    role="tab"
    [attr.tabindex]="tab.disabled() ? -1 : 0"
    [attr.aria-selected]="activeTabValue === tab"
    [attr.aria-controls]="tab.tabName() + '-panel'"
    [attr.aria-disabled]="tab.disabled() || null"
    (click)="setActiveTab(tab, $event)"
    (keydown)="headerKeydown(tab, $event)">
    <ng-container [ngTemplateOutlet]="tab.headerTemplate()!.template"></ng-container>
</label>
```

Key changes from `<button>`:
- `[for]="tab.tabName()"` links label to its radio input
- `[id]` uses `-header` suffix (radio uses the base `tabName()`)
- `[attr.tabindex]` makes label keyboard-focusable (disabled tabs get `-1`)
- `(keydown)` handler for Enter/Space activation
- `(click)` handler calls `event.preventDefault()` to prevent native radio toggling when JS is active

### 3. Click handler and keyboard support

In `tab-control.component.ts`:

```typescript
setActiveTab(tab: BsTabPageComponent, event?: Event) {
  event?.preventDefault();  // Prevent label from toggling radio natively
  if (!tab.disabled()) {
    this.activeTab.set(tab);
  }
  return false;
}

headerKeydown(tab: BsTabPageComponent, event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    this.setActiveTab(tab);
  }
}
```

### 4. `checkedTab` computed signal

Synchronously determines which radio should be checked, without relying on the async `setTimeout` in the auto-select effect:

```typescript
checkedTab = computed(() => {
  const active = this.activeTab();
  if (active) return active;
  if (!this.selectFirstTab()) return null;
  return this.orderedTabPages().find(t => !t.disabled()) ?? null;
});
```

### 5. Noscript CSS using general sibling combinator

The rendered DOM structure places radios before the tab strip and content:

```
<bs-tab-control>
  <input type="radio" class="noscript" checked>   <!-- nth-of-type(1) -->
  <input type="radio" class="noscript">            <!-- nth-of-type(2) -->
  <div class="tsc">
    <ul class="nav nav-tabs">
      <li class="nav-item">...</li>                <!-- nth-child(1) -->
      <li class="nav-item">...</li>                <!-- nth-child(2) -->
    </ul>
  </div>
  <div class="tab-content noscript">
    <bs-tab-page>...</bs-tab-page>                 <!-- nth-child(1) -->
    <bs-tab-page>...</bs-tab-page>                 <!-- nth-child(2) -->
  </div>
</bs-tab-control>
```

**Active header styling** (no `::ng-deep` needed -- all elements are in the component's own template):

```scss
@for $i from 1 through 20 {
    :host input.noscript:nth-of-type(#{$i}):checked ~ .tsc .nav-item:nth-child(#{$i}) > .nav-link {
        color: var(--bs-nav-tabs-link-active-color);
        background-color: var(--bs-nav-tabs-link-active-bg);
        border-color: var(--bs-nav-tabs-link-active-border-color);
    }
}
```

**Content visibility** (uses `::ng-deep` to pierce into projected `bs-tab-page` children):

```scss
:host ::ng-deep {
    @for $i from 1 through 20 {
        input.noscript:nth-of-type(#{$i}):checked ~ .tab-content > bs-tab-page:nth-child(#{$i}) > .tab-page-content {
            display: block;
        }
    }
}
```

### 6. Border styling in noscript mode

The existing rule in `tab-control.component.scss` already handles noscript borders (unchanged):

```scss
.tab-content.noscript::ng-deep > bs-tab-page > .tab-page-content {
    border: var(--bs-border-width) var(--bs-border-style) var(--bs-border-color) !important;
    margin-top: -1px;
}
```

## Files Modified

1. **`tab-control.component.html`** -- Add radio inputs at top level, change `<button>` to `<label>`, extract tab strip into `<ng-template>` with `ngTemplateOutlet`
2. **`tab-control.component.ts`** -- Update `setActiveTab()` to accept event and call `preventDefault()`, add `headerKeydown()` method, add `checkedTab` computed signal
3. **`tab-control.component.scss`** -- Add `cursor: pointer` for labels, add SCSS loops for noscript active header styling and content visibility
4. **`tab-page.component.html`** -- Update `aria-labelledby` to `tabName() + '-header'`
5. **`tab-page.component.scss`** -- Remove dead `:checked + .tab-page-content` rule (now handled by tab-control)

## How It Works

### With JavaScript (normal mode)
1. User clicks a `<label>` tab header
2. `(click)` handler calls `event.preventDefault()` -- prevents the label from natively toggling the hidden radio
3. `setActiveTab()` updates the `activeTab` signal
4. Angular's `[class.d-block]` binding shows the active tab page
5. `[class.active]` binding highlights the active tab header
6. `[checked]` binding keeps the hidden radio in sync (for consistency)

### Without JavaScript (noscript/SSR mode)
1. `BsNoNoscriptDirective` adds `.noscript` class to radio inputs and `.tab-content` div during SSR
2. `checkedTab()` ensures the first non-disabled tab's radio has the `checked` attribute in the SSR HTML
3. CSS `input.noscript:nth-of-type(N):checked ~ .tab-content > bs-tab-page:nth-child(N) > .tab-page-content { display: block }` shows the checked tab's content
4. User clicks a `<label>` tab header -- browser natively checks the associated radio via `[for]`/`[id]` link
5. CSS `:checked` sibling selector shows the newly checked tab's content, hides the previous one (radios are mutually exclusive via shared `[name]`)
6. CSS `input.noscript:nth-of-type(N):checked ~ .tsc .nav-item:nth-child(N) > .nav-link` highlights the active tab header

## Testing

- Verify tab switching works with JavaScript enabled (no regression)
- Verify first tab is visible when page loads without JavaScript
- Verify clicking tab headers switches tabs without JavaScript
- Verify disabled tabs cannot be activated without JavaScript
- Verify active tab header styling in noscript mode
- Verify both top and bottom tab positions work
- Verify drag-drop still works with labels (CDK drag on `<li>`, not `<label>`)
- Verify keyboard navigation (Tab, Enter, Space) works
- Verify ARIA attributes are correct

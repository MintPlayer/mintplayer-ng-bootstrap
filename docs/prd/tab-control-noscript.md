# PRD: TabControl Noscript Compatibility

## Problem

When JavaScript is disabled in the browser, the `bs-tab-control` component is non-functional:
1. **No tab content visible** -- Tab pages use `display: none` by default and rely on Angular's `[class.d-block]="tabControl.activeTab() === this"` binding to show the active page. Without JS, no binding runs, so nothing is visible.
2. **Tab headers don't work** -- The tab headers are `<button>` elements with `(click)="setActiveTab(tab)"`. Without JS, clicks do nothing.

## Goal

Make the tab-control work without JavaScript, using the same `<input type="radio">` + `<label>` + CSS `:checked` pattern already used in the carousel and accordion components.

## Existing Infrastructure

The project already has partial noscript plumbing in place:

| Piece | Status | Location |
|-------|--------|----------|
| `BsNoNoscriptDirective` | Exists | `@mintplayer/ng-bootstrap/no-noscript` -- adds `.noscript` class during SSR |
| `bsNoNoscript` on tab-content div | Exists | `tab-control.component.html:34` |
| CSS `:checked + .tab-page-content` | Exists | `tab-page.component.scss:5-8` |
| Radio `<input>` elements in template | **Missing** | `tab-page.component.html` |
| `<label>` headers (instead of `<button>`) | **Missing** | `tab-control.component.html` |
| Active tab header styling in noscript | **Missing** | `tab-control.component.scss` |

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

## Proposed Approach

Follow the **accordion pattern** -- it's the closest architectural match because the radio inputs and content can be co-located inside each tab page component, while labels reference them from the tab header strip.

### 1. Add radio inputs to `bs-tab-page` template

In `tab-page.component.html`, add a hidden radio input before the `.tab-page-content` div:

```html
<input type="radio" class="d-none"
    bsNoNoscript
    [name]="tabControl.tabControlName()"
    [id]="tabName()"
    [checked]="tabControl.activeTab() === this">
<div [id]="tabName() + '-panel'"
    class="tab-page-content"
    role="tabpanel"
    [attr.aria-labelledby]="tabName()"
    [class.d-block]="tabControl.activeTab() === this"
    [attr.tabindex]="tabControl.activeTab() === this ? 0 : null">
    <ng-content></ng-content>
</div>
```

- All radios share the same `[name]` (the tab control's unique name) -- browser enforces single-selection
- `[checked]` keeps the radio in sync with Angular's active tab state (for hydration consistency)
- `bsNoNoscript` adds `.noscript` class during SSR
- The existing CSS `input[type="radio"].noscript:checked + .tab-page-content { display: block; }` activates

### 2. Change `<button>` to `<label>` in tab-control headers

In `tab-control.component.html`, replace the `<button>` elements with `<label>` elements:

```html
<label
    [for]="tab.tabName()"
    [id]="tab.tabName() + '-header'"
    class="nav-link text-nowrap"
    [class.active]="activeTabValue === tab"
    [class.disabled]="tab.disabled()"
    role="tab"
    tabindex="0"
    [attr.aria-selected]="activeTabValue === tab"
    [attr.aria-controls]="tab.tabName() + '-panel'"
    [attr.aria-disabled]="tab.disabled() || null"
    (click)="setActiveTab(tab, $event)"
    (keydown)="headerKeydown(tab, $event)">
    <ng-container [ngTemplateOutlet]="tab.headerTemplate()!.template"></ng-container>
</label>
```

Key changes:
- `<button>` becomes `<label [for]="tab.tabName()">`
- Add `tabindex="0"` (labels aren't keyboard-focusable by default)
- Add `role="tab"` (preserved from button)
- Add `(keydown)` handler for Enter/Space
- The `(click)` handler calls `event.preventDefault()` to prevent the label from natively toggling the radio when JS is active

### 3. Update click handler to prevent default

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

### 4. Active tab header styling in noscript mode

**Challenge:** The tab header labels and the radio inputs are in different parts of the DOM. CSS has no selector for "label whose associated `for` input is `:checked`." We need a way to style the active tab header purely with CSS.

**Solution:** Use CSS `:has()` with `:nth-child` matching via an SCSS loop.

The rendered DOM structure in noscript mode is:
```
<bs-tab-control>
  <div class="tsc">              <!-- tab strip container -->
    <ul class="nav nav-tabs">
      <li class="nav-item">...</li>   <!-- nth-child(1) -->
      <li class="nav-item">...</li>   <!-- nth-child(2) -->
    </ul>
  </div>
  <div class="tab-content noscript">
    <bs-tab-page>                      <!-- nth-child(1) -->
      <input type="radio" checked>
      <div class="tab-page-content">
    </bs-tab-page>
    <bs-tab-page>                      <!-- nth-child(2) -->
      <input type="radio">
      <div class="tab-page-content">
    </bs-tab-page>
  </div>
</bs-tab-control>
```

Since the nth-child position of `<li>` in the header matches the nth-child position of `<bs-tab-page>` in the content, we can write:

```scss
@for $i from 1 through 20 {
  :host:has(.tab-content.noscript > bs-tab-page:nth-child(#{$i}) > input:checked) {
    .nav-item:nth-child(#{$i}) .nav-link {
      color: var(--bs-nav-tabs-link-active-color);
      background-color: var(--bs-nav-tabs-link-active-bg);
      border-color: var(--bs-nav-tabs-link-active-border-color);
    }
  }
}
```

This generates 20 rules (supporting up to 20 tabs) that check which `bs-tab-page` has a checked radio and applies Bootstrap's active tab styles to the corresponding header.

**Note on `:has()` support:** Supported in Chrome 105+, Firefox 121+, Safari 15.4+, Edge 105+. Browsers without `:has()` still get functional tab switching (content is visible), they just won't see the active header highlight. This is an acceptable progressive enhancement.

**Note on Angular encapsulation:** The `:host:has()` selector needs to reach into projected content (`bs-tab-page` children). Since `bs-tab-page` elements are projected via `<ng-content>`, Angular's emulated view encapsulation may add `_ngcontent` attributes that prevent matching. If this happens during implementation, solutions include:
- Using `ViewEncapsulation.None` on `bs-tab-control` (the component already uses `::ng-deep` extensively)
- Or wrapping the `:has()` rules inside `:host ::ng-deep`

### 5. Disabled tab handling

For disabled tabs in noscript mode, the radio input should include `[disabled]="disabled()"`. Disabled radio inputs cannot be checked by labels, so clicking a disabled tab's header label will have no effect.

### 6. Border styling in noscript mode

The existing rule in `tab-control.component.scss` already handles noscript borders:
```scss
.tab-content.noscript::ng-deep > bs-tab-page > .tab-page-content {
    border: var(--bs-border-width) var(--bs-border-style) var(--bs-border-color) !important;
    margin-top: -1px;
}
```

This remains unchanged.

## Web Component Alternative (Not Recommended)

The user suggested a web component wrapper as an option. A web component with shadow DOM would allow full control over the DOM structure, eliminating the `:has()` + `:nth-child` workaround for header styling.

**Reasons not to pursue this:**
1. The `:has()` approach is simpler and has sufficient browser support
2. A web component would require rearchitecting how content projection works (Angular `<ng-content>` vs web component `<slot>`)
3. The existing accordion and carousel patterns work without web components
4. Shadow DOM styling is harder to theme/customize
5. The complexity cost outweighs the benefit

If `:has()` + Angular encapsulation turns out to be unworkable during implementation, the web component approach can be revisited.

## Implementation Checklist

### Files to modify:

1. **`tab-page.component.html`** -- Add `<input type="radio">` before `.tab-page-content`
2. **`tab-page.component.ts`** -- Import `BsNoNoscriptDirective`
3. **`tab-control.component.html`** -- Change `<button>` to `<label>` in both top and bottom tab strips
4. **`tab-control.component.ts`** -- Update `setActiveTab()` to accept event and call `preventDefault()`, add `headerKeydown()` method
5. **`tab-control.component.scss`** -- Add `:host:has()` SCSS loop for noscript active header styling

### Files unchanged:
- `tab-page.component.scss` -- Already has the `:checked + .tab-page-content` rule
- `tab-page-header.directive.ts` -- No changes needed
- `tabs-position.ts` -- No changes needed

## How It Works

### With JavaScript (normal mode)
1. User clicks a `<label>` tab header
2. `(click)` handler calls `event.preventDefault()` -- prevents the label from natively toggling the hidden radio
3. `setActiveTab()` updates the `activeTab` signal
4. Angular's `[class.d-block]` binding shows the active tab page
5. `[class.active]` binding highlights the active tab header
6. `[checked]` binding keeps the hidden radio in sync (for consistency)

### Without JavaScript (noscript/SSR mode)
1. `BsNoNoscriptDirective` adds `.noscript` class to `.tab-content` div and radio inputs during SSR
2. CSS `input[type="radio"].noscript:checked + .tab-page-content { display: block }` shows the first tab (which has `checked` attribute)
3. User clicks a `<label>` tab header -- browser natively checks the associated radio via `[for]`/`[id]` link
4. CSS `:checked` selector shows the newly checked tab's content, hides the previous one (radios are mutually exclusive via shared `[name]`)
5. CSS `:host:has()` rule highlights the active tab header

## Testing

- Verify tab switching works with JavaScript enabled (no regression)
- Verify first tab is visible when page loads without JavaScript
- Verify clicking tab headers switches tabs without JavaScript
- Verify disabled tabs cannot be activated without JavaScript
- Verify active tab header styling in noscript mode (in browsers supporting `:has()`)
- Verify both top and bottom tab positions work
- Verify drag-drop still works with labels (CDK drag on `<li>`, not `<label>`)
- Verify keyboard navigation (Tab, Enter, Space) works
- Verify ARIA attributes are correct

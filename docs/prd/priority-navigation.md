# PRD: Priority Navigation

Tracking issue: [#196 — Priority Navigation](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/196)

## Problem

Horizontal navigation bars and toolbars often contain more items than fit in the available width on small or narrow viewports. The two common workarounds are both poor UX:

- **Hide everything behind a hamburger.** Wastes horizontal space when most items would have fit. Hides the most-used links unnecessarily.
- **Wrap to a second row.** Disrupts layout, doubles the navbar height, and hurts vertical density on dense pages.

The **priority navigation** pattern (a.k.a. *greedy nav*, *progressively-collapsing menu*) solves this: as many items as possible stay visible inline; the rest move into a "More ▾" overflow menu. As the container shrinks, lower-priority items move into the overflow first; as it grows, they move back out.

The library already ships a JS-driven `bs-navbar` with a single small-mode breakpoint, but it has no concept of *individual item priority* and no pattern for "fit as many as possible". It is also strictly all-or-nothing — there is no progressive collapse.

## Goal

Ship a **generic, content-projection-based** `bs-priority-nav` component that:

1. Works as a container for arbitrary items — links, buttons, labels, even nested dropdowns.
2. Hides lower-priority items into a "More" overlay as soon as they would overflow, and restores them when there is room again.
3. **Stays functional with JavaScript disabled** (noscript / SSR-only browsers / hardened environments) using the same `<input>` + `<label>` + CSS-only pattern already proven by `bs-carousel`, `bs-tab-control`, and `bs-accordion`.
4. Adds an "Advanced → Priority navigation" demo page in `apps/ng-bootstrap-demo` that exercises the JS path *and* the noscript fallback side-by-side.

Non-goal: replace `bs-navbar`. Priority nav is a smaller, more focused primitive that *can* be used inside a navbar but is also useful for toolbars, breadcrumb trails, tab strips, action bars, etc.

## Reference Patterns Already in the Repo

| Pattern | Location | What we reuse |
|---|---|---|
| Dual-branch SSR template (`@if (isServerSide)`) | `libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.html:1` | Same shape for the noscript fallback branch |
| `bsNoNoscript` directive (sets `.noscript` class on server only) | `libs/mintplayer-ng-bootstrap/no-noscript/src/no-noscript/no-noscript.directive.ts:1` | Marks inputs whose CSS-only behavior is gated on `.noscript` |
| `<input type="radio/checkbox">` + `<label [for]>` + `:checked` siblings | `carousel.component.html:7-32`, `tab-control.component.html` (per `docs/prd/tab-control-noscript.md`) | "More" toggle without JS |
| `isPlatformServer(PLATFORM_ID)` for SSR detection | `carousel.component.ts:30,34` | Same |
| `contentChildren()` + signal `forwardRef` for child registration | `carousel.component.ts:36` | Item registration |
| `BsObserveSizeDirective` (`bsObserveSize`, exports as `bsObserveSize`) | `libs/mintplayer-ng-swiper/observe-size/src/observe-size.directive.ts:1` | Container width measurement in JS mode — exposes `size`, `width`, `height` signals; SSR-safe; cleans up its own observer |

## Public API

### Container — `<bs-priority-nav>`

```html
<bs-priority-nav
    [moreLabel]="'More'"
    [moreLabelTemplate]="moreTpl"
    [collapseAt]="null"
    [overflowFrom]="'end'"
    [hideEmptyMore]="true"
    (overflowChange)="onOverflowChange($event)">
    ...items...
</bs-priority-nav>
```

| Input | Type | Default | Purpose |
|---|---|---|---|
| `moreLabel` | `string` | `'More'` | Text on the overflow toggle. Ignored when `moreLabelTemplate` is set. |
| `moreLabelTemplate` | `TemplateRef<{ $implicit: boolean }> \| null` | `null` | Template for the overflow toggle. Implicit context is the open/closed state. |
| `collapseAt` | `Breakpoint \| null` | `null` | When set (e.g. `'sm'`), at this breakpoint and below **all** items collapse to the More menu regardless of measured width. Mirrors `bs-navbar.breakpoint`. |
| `overflowFrom` | `'end' \| 'start'` | `'end'` | Which side gives way first when space runs out. `'end'` = last item moves to More first. |
| `hideEmptyMore` | `boolean` | `true` | Hide the "More" toggle when no items overflow. |

| Output | Type | Fires when |
|---|---|---|
| `overflowChange` | `EventEmitter<BsPriorityNavItemDirective[]>` | The set of overflowing items changes. Useful for analytics or syncing external UI. |

### Item — `<bs-priority-nav-item>` (component, content-projecting)

```html
<bs-priority-nav-item [priority]="1" [hideBelow]="'md'">
    <a [routerLink]="['/home']">Home</a>
</bs-priority-nav-item>
```

| Input | Type | Default | Purpose |
|---|---|---|---|
| `priority` | `number` | declaration order (last-declared = first to overflow) | Order in which items move into the More menu. **Lower number = more important, stays visible longer.** Items without a priority are treated as least important and overflow before any prioritized item. Items with equal priority follow declaration order. |
| `hideBelow` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xxl' \| null` | `null` | **Noscript-only hint.** At this breakpoint and below, the item is hidden from the inline strip and shown only via the More menu. Ignored when JS is active (measured width wins). |

The item exposes a single `<ng-content>` slot. Whatever the consumer puts inside is what is rendered — anchors, buttons, dropdowns, even arbitrary HTML. This is the "as generic as possible" requirement.

## Behavior — JS Mode (the happy path)

1. The inline strip's wrapper element carries `bsObserveSize` (`#sizeObserver="bsObserveSize"`). Its `width` signal feeds a `computed` that recalculates the overflow set whenever the container resizes — no manual `ResizeObserver` wiring, no `throttleDelay` plumbing inside the component (the directive already handles SSR-safety and cleanup).
2. The recalc walks items in priority order from highest to lowest, summing widths plus a running reservation for the More toggle. The first item whose accumulated width would exceed the container becomes the **overflow boundary**. That item and every lower-priority item are marked overflowing.
3. Per-item width changes (lazy text, async data, font swap) — give each `bs-priority-nav-item` its own `bsObserveSize` and read `width()` from the parent's `computed`. Same primitive, same signal API.
4. Items are not actually relocated in the DOM. The component renders **two copies** of each item:
   - One in the inline strip with `[class.priority-nav-hidden]` toggled.
   - One inside the More overlay with `[class.priority-nav-overflow-hidden]` toggled.
   The hidden copy is `display: none`. This avoids breaking content-projection inputs/outputs that would die under DOM moves, and makes the noscript path almost identical to the JS path (see below).
3. The More toggle is a `<button bsDropdownToggle>` opening a `bs-dropdown-menu` rendering the overflow copies. Reuses the existing `dropdown` library rather than rolling a custom overlay.
4. `(overflowChange)` fires whenever the visibility set changes.

### Edge cases

- **Container is zero-width during SSR** → `bsObserveSize` already noops on the server (`isPlatformServer` guard at `observe-size.directive.ts:16`). The `computed` overflow signal sees `width() === undefined` and falls back to "show all items inline"; the recalc fires naturally on hydration when the directive's `ngAfterViewInit` sets the initial `size`.
- **Nested dropdowns inside an item** → not measured separately; the item's natural width includes its toggle but not its open menu (which is portaled).
- **`collapseAt` matches** → skip measurement entirely, set every item to overflow.
- **Overflow toggle itself overflows on tiny viewports** → it has `flex-shrink: 0` and is allowed to truncate its label via CSS, but is never moved into itself.

## Behavior — Noscript Mode (the fallback)

The fundamental constraint: without JS we cannot measure the container or the items. The fallback therefore replaces *measured* overflow with *declared* overflow via the `hideBelow` input plus media queries.

### Rendering shape (SSR + noscript)

```html
<div class="priority-nav noscript" bsNoNoscript>
    <input type="checkbox" id="pn-{{uid}}-more" class="d-none" bsNoNoscript>

    <ul class="priority-nav-inline">
        <li class="priority-nav-item priority-nav-item-hide-below-md">
            <a [routerLink]="['/home']">Home</a>
        </li>
        <li class="priority-nav-item priority-nav-item-hide-below-lg">
            <a [routerLink]="['/products']">Products</a>
        </li>
        ...
    </ul>

    <label [for]="'pn-' + uid + '-more'" class="priority-nav-more-toggle" role="button" tabindex="0">
        More <span class="caret"></span>
    </label>

    <div class="priority-nav-overflow">
        <ul>
            <li class="priority-nav-item priority-nav-item-show-below-md">
                <a [routerLink]="['/home']">Home</a>
            </li>
            ...
        </ul>
    </div>
</div>
```

### CSS rules (in `priority-nav.component.scss`)

```scss
:host ::ng-deep {
    .priority-nav.noscript {
        // Inline strip: hide items at-or-below their breakpoint
        .priority-nav-item-hide-below-sm  { @media (max-width: 575.98px)  { display: none !important; } }
        .priority-nav-item-hide-below-md  { @media (max-width: 767.98px)  { display: none !important; } }
        .priority-nav-item-hide-below-lg  { @media (max-width: 991.98px)  { display: none !important; } }
        .priority-nav-item-hide-below-xl  { @media (max-width: 1199.98px) { display: none !important; } }
        .priority-nav-item-hide-below-xxl { @media (max-width: 1399.98px) { display: none !important; } }

        // Overflow menu: only show items that ARE hidden inline at the current width
        .priority-nav-overflow .priority-nav-item-show-below-sm  { display: none; @media (max-width: 575.98px)  { display: block; } }
        .priority-nav-overflow .priority-nav-item-show-below-md  { display: none; @media (max-width: 767.98px)  { display: block; } }
        // ...etc

        // CSS-only "More" toggle
        .priority-nav-overflow { display: none; }
        input.noscript:checked ~ .priority-nav-overflow { display: block; }
    }
}
```

The `:host-context` plus `.noscript` class gates these rules so they don't fight the JS path (which uses `[class.priority-nav-hidden]` instead).

### Noscript flow

1. Page loads. SSR HTML is the dual-render shape above. `bsNoNoscript` puts `.noscript` on both the host and the checkbox.
2. The browser applies media queries → low-priority items hidden inline; their twins in `.priority-nav-overflow` are display-block-eligible.
3. User clicks the **`<label for="pn-…-more">`** — browser natively toggles the hidden checkbox.
4. Sibling selector `input.noscript:checked ~ .priority-nav-overflow { display: block; }` reveals the overflow menu.
5. User clicks an item → native link navigation works, no JS needed.

### Hydration handoff

When the JS bundle takes over:

1. The `BsPriorityNavComponent` constructor checks `isPlatformServer` → on the client it removes the `.noscript` class on the host.
2. CSS rules under `.priority-nav.noscript` stop applying.
3. The component starts measuring and toggling `[class.priority-nav-hidden]` instead.
4. The hidden checkbox is repurposed: clicking the More label now goes through Angular's `(click)` handler (with `event.preventDefault()`) and toggles a signal-driven dropdown, just like `bs-tab-control` does in its noscript handoff.

## Demo Page — `Advanced → Priority navigation`

### Files

- `apps/ng-bootstrap-demo/src/app/pages/advanced/priority-nav/priority-nav.component.ts`
- `apps/ng-bootstrap-demo/src/app/pages/advanced/priority-nav/priority-nav.component.html`
- `apps/ng-bootstrap-demo/src/app/pages/advanced/priority-nav/priority-nav.component.scss`
- `apps/ng-bootstrap-demo/src/app/pages/advanced/priority-nav/priority-nav.component.spec.ts`

### Routing & menu registration

- Add to `apps/ng-bootstrap-demo/src/app/pages/advanced/advanced.routes.ts:32` (alphabetical position between `parallax` and `resizable` works):

  ```ts
  { path: 'priority-nav', loadComponent: () => import('./priority-nav/priority-nav.component').then(m => m.PriorityNavComponent) },
  ```

- Add a navbar entry to `apps/ng-bootstrap-demo/src/app/app.component.html:230` (next to `Parallax`):

  ```html
  <bs-navbar-item>
      <a [routerLink]='["/advanced", "priority-nav"]'>Priority navigation</a>
  </bs-navbar-item>
  ```

### Demo page content

Three sections, following the `bs-parallax` / `bs-dock` precedent (h1 + freeform sections):

1. **Default** — 8–10 items with mixed priorities, wrapped in a resizable container so the user can drag it narrower and watch items move into "More" in real time. Use `bs-resizable` from `apps/ng-bootstrap-demo/src/app/pages/advanced/resizable/`.
2. **With `collapseAt='sm'`** — same items, but at sm-and-below the whole strip becomes a hamburger-style More menu.
3. **Noscript demo** — embed an `<iframe srcdoc="...">` rendering the same nav with `<base href>` and `<noscript>` instructions, OR (simpler) include a paragraph with: *"Disable JS in DevTools and reload this page — the strip continues to work via media-query-driven hiding and a checkbox-based More toggle."* Plus a side-by-side static screenshot pair.

The demo component itself uses `BsPriorityNavComponent`, `BsPriorityNavItemComponent`, and a `BsResizableDirective` — no other imports needed.

## Library Files

```
libs/mintplayer-ng-bootstrap/priority-nav/
├── index.ts
├── ng-package.json
├── package.json
├── project.json
├── README.md
├── tsconfig.lib.json
├── tsconfig.lib.prod.json
├── tsconfig.spec.json
└── src/
    ├── index.ts
    ├── priority-nav/
    │   ├── priority-nav.component.ts
    │   ├── priority-nav.component.html
    │   ├── priority-nav.component.scss
    │   └── priority-nav.component.spec.ts
    └── priority-nav-item/
        ├── priority-nav-item.component.ts
        ├── priority-nav-item.component.html   (just `<ng-content></ng-content>`)
        ├── priority-nav-item.component.scss   (empty or minimal)
        └── priority-nav-item.component.spec.ts
```

Use the `libs/mintplayer-ng-bootstrap/carousel/` package as the structural template. Both `BsPriorityNavComponent` and `BsPriorityNavItemComponent` are standalone, OnPush, signal-based.

## Implementation Plan

### Step 1 — Scaffold the library package

Mirror the `carousel` package layout. Wire it into `tsconfig.base.json` paths and the workspace `nx.json` if needed.

### Step 2 — Implement `BsPriorityNavItemComponent`

Trivial: a standalone component with `@ng-content`, `priority` input (default `Infinity` so unset items are last to overflow), `hideBelow` input. Exposes its `ElementRef` for parent measurement.

### Step 3 — Implement `BsPriorityNavComponent` — noscript branch first

Build the SSR template. Verify that with JS disabled in the browser:
- Items above their `hideBelow` show inline.
- Items below their `hideBelow` show only inside the More overlay.
- The label/checkbox toggle reveals/hides the overlay.
- Clicking a link navigates.

### Step 4 — Implement the JS branch

- Inject `PLATFORM_ID`, set `isServerSide`.
- Apply `bsObserveSize` to the inline strip wrapper (`#stripSize="bsObserveSize"`) and to each `bs-priority-nav-item` host. Pull both into the parent component via `viewChild` / `contentChildren`.
- `computed` signal `overflowingItems` that reads `stripSize.width()` and each item's `width()`, walks items by priority, and returns the overflow set. No manual subscriptions; signal graph drives recompute.
- Bind `[class.priority-nav-hidden]` on inline copies and `[class.priority-nav-overflow-hidden]` on overflow copies.
- More toggle: button + click handler that flips an `isMoreOpen` signal; `(document:click)` to close on outside click.
- Emit `(overflowChange)` from an `effect` on `overflowingItems`.

### Step 5 — Demo page

Build the three sections described above. Verify in the dev server with throttling and viewport resizing.

### Step 6 — Tests

Per existing convention (`*.component.spec.ts` per component) — at minimum:
- Renders with no items.
- Renders with N items, all visible when container is wide.
- Items hide in priority order when container shrinks. Stub `BsObserveSizeDirective` the same way `sticky-footer.component.spec.ts:8-19` does — replace with a directive whose `width`/`height` signals can be set imperatively.
- `collapseAt='sm'` hides everything inline and shows everything in More.
- `bsNoNoscript` adds `.noscript` class during SSR.

## Out of Scope

- **Animated transitions** when items move between inline and More. Phase 2.
- **Drag-to-reorder priorities at runtime.** Not relevant to the use case.
- **Auto-priority based on item visit frequency** (the original "Greedy Nav" extension). Phase 2.
- **RTL-specific overflow direction.** `overflowFrom='start'` covers it conceptually but no special CSS.
- **Migrating `bs-navbar` to use priority nav internally.** Possible follow-up; tracked separately.
- **Keyboard shortcut** to open the More menu. Standard Tab navigation is enough for v1.

## Backward Compatibility

New library package. Zero risk to existing components. The new demo page is additive.

## Issues Uncovered During Browser Verification

Two layout bugs surfaced when exercising the demo at narrow viewports (≤500px). Both are fixed; documenting them here so the constraints behind the fixes don't get reintroduced.

### 1. Off-screen measure strip extended `document.scrollWidth`

**Symptom:** A horizontal scrollbar appeared at narrow viewports even though no visible content overflowed. Probing the DOM showed `.priority-nav-measure` (the off-screen strip used to read each item's natural width) sitting at `left: 0; top: -9999px` with content widening to ~688px on a 485px viewport, dragging `document.scrollWidth` past `clientWidth`.

**Root cause:** `top: -9999px` removes the element from the visible viewport but **does not** remove it from the document's scrollable bounds. The measure strip's full intrinsic width (sum of all items + their padding/gaps) was contributing to the page's horizontal scroll area.

**Fix:** Wrap the measure strip in a zero-size `overflow: hidden` clip box. The wrapper occupies no layout space and clips everything inside it from both visual rendering and `scrollWidth`/`scrollHeight` calculations. Items inside the strip still render at natural width — so `bsObserveSize` keeps reporting accurate widths — but they are now invisible to the document's scroll bounds.

```scss
.priority-nav-measure-wrapper {
    position: absolute;
    top: 0; left: 0;
    width: 0; height: 0;
    overflow: hidden;
    pointer-events: none;
}
.priority-nav-measure {
    visibility: hidden;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
}
```

**Constraint to preserve:** any future change to the measure strip must keep it inside the zero-size clip wrapper. Switching back to a bare `position: absolute; top: -9999px` will reintroduce the scrollbar.

### 2. `.demo-box { height: 100% }` made the second demo absurdly tall

**Symptom:** The `.demo-box` under `collapseAt='sm'` rendered at 790px tall while its inner `<bs-priority-nav>` was 40px. The first demo (wrapped in `<bs-resizable>`) looked fine.

**Root cause:** The demo SCSS had `.demo-box { height: 100% }`. The first demo's `.demo-box` is inside `<bs-resizable>` (which has `min-height: 2rem` and otherwise sizes to content), so 100% resolved to a small content-driven height. The second demo's `.demo-box` is a direct child of the page's flex layout, so 100% resolved to 100% of the available column height — ~790px.

**Fix:** Remove `height: 100%` from `.demo-box`. Both demos now size to their content. `<bs-resizable>` in inline mode (the default used by the first demo) only enforces `min-height: 2rem` — it does **not** require its child to fill it.

**Constraint to preserve:** the demo-box should not assume any specific height. If a future demo needs a fixed-height container (e.g. to demonstrate vertical resizing), it should set the height explicitly on that demo's wrapper, not on `.demo-box`.

## Open Questions

1. ~~Should `priority` default to declaration order (later items overflow first) or to `0` (all-equal, declaration order tiebreak)?~~ **Resolved:** unset priority means "least important, overflows first." Explicit numeric priorities use lower=more-important so `priority: 1` reads as "highest priority, stays visible." Tiebreaker by declaration order.
2. Should the noscript More overlay duplicate items (two DOM nodes per item) or use CSS `:has()` to retarget the same node? **Recommendation:** duplicate. `:has()` browser support is fine in 2026 but the markup gets harder to reason about, and JS mode benefits from the duplication too.
3. Should the More toggle support a custom-styled button via `[moreLabelTemplate]` even in noscript mode? **Yes** — the template projects into both the JS button and the noscript label; the directive doesn't care which element renders it.

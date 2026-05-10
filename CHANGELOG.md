# Changelog

All notable changes to `@mintplayer/ng-bootstrap` are documented here. The
package version aligns its major with the supported Angular major.

## [Unreleased]

### Added

- `@mintplayer/ng-bootstrap/scheduler`: keyboard grid navigation across day/week/timeline views. Cells expose `role="gridcell"` with roving tabindex and a deterministic id. Arrow keys walk cells (week: up/down = time, left/right = day; timeline: left/right = time, up/down = resource), Shift+Arrow extends a linear time-range selection that crosses day boundaries on week view, Home/End jump to the column extremes, Ctrl+Home/End to the view extremes, PageUp/PageDown advance one period. Enter on a cell or selection emits `event-create` with the same payload mouse drag-create produces. Every event is in the Tab order; Enter on a focused event enters move-mode (`aria-pressed="true"`), where Arrow keys nudge time/resource, Shift+Arrow resizes the end edge (Alt+Shift the start edge), week-view Shift+ArrowLeft/Right resizes across day boundaries, Enter commits, Escape reverts. The focused cell and the move-mode preview auto-scroll into the viewport. Live-region announcements narrate each transition. See `docs/prd/scheduler-keyboard-grid-nav.md`.
- `@mintplayer/ng-bootstrap/navbar`: `BsNavbarTriggerDirective` (`[bsNavbarTrigger]`) for dropdown trigger anchors. Replaces `routerLink` + `routerLinkActive` on triggers — drives the active CSS class via `Router.events` without RouterLink's programmatic-navigate behaviour. Use `routerLink` on the items INSIDE the dropdown for actual navigation; use `bsNavbarTrigger` on the trigger anchor that opens the dropdown.
- `@mintplayer/ng-bootstrap/navigation-lock`: `provideNavigationLockRouter(routes, ...features)` — single-call router setup that wraps your routes in the required `canMatch: [bsNavigationLockGuard]` and applies `canceledNavigationResolution: 'computed'`. Use in place of `provideRouter(...)` to avoid having to remember both pieces.
- `@mintplayer/ng-bootstrap/tile-manager`: new package. `<bs-tile-manager>` + `<bs-tile>` + `<bs-tile-header>` for dashboard-style grids of self-similar tiles users can drag, resize, and rearrange. Tiles push neighbours out of the way with vertical-compact gravity in real time; the layout serializes to a stable typed `TileLayoutSnapshot` you can persist and restore by re-binding `[(position)]` per tile. Header-only drag by default; touch arms via 600 ms long-press (mirrors `BsDock`); `prefers-reduced-motion: reduce` bypasses the FLIP animator. Architecture mirrors `BsDock`: a Lit web component (`<mp-tile-manager>`) owns gesture mechanics, the packer, FLIP animations, keyboard mode, and shadow-DOM rendering; the Angular wrappers marshal inputs and re-emit custom events as Angular outputs. See `docs/prd/tile-manager.md`.

### Breaking

- **Scheduler keyboard model rewrite** (see `docs/prd/scheduler-keyboard-grid-nav.md`).
  - `event-click` custom event renamed to `event-selected`. Fires on mouse click and on keyboard Tab landing on an event ("click" no longer described the trigger). `event-dblclick` is unchanged. Migrate listeners; no shim provided.
  - `BsSchedulerComponent`: Angular output `(eventClick)` → `(eventSelected)`; type `SchedulerEventClickEvent` → `SchedulerEventSelectedEvent`. Type `EventClickDetail` (scheduler-core) → `EventSelectedDetail`.
  - Move-mode entry key: `M` on a focused event is removed. Press `Enter` on the focused event instead.
  - Bare letter shortcuts `T` / `Y` / `M` / `W` / `D` are removed. Use `Alt+T` (today) / `Alt+Y` (year) / `Alt+M` (month) / `Alt+W` (week) / `Alt+D` (day). Frees single letters for future input surfaces inside the scheduler.
  - Bare `ArrowLeft` / `ArrowRight` no longer navigate periods (they now walk cells inside the grid). Use `PageUp` / `PageDown` for previous/next period. Header prev/next buttons still work.
  - Events lose their roving tabindex — every event is now `tabindex="0"` so Tab walks through them in document order.

- **Navigation-lock redesign** (#169, see `docs/prd/navigation-lock-redesign.md`).
  The opt-in directive + per-route guard pair is replaced by a global
  `CanActivateChild` guard backed by a registry service. Migration:

  1. Drop `canDeactivate: [BsNavigationLockGuard]` from any route definition.
  2. Drop `implements BsHasNavigationLock` and any
     `viewChild.required<BsNavigationLockDirective>('navigationLock')` from
     your page component.
  3. Drop the `#navigationLock="bsNavigationLock"` template ref unless you
     use it for your own logic.
  4. Move `[bsNavigationLock]` from an empty `<ng-container>` onto a
     meaningful element (the `<form>`).
  5. Replace your `provideRouter(routes, ...features)` call with
     `provideNavigationLockRouter(routes, ...features)`. The helper wraps
     your routes in the required `canMatch: [bsNavigationLockGuard]` and
     applies `withRouterConfig({ canceledNavigationResolution: 'computed' })`
     (needed for popstate-cancel to restore the history stack).

     If your router setup is too custom for the helper, wire it manually:
     wrap your top-level routes in
     `{ path: '', canMatch: [bsNavigationLockGuard], children: [...] }`
     (use **`canMatch`**, not `canActivateChild` — `canActivateChild` fires
     once per descendant activation, so deep destinations would prompt N
     times) and add
     `withRouterConfig({ canceledNavigationResolution: 'computed' })` to
     your `provideRouter(...)` call.

  API delta:
  - REMOVED: `BsNavigationLockGuard` (class), `BsHasNavigationLock`
    (interface).
  - ADDED: `bsNavigationLockGuard` (functional `CanMatchFn`),
    `BsNavigationLockService`, `BsNavigationLockHandle`,
    `BS_NAVIGATION_LOCK_CONFIRM`, `provideNavigationLock`,
    `provideNavigationLockRouter`.
  - CHANGED: `BsNavigationLockDirective.requestCanExit()` returns
    `boolean | Promise<boolean> | Observable<boolean>` (was
    `Promise<boolean>`); the `canExit` function-shape input now accepts an
    optional `reason: string` argument.

  Note: `canMatch` returns false to indicate non-match; if your app has a
  wildcard `**` route the navigation may fall through there instead of
  staying put. If that's a concern, also apply `bsNavigationLockGuard` to
  the wildcard route.

## [21.18.0] — 2026-04-27

### Breaking

- `BsSearchboxComponent.suggestionTemplate`, `.enterSearchtermTemplate`, and
  `.noResultsTemplate` are now `WritableSignal<TemplateRef<…> | undefined>`.
  Code that wrote `component.suggestionTemplate = ref` (or either of the
  others) must call `.set(ref)`. The `BsSuggestionTemplateDirective`,
  `BsEnterSearchTermTemplateDirective`, and `BsNoResultsTemplateDirective`
  do this transparently — only direct assignments to the fields are
  affected.
- `BsCarouselComponent.imageCounter` is now a `WritableSignal<number>`.
  `BsCarouselImageDirective` reads it via `imageCounter()` and updates
  via `.update(c => c + 1)`, preserving the original post-increment
  semantics (each image still gets a unique sequential `id`). External
  code that read or wrote the field directly must adopt the same pattern.
- `BsCarouselComponent.animationsDisabled` is now a `WritableSignal<boolean>`.
  Read access changes from `cmp.animationsDisabled` to
  `cmp.animationsDisabled()`. The host binding `'[@.disabled]'` was
  updated to `'animationsDisabled()'` accordingly. No external writers
  exist in the repo.

## [21.17.0] — 2026-04-27

### Breaking

- `BsSelect2Component.itemTemplate` and `BsSelect2Component.suggestionTemplate`
  are now `WritableSignal<TemplateRef<T> | undefined>`. Code that wrote
  `component.itemTemplate = ref` or `component.suggestionTemplate = ref` must
  call `.set(ref)`. The `BsItemTemplateDirective` and
  `BsSuggestionTemplateDirective` do this transparently — only direct
  assignments to the fields are affected.

### Fixed

- `BsSuggestionTemplateDirective`'s spec mock declared `itemTemplate`
  (a copy-paste from the item-template spec) instead of
  `suggestionTemplate`. Plain assignment masked the bug at runtime; the
  signal migration surfaced it. Now declares `suggestionTemplate`.

## [21.16.0] — 2026-04-27

### Breaking

- `BsFileUploadComponent.fileTemplate` is now a
  `WritableSignal<TemplateRef<FileUpload> | undefined>`. Code that wrote
  `component.fileTemplate = ref` must now call
  `component.fileTemplate.set(ref)`. The `BsFileUploadTemplateDirective` does
  this transparently — only direct assignments to the field are affected.

## [21.15.0] — 2026-04-27

### Breaking

- `BsNavbarItemComponent.hasDropdown` is now a `Signal<boolean>` derived from
  `dropdowns()` (a `computed`, not a `WritableSignal`). Read access changes
  from `cmp.hasDropdown` to `cmp.hasDropdown()`. Code that wrote to
  `hasDropdown` should drop the write — the value is now derived
  automatically. The previous manual update in
  `DropdownToggleDirective.ngAfterContentInit` has been removed.
- `BsSignaturePadComponent.isDrawing` is now a `WritableSignal<boolean>`. Read
  access changes from `cmp.isDrawing` to `cmp.isDrawing()`. No external
  writers exist in the repo.

### Fixed

- `BsNavbarDropdownComponent` now disposes its `OverlayRef` in `ngOnDestroy`.
  Previously the overlay (and any attached DOM portal) leaked when the
  component was destroyed.
- `BsSignaturePadComponent.onPointerEnd` no longer keeps `isDrawing` stuck at
  `true` when `context` is unavailable. The flag was set unconditionally in
  `onPointerStart` but only reset when `context` was non-null, leaving the
  pad in an inconsistent "still drawing" state under SSR/getContext failure.

### Internal

- Added `readonly` to fields that are initialized once and never reassigned
  across the carousel, datepicker, file-upload, spinner, timepicker, select2,
  signature-pad, and typeahead components. No public API change.
- Converted the private boolean flags `isAttached` and `isDestroyed`
  (`BsNavbarDropdownComponent`) and `isPointerDown` (`BsColorWheelComponent`)
  to signals. These fields are `private`, so no external API change.

## [21.14.0] — 2026-04-26

### Removed

- **Breaking:** `provideAsyncHostBindings()` and `BsBindEventPlugin` (the
  `async-host-binding` lib entry). The plugin relied on `NgZone.onStable`,
  which no longer reflects app stability under
  `provideZonelessChangeDetection()`. Use signal-based host bindings instead
  (`host: { '[prop]': 'mySignal()' }`) and wrap RxJS observables with
  `toSignal()` from `@angular/core/rxjs-interop`. The demo page
  `/advanced/async-host-binding` shows both patterns.

### Other

- Library now operates fully zoneless. zone.js is no longer pulled in
  transitively or required at runtime.
- Migrated remaining template-bound plain class fields to Angular signals
  (`BsDatatableComponent.rowTemplate`, `BsVirtualDatatableComponent.rowTemplate`,
  `BsTimepickerComponent.presetTimestamps`).
- Migrated the last `@Input()` decorators (`BsDatatableColumnDirective`) to
  the signal-based `input()` API.
- Bumped `ng-mocks` peer to `^14.15.2`.

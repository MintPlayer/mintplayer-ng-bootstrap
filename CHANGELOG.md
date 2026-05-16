# Changelog

All notable changes to `@mintplayer/ng-bootstrap` are documented here. The
package version aligns its major with the supported Angular major.

## [Unreleased]

### Added

- `@mintplayer/ng-bootstrap/file-manager`: new package. `<bs-file-manager>` + `<mp-file-manager>` provide a Syncfusion-style file-browser composing `mp-splitter` + `mp-treeview` (with `hide-borders`) + `mp-datatable`. v1 ships: tree + grid + breadcrumb navigation, single/multi selection (Ctrl/Shift modifiers), file operations (rename via F2, delete via Del, new folder via Ctrl+Shift+N, cut/copy/paste via Ctrl+X/C/V), search, sort, list/icons view-mode toggle, and an OS file-drop overlay (`[allowUpload]`) that emits an `(uploadRequest)` event with `File[]` + target folder. Consumer mutates `[nodes]` in response to `(operation)` events — the component never self-mutates. See issue #329.
- `@mintplayer/ng-bootstrap/web-components/treeview`: new Lit web component (`<mp-treeview>`). Data-driven `TreeNode[]` model, recursive rendering, ARIA tree pattern with roving tabindex, keyboard nav (arrow keys + Home/End/Enter/Space), `hide-borders` attribute, `iconResolver` for `iconKey` → SVG, and a `nodeRenderer` callback (Angular wrapper exposes this as the `*bsTreeviewNode` structural directive).
- `@mintplayer/ng-bootstrap/web-components/datatable`: new Lit web component (`<mp-datatable>`). Property-driven columns with `cellRenderer` callbacks, multi-column sort via shift+click, single/multi selection (range-extend on shift, additive on ctrl), row click/dblclick/contextmenu events, pointer-driven resizable columns, pagination footer, built-in scroll-position-driven virtual scroll (`virtualScroll` + `itemSize`), and a `rowRenderer` callback (Angular wrapper bridges `*bsRowTemplate` into this). ARIA `role="grid"`. Pure helpers `computeNextSort(current, columnName, shiftKey)` + `sortRows(rows, sortColumns)` exported for reuse.
- `@mintplayer/ng-bootstrap/web-components/file-manager`: new Lit web component (`<mp-file-manager>`) implementing the file-manager listed above, including a right-click context menu and `ContextMenu` / `Shift+F10` keyboard equivalents.
- `@mintplayer/ng-bootstrap/web-components/pagination`: new Lit web component (`<mp-pagination>`). Mirrors the existing `bs-pagination` API (`pageNumbers`, `selectedPageNumber`, `numberOfBoxes`, `showArrows`, `size`, `aria-label`) and is now what `bs-pagination` renders under the hood. Responsive: when `number-of-boxes` would exceed the available width, the WC clamps to whatever fits the host, so the same pagination renders correctly on both mobile and desktop without consumer-side breakpoints. Pure helper `buildPaginationItems(pages, current, budget)` exported for reuse. `bs-pagination` itself remains source-compatible.
- `@mintplayer/ng-bootstrap/datatable`: `[fetch]` now drives the WC's built-in pagination footer (powered by `<mp-pagination>`) — previously the footer was suppressed in fetch mode. The wrapper forwards `totalRecords` to the WC so page counts reflect the server total instead of the in-memory slice. Virtual scroll + `[fetch]` now preloads every page through the fetcher up front (in-memory virtualizer); the WC's scroll viewport falls back to `var(--mp-datatable-virtual-max-height, 480px)` so the table actually scrolls when the host isn't explicitly sized.

### Breaking

- **`@mintplayer/ng-bootstrap/treeview`**: `BsTreeviewItemComponent` removed; content-projected `<bs-treeview-item>` API replaced by data-driven `[items]: TreeNode[]` input. Custom per-node rendering is now provided via the new `*bsTreeviewNode` structural directive (with `$implicit: TreeNode` context). **Migration**: collect your treeview content into a nested `TreeNode` array (`{ id, label, iconKey?, children?, meta? }`) and bind `<bs-treeview [items]="treeNodes()">` with an inline `<ng-template bsTreeviewNode let-node>` rendering arbitrary content (icons, labels, badges). Two-way bindings `[(expandedIds)]` and `[(selectedIds)]` control state; `(nodeSelect)` / `(nodeExpand)` / `(nodeCollapse)` events replace per-item click handlers.
- **`@mintplayer/ng-bootstrap/datatable`**: column-projection contract changed. `*bsDatatableColumn` (header template + `bsDatatableColumnSortable`) and `*bsRowTemplate` (per-row `<td>` template) are preserved and now bridge into the new Lit web component (`<mp-datatable>`) via Angular `EmbeddedViewRef`s — the same pattern the query-builder uses to host Angular editors inside its Lit host. Programmatic `[columns]: DatatableColumnDef[]` with `cellRenderer` callbacks is also supported. **Migration**: existing template-directive consumers work unchanged; `DatatableSortBase`, `ColumnDef`, and `SyntheticColumn` are no longer exported (use the new `DatatableColumnDef<T>` type), and `computeNextSort` is exposed as a pure helper. The CDK virtual scroll implementation is replaced by a built-in scroll-position-driven virtualizer (no `@angular/cdk` peer dep); behaviour and `[virtualScroll]` / `[itemSize]` inputs are preserved.

- **`@mintplayer/ng-bootstrap/navbar`**: `BsNavbarComponent` has been modernized to align with Bootstrap 5.3's `data-bs-theme` pattern.
  - The component no longer emits the deprecated `.navbar-light` / `.navbar-dark` classes. It now writes `[data-bs-theme="light|dark"]` directly on the rendered `<nav>` element, and emits a `bg-{color}` utility class to set the background.
  - The `[color]` input has been widened from `Color | null` to `Color | string | null`. String values (e.g. `[color]="'body-tertiary'"`) emit a `bg-{value}` class and allow the page theme to cascade (no `data-bs-theme` override).
  - **Migration**: This change only affects consumers with custom CSS keyed off the deprecated `.navbar-light` / `.navbar-dark` classes (no such usage in this repo). See `docs/issue_324_navbar_modernize_PRD.md` for the full mapping table.

### Added

- `@mintplayer/ng-bootstrap/theming`: new package for managing Bootstrap color modes.
  - **`BsThemeService`**: a signal-first, SSR-safe service that owns the user's color-mode choice and writes the resolved value to `<html data-bs-theme>`.
  - **API**: `setMode('auto' | 'light' | 'dark' | string)`. Signals: `mode` (authored), `effectiveMode` (resolved).
  - **`auto` resolution**: resolves to `light` / `dark` via `matchMedia('(prefers-color-scheme: dark)')` and live-updates when the OS preference changes.
  - **Persistence**: persists to `localStorage` under `BS_THEME_STORAGE_KEY` (`'bs-theme-mode'`).
  - **Custom variants**: the string-typed mode admits user-defined themes — ship your own `[data-bs-theme="sepia"] { … }` block and call `setMode('sepia')`.
  - **SSR-safe**: no `localStorage` / `matchMedia` / DOM access on the server.
  - **No-flash reload**: pair with a tiny inline pre-boot `<script>` in `<head>` to apply the persisted mode before any CSS evaluates, preventing a light-mode flash on reload.
  - See `/additional-samples/theming` in the demo for the full recipe (build-time SCSS overrides, runtime `--bs-*` mutation, mode switching, per-component variable reference, custom variants, SSR integration).
- `@mintplayer/ng-bootstrap/scheduler`: keyboard grid navigation across day/week/timeline views. Cells expose `role="gridcell"` with roving tabindex and a deterministic id. Arrow keys walk cells (week: up/down = time, left/right = day; timeline: left/right = time, up/down = resource), Shift+Arrow extends a linear time-range selection that crosses day boundaries on week view, Home/End jump to the column extremes, Ctrl+Home/End to the view extremes, PageUp/PageDown advance one period. Enter on a cell or selection emits `event-create` with the same payload mouse drag-create produces. Every event is in the Tab order; Enter on a focused event enters move-mode (`aria-pressed="true"`), where Arrow keys nudge time/resource, Shift+Arrow resizes the end edge (Alt+Shift the start edge), week-view Shift+ArrowLeft/Right resizes across day boundaries, Enter commits, Escape reverts. The focused cell and the move-mode preview auto-scroll into the viewport. Live-region announcements narrate each transition. See `docs/prd/scheduler-keyboard-grid-nav.md`.
- `@mintplayer/ng-bootstrap/navbar`: `BsNavbarTriggerDirective` (`[bsNavbarTrigger]`) for dropdown trigger anchors. Replaces `routerLink` + `routerLinkActive` on triggers — drives the active CSS class via `Router.events` without RouterLink's programmatic-navigate behaviour. Use `routerLink` on the items INSIDE the dropdown for actual navigation; use `bsNavbarTrigger` on the trigger anchor that opens the dropdown.
- `@mintplayer/ng-bootstrap/navigation-lock`: `provideNavigationLockRouter(routes, ...features)` — single-call router setup that wraps your routes in the required `canMatch: [bsNavigationLockGuard]` and applies `canceledNavigationResolution: 'computed'`. Use in place of `provideRouter(...)` to avoid having to remember both pieces.
- `@mintplayer/ng-bootstrap/tile-manager`: new package. `<bs-tile-manager>` + `<bs-tile>` + `<bs-tile-header>` for dashboard-style grids of self-similar tiles users can drag, resize, and rearrange. Tiles push neighbours out of the way with vertical-compact gravity in real time; the layout serializes to a stable typed `TileLayoutSnapshot` you can persist and restore by re-binding `[(position)]` per tile. Header-only drag by default; touch arms via 600 ms long-press (mirrors `BsDock`); `prefers-reduced-motion: reduce` bypasses the FLIP animator. Architecture mirrors `BsDock`: a Lit web component (`<mp-tile-manager>`) owns gesture mechanics, the packer, FLIP animations, keyboard mode, and shadow-DOM rendering; the Angular wrappers marshal inputs and re-emit custom events as Angular outputs. See `docs/prd/tile-manager.md`.
- `@mintplayer/ng-bootstrap/checkbox`: new package. `<bs-checkbox>` exposes a narrowed `type` union (`'checkbox' | 'switch' | 'toggle_button'`) and a `[bsCheckboxGroup]` directive. Single-mode binds a `boolean`; multi-mode binds `string[]` via `[bsCheckboxGroup]` (the group carries the shared `[name]` with `[]` suffix auto-applied). Group resolution is "explicit `[group]` input wins over DI-injected ancestor", so non-adjacent layouts (e.g. one checkbox per table row) work via `#g="bsCheckboxGroup"` + `[group]="g"`. Implements `ControlValueAccessor` end-to-end for `[(ngModel)]` and `[formControl]`. ARIA host→input mirroring preserved. See `docs/prd/toggle-button-split.md`.
- `@mintplayer/ng-bootstrap/radio`: new package. `<bs-radio>` exposes a narrowed `type` union (`'radio' | 'toggle_button'`) and a `[bsRadioGroup]` directive. Radios participate in form binding only through the group: `[name]` lives only on `[bsRadioGroup]`, and `BsRadioValueAccessor` is hosted there too — `[formControl]` / `[(ngModel)]` bind on the group element and the form value is a single `string`. Same explicit-vs-ancestor `[group]` resolution as `<bs-checkbox>` for non-adjacent layouts. See `docs/prd/toggle-button-split.md`.

### Breaking

- **`<bs-toggle-button>` split into `<bs-checkbox>` and `<bs-radio>`** (see `docs/prd/toggle-button-split.md`). The single god-component that fronted five `type` values is replaced by two per-family components with narrowed type unions.

  Removed from `@mintplayer/ng-bootstrap/toggle-button`:
  - `BsToggleButtonValueAccessor`
  - `BsToggleButtonGroupDirective`
  - `BsCheckStyle` (type union)

  `BsToggleButtonComponent` survives at the same import path but is now a styling-wrapper-only component with no inputs and no behaviour. The wrapper carries the Bootstrap `form-check` SCSS via `:host ::ng-deep` and is consumed internally by `<bs-checkbox>` / `<bs-radio>` templates — consumers should not import it directly.

  Migration table:

  | Before | After |
  | --- | --- |
  | `<bs-toggle-button>` (default checkbox) | `<bs-checkbox>` |
  | `<bs-toggle-button type="checkbox">` | `<bs-checkbox type="checkbox">` |
  | `<bs-toggle-button type="switch">` | `<bs-checkbox type="switch">` |
  | `<bs-toggle-button type="toggle_button">` | `<bs-checkbox type="toggle_button">` |
  | `<bs-toggle-button type="radio">` | `<bs-radio>` inside `<div bsRadioGroup name="x">` |
  | `<bs-toggle-button type="radio_toggle_button">` | `<bs-radio type="toggle_button">` inside `<div bsRadioGroup name="x">` |
  | `[bsToggleButtonGroup]` (checkbox group) | `[bsCheckboxGroup]` (also gains a shared `[name]` input) |
  | `[bsToggleButtonGroup]` (radio group) | `[bsRadioGroup]` (carries the shared `[name]` input; per-radio `[name]` removed) |
  | `formControlName="x"` on every `<bs-toggle-button type="radio">` | `formControlName="x"` on the `[bsRadioGroup]` element (form value: single `string`) |
  | `formControlName="x"` on every grouped `<bs-toggle-button type="checkbox">` | `formControlName="x"` on the `[bsCheckboxGroup]` element (form value: `string[]`) |
  | `import { BsCheckStyle } from '@mintplayer/ng-bootstrap/toggle-button'` | `BsCheckboxType` from `/checkbox` or `BsRadioType` from `/radio` |

  Mode-aware `[name]` resolution:
  - Radio always-grouped: name on `[bsRadioGroup]` only.
  - Checkbox standalone (single-mode): name per-instance on `<bs-checkbox>`; binds `boolean`.
  - Checkbox grouped (multi-mode): name on `[bsCheckboxGroup]`, `[]` suffix auto-applied; per-instance `[name]` is ignored. Binds `string[]`.

  Demo routes: `/forms/toggle-button` is removed. Two new routes replace it: `/forms/checkbox` and `/forms/radio`, each demonstrating its type variants and group behaviour. No redirect.

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

### Fixed

- `@mintplayer/ng-bootstrap/dock` (#326): `renderIntersectionHandles` no longer pairs splitter dividers from different dock layers, so coincidental on-screen alignment between a docked splitter and a floating pane's splitter (or between two floating panes) no longer produces a phantom intersection grip between unrelated splitters.
- `@mintplayer/ng-bootstrap/datatable`: `<bs-datatable>` rows now span the full host width even when the sum of pinned column widths is narrower than the host. A trailing `.bs-datatable-spacer` cell (`aria-hidden`) is appended to every header and body row and absorbs the leftover under `table-layout: fixed`, so pinned widths stay frozen instead of being redistributed across data columns. The CSS pairs `width: max-content; min-width: 100%` on the table (the inverse order — `width: 100%; min-width: max-content` — triggers a layout loop with CDK's virtual-scroll content wrapper). The bs-table wrapper also gets an unconditional `overflow-x: auto` in resizable mode, so a table whose pinned widths exceed the host scrolls horizontally inside its own region instead of expanding the page body. The footer `<td colspan>` was bumped by 1 to span the spacer.

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

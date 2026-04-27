# Changelog

All notable changes to `@mintplayer/ng-bootstrap` are documented here. The
package version aligns its major with the supported Angular major.

## [Unreleased]

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

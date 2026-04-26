# Changelog

All notable changes to `@mintplayer/ng-bootstrap` are documented here. The
package version aligns its major with the supported Angular major.

## [Unreleased]

## [21.15.0] — 2026-04-27

### Breaking

- `BsNavbarItemComponent.hasDropdown` is now a `WritableSignal<boolean>`. The
  `DropdownToggleDirective` updates it internally; only code that wrote
  `navbarItem.hasDropdown = …` directly is affected.
- `BsSignaturePadComponent.isDrawing` is now a `WritableSignal<boolean>`. Read
  access changes from `cmp.isDrawing` to `cmp.isDrawing()`. No external
  writers exist in the repo.

### Fixed

- `BsNavbarDropdownComponent` now disposes its `OverlayRef` in `ngOnDestroy`.
  Previously the overlay (and any attached DOM portal) leaked when the
  component was destroyed.

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

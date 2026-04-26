# PRD: Signal Migration for Remaining Plain Class Fields (issue #280)

## Problem

The library is now zoneless (`provideZonelessChangeDetection()`). In zoneless mode, mutating a plain class field does **not** trigger change detection — only signal updates do. An audit in issue #280 catalogued 16 plain fields across 11 components that still rely on the old "field assignment + zone-tick" model. Most are not actively broken today (their templates re-render for unrelated reasons), but they are latent bugs and they violate the codebase's now-uniform signal-based reactivity model.

The two highest-risk fields (`datatable.rowTemplate` and `virtual-datatable.rowTemplate`) were already migrated in commit `36fcff31` as part of the zone.js removal. This PRD covers the remaining 14 fields.

## Goals

- Convert every plain mutable field whose value affects rendering or external observers into a signal.
- Mark every field that is initialized once and never reassigned as `readonly`.
- Land the work in small, reviewable PRs grouped by risk profile, not as one big bang.
- Keep the public TypeScript API of the library stable where possible. Where it must change (TemplateRef fields written by sibling directives), document the breaking change.

## Non-Goals

- No new component features.
- No reordering of fields, no rename, no API redesign beyond the signal conversion itself.
- No changes to fields outside the issue's enumeration. (The audit picked up other latent candidates — e.g. `BsCarouselImageDirective.itemTemplate`, `BsNavbarItemComponent.anchorTag` — they will land in a separate audit if at all.)

## Scope — Field Inventory

All 16 fields from issue #280, current state verified against the working tree on `master` at `0b193ea4`.

### Already done (in `36fcff31`)

| File | Field | Status |
|------|-------|--------|
| `datatable/src/datatable/datatable.component.ts:25` | `rowTemplate` | ✅ migrated |
| `virtual-datatable/src/virtual-datatable/virtual-datatable.component.ts:26` | `rowTemplate` | ✅ migrated |

### Category 1 — `colors = Color` enum refs (5 fields, all safe to `readonly`)

| File | Line | Verdict |
|------|------|---------|
| `carousel/src/carousel/carousel.component.ts` | 33 | safe — never reassigned |
| `datepicker/src/datepicker.component.ts` | 18 | safe — never reassigned |
| `file-upload/src/component/file-upload.component.ts` | 29 | safe — never reassigned |
| `spinner/src/spinner.component.ts` | 11 | safe — only read in `colorClass` computed |
| `timepicker/src/timepicker.component.ts` | 47 | safe — never reassigned |

### Category 2 — Mutable public state (4 fields)

| File:Line | Field | Reads | Writes | Migration shape |
|-----------|-------|-------|--------|-----------------|
| `carousel/src/carousel/carousel.component.ts:87` | `animationsDisabled` | host binding `'[@.disabled]': 'animationsDisabled'` (line 22) | none beyond init | `readonly … = signal(false)` — host expression becomes `'animationsDisabled()'`. See Pattern E. |
| `carousel/src/carousel/carousel.component.ts:255` | `imageCounter` | by `BsCarouselImageDirective` constructor: `this.id = this.carousel.imageCounter++` | the `++` itself | needs care — see "Post-increment migration" pattern below |
| `navbar/src/navbar-item/navbar-item.component.ts:25` | `hasDropdown` | line 63 (`if (this.hasDropdown)`) | line 50 (`this.hasDropdown = …`); also `dropdown-toggle.directive.ts:21` | straight `signal(false)` swap; one external writer |
| `signature-pad/src/component/signature-pad.component.ts:25` | `isDrawing` | lines 36, 59, 72 (event handler guards) | lines 44, 74 | straight `signal(false)` swap |

### Category 3 — TemplateRef fields written by sibling directives (6 fields across 3 components)

| Parent component | Field(s) | Writer directive(s) | Spec impact |
|------------------|----------|---------------------|-------------|
| `file-upload/src/component/file-upload.component.ts:31` | `fileTemplate` | `file-upload-template.directive.ts:13` | `file-upload-template.directive.spec.ts:64` (`.toBeDefined()` becomes `.fileTemplate()`) |
| `searchbox/src/searchbox/searchbox.component.ts:59-61` | `suggestionTemplate`, `enterSearchtermTemplate`, `noResultsTemplate` | `directives/suggestion.directive.ts:13`, `directives/enter-search-term.directive.ts:12`, `directives/no-results.directive.ts:12` | none — no spec asserts on these |
| `select2/src/component/select2.component.ts:48-49` | `itemTemplate`, `suggestionTemplate` | `directive/item-template/item-template.directive.ts:15`, `directive/suggestion-template/suggestion-template.directive.ts:13` | both directive specs declare `itemTemplate?: TemplateRef<any>` on a mock component (`item-template.directive.spec.ts:23`, `suggestion-template.directive.spec.ts:21`) — mocks must be updated to signals |

### Category 4 — Constants missing `readonly` (4 fields, all safe)

| File:Line | Field | Verdict |
|-----------|-------|---------|
| `carousel/src/carousel/carousel.component.ts:34` | `isServerSide` | safe — initialized once, only read |
| `select2/src/component/select2.component.ts:46` | `charWidth` (private) | safe — only read in `onProvideSuggestions` |
| `signature-pad/src/component/signature-pad.component.ts:24` | `minHeight` | safe — only used in host binding `[style.min-height.rem]` |
| `typeahead/src/typeahead.component.ts:21` | `listboxId` | safe — initialized from a counter, only read |

### Category 5 — Private boolean flags (3 fields)

These are not template-bound and therefore not strictly required for zoneless correctness. Kept in scope because they're trivial conversions and the audit recommends consistency.

| File:Line | Field | Reads | Writes |
|-----------|-------|-------|--------|
| `navbar/src/navbar-dropdown/navbar-dropdown.component.ts:28` | `isAttached` (private) | lines 112, 116 (inside `showInOverlay` setter) | lines 114, 118 |
| `navbar/src/navbar-dropdown/navbar-dropdown.component.ts:29` | `isDestroyed` (private) | line 83 (inside async `import().then()` callback) | line 107 (`ngOnDestroy`) |
| `color-picker/components/color-wheel/color-wheel.component.ts:34` | `isPointerDown` (private) | line 156 (`onPointerMove`) | lines 150, 168 |

## Migration Patterns

### Pattern A — `readonly` only (Cat 1 + Cat 4, 9 fields)

```ts
// before
colors = Color;

// after
readonly colors = Color;
```

No template, host binding, or callsite changes. Single-character edit per field.

### Pattern B — Plain mutable → `signal()` (Cat 2 + Cat 5, 7 fields)

```ts
// before
isDrawing = false;
…
this.isDrawing = true;
…
if (this.isDrawing) { … }

// after
readonly isDrawing = signal(false);
…
this.isDrawing.set(true);
…
if (this.isDrawing()) { … }
```

Add `signal` to the `@angular/core` import. Update every `this.foo = X` callsite to `.set(X)` and every `this.foo` read to `this.foo()`. Update template references and host bindings the same way.

### Pattern C — TemplateRef field written by sibling directive (Cat 3, 6 fields)

This is the same pattern that was already applied to `datatable.rowTemplate` and `virtual-datatable.rowTemplate` in commit `36fcff31`. Reference implementation:
- Parent: `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts`
- Writer: `libs/mintplayer-ng-bootstrap/datatable/src/row-template/row-template.directive.ts`
- Template: `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.html`

```ts
// parent component — before
foo?: TemplateRef<TContext>;

// parent component — after
readonly foo = signal<TemplateRef<TContext> | undefined>(undefined);
```

```ts
// sibling directive — before
this.parent.foo = this.templateRef;

// sibling directive — after
this.parent.foo.set(this.templateRef);
```

```html
<!-- template — before -->
@if (foo) { <ng-container *ngTemplateOutlet="foo; …"></ng-container> }

<!-- template — after -->
@if (foo()) { <ng-container *ngTemplateOutlet="foo()!; …"></ng-container> }
```

Note the `!` after `foo()` inside `*ngTemplateOutlet` — the outlet wants a non-null `TemplateRef`, and the `@if` already proved it's non-null, but TypeScript's narrowing doesn't carry across the signal call.

For nullish-coalesce patterns (`foo ?? defaultFoo`):

```html
<!-- before -->
*ngTemplateOutlet="foo ?? defaultFoo; context: …"

<!-- after -->
*ngTemplateOutlet="foo()! ?? defaultFoo; context: …"
```

The `!` is needed because `signal<X | undefined>` typing keeps `undefined` in the union; the `??` short-circuits at runtime, but the type system doesn't know that without help.

### Pattern D — Post-increment (only `imageCounter`)

`carousel-image.directive.ts:18` reads:

```ts
this.id = this.carousel.imageCounter++;
```

JS `x++` returns the **old** value, then increments. The signal equivalent:

```ts
const prev = this.carousel.imageCounter();
this.carousel.imageCounter.set(prev + 1);
this.id = prev;
```

Or with `.update`:

```ts
this.id = this.carousel.imageCounter();
this.carousel.imageCounter.update(c => c + 1);
```

Both produce the same `id` sequence the original code did. **Do not** write `this.id = prev + 1` — that shifts every image's `id` by 1.

### Pattern E — Animation `@.disabled` host binding (only `animationsDisabled`)

Currently:

```ts
host: { '[@.disabled]': 'animationsDisabled' }
```

After the field becomes a signal:

```ts
host: { '[@.disabled]': 'animationsDisabled()' }
```

Angular 21 evaluates host binding strings as template expressions, so a signal call binds reactively. The library targets Angular 21 only, so no fallback for older animation parsers is needed.

## Per-Component Migration Specs

For each component below, the lib build and lint must be green before the PR is opened. Specs listed are the ones the agent audit identified — running `nx test <project>` is sufficient to verify nothing else broke.

### `carousel` (3 fields, 1 directive, no specs in tree)

- `colors` → `readonly`
- `isServerSide` → `readonly`
- `animationsDisabled` → `signal(false)`; host binding string `'animationsDisabled'` → `'animationsDisabled()'`. **Manual smoke test required** (carousel page in demo, slide forward/back, observe transitions).
- `imageCounter` → `signal(1)`; update `BsCarouselImageDirective` constructor (line 18) per Pattern D.

Files touched: `carousel.component.ts`, `carousel-image.directive.ts`. No template change. No spec change (carousel has no `*.spec.ts`).

### `datepicker` (1 field)

- `colors` → `readonly`. Single-line edit.

### `file-upload` (3 fields, 1 directive, 1 spec)

- `colors` → `readonly`
- `fileTemplate` → `signal<TemplateRef<FileUpload> | undefined>(undefined)` per Pattern C.
  - Update `file-upload.component.html:10` (one `*ngTemplateOutlet` with `??`).
  - Update `file-upload-template.directive.ts:13` to `.set(templateRef)`.
  - Update `file-upload-template.directive.spec.ts:64` to `.fileTemplate()` in the assertion.

### `navbar-item` (1 field, 1 directive)

- `hasDropdown` → `signal(false)` per Pattern B.
  - Update `navbar-item.component.ts:50, 63`.
  - Update `dropdown-toggle.directive.ts:21` (external writer) to `.set(true)`.
  - No template change (the field is only read in TS).

### `navbar-dropdown` (2 private fields)

- `isAttached`, `isDestroyed` → both `signal(false)` per Pattern B.
  - 6 callsites total inside `navbar-dropdown.component.ts`.
  - The `isDestroyed` read at line 83 is inside an async `import().then()` callback — that's a regular function, not an `effect()`, so no `untracked()` is needed.

### `signature-pad` (2 fields)

- `minHeight` → `readonly`
- `isDrawing` → `signal(false)` per Pattern B.
  - 5 callsites inside `signature-pad.component.ts`. No template change.

### `searchbox` (3 fields, 3 directives)

Three TemplateRef fields, all per Pattern C:

- `suggestionTemplate: TemplateRef<BsSuggestionTemplateContext<T, U>>` → signal
- `enterSearchtermTemplate: TemplateRef<T>` → signal
- `noResultsTemplate: TemplateRef<T>` → signal

Generic type parameters of the parent class (`BsSearchboxComponent<T extends HasId<U>, U>`) are preserved verbatim in the signal types.

Template (`searchbox.component.html`) needs 6 edits:
- Lines 7, 31 — `@if/@else if` conditions: `suggestionTemplate` → `suggestionTemplate()`
- Lines 8, 32 — `*ngTemplateOutlet="suggestionTemplate"` → `suggestionTemplate()!`
- Lines 25, 38 — `*ngTemplateOutlet="X ?? defaultX"` → `X()! ?? defaultX`

Three writer directives, one line each:
- `directives/suggestion.directive.ts:13`
- `directives/enter-search-term.directive.ts:12`
- `directives/no-results.directive.ts:12`

No spec changes — neither the lib nor the demo spec asserts on these template fields.

### `select2` (4 fields, 2 directives, 2 specs)

- `charWidth` → `readonly`
- `itemTemplate: TemplateRef<T>` → signal per Pattern C
- `suggestionTemplate: TemplateRef<T>` → signal per Pattern C

Template (`select2.component.html`) — 2 edits, both `X ?? defaultX` patterns (lines 4, 19) per Pattern C nullish-coalesce sub-pattern.

Two writer directives:
- `directive/item-template/item-template.directive.ts:15`
- `directive/suggestion-template/suggestion-template.directive.ts:13`

Two specs that declare a mock component with the same field, both need to be updated to signal-based mocks (matching what we did for `datatable/src/row-template/row-template.directive.spec.ts:54` in `36fcff31`):
- `directive/item-template/item-template.directive.spec.ts:23`
- `directive/suggestion-template/suggestion-template.directive.spec.ts:21`

### `spinner` (1 field)

- `colors` → `readonly`. Single-line edit.

### `timepicker` (1 field)

- `colors` → `readonly`. Single-line edit. (Note: `presetTimestamps` was already migrated in `36fcff31`.)

### `typeahead` (1 field)

- `listboxId` → `readonly`. Single-line edit.

### `color-wheel` (1 private field)

- `isPointerDown` → `signal(false)` per Pattern B.
  - 3 callsites inside `color-wheel.component.ts`. The sibling `slider.component.ts:24` already uses `signal(false)` for the same flag — that file is the canonical reference.

## PR Rollout Plan

The work splits naturally along risk lines. Each PR is independent and can land without the others.

| PR | Scope | Files | Risk |
|----|-------|-------|------|
| **PR-1** | All low-risk minor changes: Cat 1 (`readonly` on `colors`), Cat 4 (`readonly` on constants), and Cat 5 (private flags `isAttached`, `isDestroyed`, `isPointerDown`). Also introduces `CHANGELOG.md`. | 10 component files + `CHANGELOG.md` | trivial — no behavior change |
| **PR-2** | Cat 2 simple flags (`hasDropdown`, `isDrawing`) | `navbar-item.component.ts` + `dropdown-toggle.directive.ts`; `signature-pad.component.ts` | low. **Breaking change** for `hasDropdown` (sibling directive writes to it) — version bump + CHANGELOG entry. |
| **PR-3** | Cat 3 — `file-upload.fileTemplate` | 3 files (component, directive, spec) | low — single field, mechanical. **Breaking change** — version bump + CHANGELOG entry. |
| **PR-4** | Cat 3 — `select2` itemTemplate + suggestionTemplate | 6 files (component, html, 2 directives, 2 specs) | medium — generic-typed, two specs to rewrite. **Breaking change.** |
| **PR-5** | Cat 3 — `searchbox` 3 templates | 5 files (component, html, 3 directives) | medium — three fields, six template edits, generic types. **Breaking change.** |
| **PR-6** | `carousel.imageCounter` (post-increment) | 2 files | medium — needs Pattern D care. **Breaking change** (mutable counter is exposed cross-component). |
| **PR-7** | `carousel.animationsDisabled` (animation host binding) | 1 file + manual carousel smoke test | low–medium — straightforward Pattern E once we trust Angular 21 evaluates the call expression in the host metadata |

PR-1 lands first — it's lowest risk and pre-stages `CHANGELOG.md` for the breaking changes that follow. PR-3 through PR-6 each touch a TemplateRef field that's externally visible to sibling directives, so each one is its own minor version bump on `libs/mintplayer-ng-bootstrap/package.json` and its own `CHANGELOG.md` entry. PR-7 is split off so the carousel animations can be verified in isolation.

Each PR title should reference issue #280, e.g. `refactor(signals): mark Color enum refs readonly (#280, part 1/7)`.

## Test Plan

### Automated

For every PR:

1. `npx nx test <project>` for each affected library (the agent audit lists them). Must pass with the same count as before — no new skips, no new failures.
2. `npx nx test ng-bootstrap-demo` to catch any consumer-side regression.
3. `npx nx build ng-bootstrap-demo` to confirm production build still compiles. The build cascades through every lib build, so this is the cheapest full-tree typecheck.

### Manual smoke tests

Most PRs need none — the field migration doesn't affect rendering paths.

**PR-6 (`imageCounter`)** — Open the carousel demo (`/basic/carousel`), confirm:
- Multiple images render in the correct order.
- Indicators highlight the right slide.
- Each image has a unique `id` attribute (open devtools, inspect carousel images, IDs should be sequential starting at 1).

**PR-7 (`animationsDisabled`)** — Open the carousel demo, confirm:
- Default state: slide transitions animate visibly.
- Run `nx serve ng-bootstrap-demo` and click through several carousel slides — there should be no console errors and no visible animation regression.

## Versioning & Changelog

The Cat 3 TemplateRef migrations and Cat 2 `imageCounter` migration are **breaking changes** — fields that sibling directives currently write to with `=` will need to switch to `.set()`. In practice the writers all live inside this repo, but the lib's published TypeScript API surface does change.

### Bumping policy

This repo aligns the package's major version with Angular's (`21.x` = Angular 21). The previous breaking change in this line — the removal of the `async-host-binding` lib entry in `36fcff31` — bumped the minor (`21.13.0 → 21.14.0`), not the major. We will follow that precedent: each breaking PR bumps the minor of `libs/mintplayer-ng-bootstrap/package.json`.

Rule: bump if the PR changes the runtime type of a non-private class member that any other file writes to. Pure-internal mutations (private fields, fields only used within their own component) don't bump.

| PR | `package.json` bump | Rationale |
|----|---------------------|-----------|
| PR-1 | none | only `readonly` adds and `private` field signal conversions |
| PR-2 | `21.14.0 → 21.15.0` | `hasDropdown` is written by `dropdown-toggle.directive.ts` |
| PR-3 | `21.15.0 → 21.16.0` | `fileTemplate` written by `file-upload-template.directive.ts` |
| PR-4 | `21.16.0 → 21.17.0` | `itemTemplate`, `suggestionTemplate` written by sibling directives |
| PR-5 | `21.17.0 → 21.18.0` | three searchbox templates written by sibling directives |
| PR-6 | `21.18.0 → 21.19.0` | `imageCounter` written by `carousel-image.directive.ts` |
| PR-7 | none | `animationsDisabled` is only used within `carousel.component.ts` itself |

### CHANGELOG.md

The repo does not currently have a `CHANGELOG.md`. PR-1 introduces one at the repo root with the structure below, and each subsequent breaking PR adds an entry under `## [Unreleased]` (or under a freshly cut version header at the moment the PR lands).

```md
# Changelog

All notable changes to `@mintplayer/ng-bootstrap` are documented here. The
package version aligns its major with the supported Angular major.

## [21.16.0] — TBD
### Breaking
- `BsFileUploadComponent.fileTemplate` is now a `WritableSignal<TemplateRef<FileUpload> | undefined>`. Code that wrote `component.fileTemplate = ref` must now call `component.fileTemplate.set(ref)`. The `BsFileUploadTemplateDirective` does this transparently — only direct assignments to the field are affected.

## [21.15.0] — TBD
### Breaking
- `BsNavbarItemComponent.hasDropdown` is now a `WritableSignal<boolean>`. The `BsDropdownToggleDirective` updates it internally; only code that wrote `navbarItem.hasDropdown = …` directly is affected.
- `BsSignaturePadComponent.isDrawing` is now a `WritableSignal<boolean>` (read access changes from `cmp.isDrawing` to `cmp.isDrawing()`). No external writers exist in the repo.

## [21.14.0] — 2026-04-XX
### Removed
- `provideAsyncHostBindings()` and `BsBindEventPlugin` (the `async-host-binding` lib entry). Use signal-based host bindings instead — see the demo page for an example.

### Other
- Library now operates fully zoneless. zone.js is no longer required.
```

The PRD does not enumerate every CHANGELOG line in advance — the entries are written when each PR lands so the wording reflects the actual diff.

## Acceptance Criteria

- [ ] All 14 remaining fields from issue #280 converted per the categorization above.
- [ ] No `*.ts` file in `libs/` declares a `@Input()`, `@Output()`, `@ViewChild()`, `@ViewChildren()`, `@ContentChild()`, or `@ContentChildren()` decorator on a non-spec class member. (Already true on `master` — guard against regression.)
- [ ] `nx run-many --target=test --all` is green with the same pass count as before this work (the migrated fields don't drop coverage).
- [ ] `nx build ng-bootstrap-demo` is green.
- [ ] Carousel demo renders and animates correctly after PR-7 (manual).
- [ ] `libs/mintplayer-ng-bootstrap/package.json` version reflects all minor bumps from the table above.
- [ ] `CHANGELOG.md` exists at the repo root and has an entry for each breaking PR.
- [ ] Issue #280 closed with a link to each merged PR.

## Out of Scope

- The `BsCarouselImageDirective.itemTemplate`, `id`, and `isFirst` fields (`carousel-image.directive.ts:12-14`) — not in #280, not template-bound from the carousel parent. Leave for a future audit.
- The `BsNavbarItemComponent.anchorTag` field (`navbar-item.component.ts:26`) — same.
- Any field renames, type tightening, or deprecation cleanup unrelated to signals.
- Updating consumers' (e.g. demo app) call sites for any *intentional* API change. The Cat 3 TemplateRef migration is internal-only — there are no consumer call sites to update.

## Backward Compatibility

- Cat 1 + Cat 4 (`readonly` only): zero impact. TS-level annotation only.
- Cat 2 + Cat 5 (`signal()` swap): the field's runtime *type* changes from `T` to `WritableSignal<T>`. Any downstream code reading or assigning the field directly would break. As of `master` these are all internal — verified via repo-wide grep.
- Cat 3 (TemplateRef → signal): same as above. The fields are only written by sibling directives in the same lib.

These are real breaking changes to the lib's TS API surface, however small the practical blast radius is. Each breaking PR bumps `@mintplayer/ng-bootstrap`'s minor version (per the precedent in `36fcff31`) and adds a CHANGELOG entry. See **Versioning & Changelog** above.

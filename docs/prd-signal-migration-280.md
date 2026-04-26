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
| `carousel/src/carousel/carousel.component.ts:87` | `animationsDisabled` | host binding `'[@.disabled]': 'animationsDisabled'` (line 22) | none beyond init | `readonly … = signal(false)` — host expression becomes `'animationsDisabled()'`. **Animation `@.disabled` syntax — see Open Questions §1** |
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

The plan is to change this to `'animationsDisabled()'` after the field becomes a signal. Angular evaluates host binding strings as template expressions, so a function call should bind correctly. **This is the single highest-risk migration in the PRD** — see Open Questions §1.

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
| **PR-1** | All `readonly` adds (Cat 1 + Cat 4) | 8 component files, 9 one-line edits | trivial — no behavior change |
| **PR-2** | All Cat 5 private flags (`isAttached`, `isDestroyed`, `isPointerDown`) | 2 component files | low — private state, contained |
| **PR-3** | Cat 2 simple flags (`hasDropdown`, `isDrawing`) | `navbar-item.component.ts` + `dropdown-toggle.directive.ts`; `signature-pad.component.ts` | low |
| **PR-4** | Cat 3 — `file-upload.fileTemplate` | 3 files (component, directive, spec) | low — single field, mechanical |
| **PR-5** | Cat 3 — `select2` itemTemplate + suggestionTemplate | 6 files (component, html, 2 directives, 2 specs) | medium — generic-typed, two specs to rewrite |
| **PR-6** | Cat 3 — `searchbox` 3 templates | 5 files (component, html, 3 directives) | medium — three fields, six template edits, generic types |
| **PR-7** | `carousel.imageCounter` (post-increment) | 2 files | medium — needs Pattern D care |
| **PR-8** | `carousel.animationsDisabled` (animation host binding) | 1 file + manual carousel smoke test | **high — animation syntax** — see Open Questions §1 |

PR-1 should land first as it's lowest risk and reduces the scope of all subsequent reviews. PR-8 should land last so any surprise in animation behavior doesn't block the rest.

Each PR title should reference issue #280, e.g. `refactor(signals): mark Color enum refs readonly (#280, part 1/8)`.

## Test Plan

### Automated

For every PR:

1. `npx nx test <project>` for each affected library (the agent audit lists them). Must pass with the same count as before — no new skips, no new failures.
2. `npx nx test ng-bootstrap-demo` to catch any consumer-side regression.
3. `npx nx build ng-bootstrap-demo` to confirm production build still compiles. The build cascades through every lib build, so this is the cheapest full-tree typecheck.

### Manual smoke tests

Most PRs need none — the field migration doesn't affect rendering paths.

**PR-7 (`imageCounter`)** — Open the carousel demo (`/basic/carousel`), confirm:
- Multiple images render in the correct order.
- Indicators highlight the right slide.
- Each image has a unique `id` attribute (open devtools, inspect carousel images, IDs should be sequential starting at 1).

**PR-8 (`animationsDisabled`)** — Open the carousel demo, confirm:
- Default state: slide transitions animate visibly.
- If a future test path triggers `animationsDisabled = true`, transitions become instant. (Today nothing in the demo flips this flag, so the visible default state is what we observe.)
- Run `nx serve ng-bootstrap-demo` and click through several carousel slides — there should be no console errors and no visible animation regression.

If PR-8's host binding doesn't accept the `()` call (see Open Questions §1), the fallback is to wrap with a `computed` and bind to that instead:

```ts
animationsDisabled = signal(false);
animationsDisabledValue = computed(() => this.animationsDisabled());
// host: { '[@.disabled]': 'animationsDisabledValue()' }  // no different
```

If even *that* fails (Angular animations metadata parser objecting to the call expression), keep the field as a plain `boolean` but turn every write into a `markForCheck`-equivalent via a wrapper signal — escalate at that point.

## Acceptance Criteria

- [ ] All 14 remaining fields from issue #280 converted per the categorization above.
- [ ] No `*.ts` file in `libs/` declares a `@Input()`, `@Output()`, `@ViewChild()`, `@ViewChildren()`, `@ContentChild()`, or `@ContentChildren()` decorator on a non-spec class member. (Already true on `master` — guard against regression.)
- [ ] `nx run-many --target=test --all` is green with the same pass count as before this work (the migrated fields don't drop coverage).
- [ ] `nx build ng-bootstrap-demo` is green.
- [ ] Carousel demo renders and animates correctly after PR-8 (manual).
- [ ] Issue #280 closed with a link to each merged PR.

## Open Questions

### §1 — Animation `@.disabled` host binding with a signal call

The `host: { '[@.disabled]': 'animationsDisabled' }` syntax is special — it's not a regular DOM property binding, it's an Angular animations directive that hooks into the `BrowserAnimationsModule` infrastructure. The expression on the right is evaluated as a normal Angular template expression in current Angular versions (21.x), which means `'animationsDisabled()'` *should* be accepted and re-evaluated whenever the signal changes.

The empirical risk is that an older animation parser may reject parenthesised expressions, or evaluate the expression once at attach time instead of subscribing reactively. The PRD plan is: **try it first, fall back to a wrapper `computed` if it doesn't work, escalate to a redesign if neither works.** PR-8 is sized to absorb up to a half-day of fiddling.

If we're unwilling to take that risk, an alternative is to leave `animationsDisabled` as a plain `boolean` and out of scope for #280, with a note added to the issue. That's a 1-line escape hatch in this PRD.

### §2 — TemplateRef API breaking change

Converting `parent.fooTemplate` from a plain field to a signal is technically a breaking change to the public TS API of the lib: any external consumer doing `myComponent.fooTemplate = someRef` (rather than going through the directive) will break. In practice these fields are written exclusively by sibling directives that ship in the same lib package, so external impact is expected to be zero.

Decision needed: do we mention this in the changelog under "Breaking changes" for the version bump that includes these PRs, or treat it as an internal refactor? The pragmatic answer is "mention it, but don't expect anyone to be hit." Default to mentioning.

### §3 — Cat 5 in scope or not?

Issue #280 explicitly marks Category 5 as "lower priority — these are private fields, not strictly needed for zoneless correctness." The PRD includes them anyway because they are trivial (PR-2 is ~5 minutes of work) and leaving them creates a long-tail "we still have plain mutable state" footgun. Easy to skip if review time is the constraint — drop PR-2 and the issue can stay open with a "Cat 5 only" residue.

## Out of Scope

- The `BsCarouselImageDirective.itemTemplate`, `id`, and `isFirst` fields (`carousel-image.directive.ts:12-14`) — not in #280, not template-bound from the carousel parent. Leave for a future audit.
- The `BsNavbarItemComponent.anchorTag` field (`navbar-item.component.ts:26`) — same.
- Any field renames, type tightening, or deprecation cleanup unrelated to signals.
- Updating consumers' (e.g. demo app) call sites for any *intentional* API change. The Cat 3 TemplateRef migration is internal-only — there are no consumer call sites to update.

## Backward Compatibility

- Cat 1 + Cat 4 (`readonly` only): zero impact. TS-level annotation only.
- Cat 2 + Cat 5 (`signal()` swap): the field's runtime *type* changes from `T` to `WritableSignal<T>`. Any downstream code reading or assigning the field directly would break. As of `master` these are all internal — verified via repo-wide grep.
- Cat 3 (TemplateRef → signal): same as above. The fields are only written by sibling directives in the same lib.

The `@mintplayer/ng-bootstrap` package version bump (already at 21.14.0 on `master`) is sufficient — no SemVer major needed since the affected fields are not part of the documented API surface.

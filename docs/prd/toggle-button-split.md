# PRD: Split `<bs-toggle-button>` into `<bs-checkbox>` and `<bs-radio>`

**Status:** Proposed.
**Author:** Pieterjan (with research input from a Claude exploration team)
**Date:** 2026-05-13
**Library:** new — `@mintplayer/ng-bootstrap/checkbox`, `@mintplayer/ng-bootstrap/radio`; gutted — `@mintplayer/ng-bootstrap/toggle-button` (keeps the entrypoint, exports only the styling-wrapper component)
**Branch context:** follows `issues/#326` (datatable ARIA + SSR hardening). The just-landed `aria-*` host→input mirroring in `BsToggleButtonComponent` (commit `2af6668c`) is the most-recent precedent and is referenced in § 4.7.

---

## 1. Why now

`<bs-toggle-button>` is a single component fronting five `type` values that span two control families:

- `'checkbox'`, `'switch'`, `'toggle_button'` — checkbox-style (independent on/off; can group into a string-array model)
- `'radio'`, `'radio_toggle_button'` — radio-style (single selection within a name group; emits a string)

Consumers have to remember which `type` belongs to which family. `'radio_toggle_button'` in particular is awkwardly named — it lives in the same enum as `'toggle_button'` but its form-binding semantics are completely different (`string` vs. `string[] | boolean`). The single `BsToggleButtonValueAccessor` branches on `type` to switch between the two contracts, mixing concerns that have no behaviour in common.

Splitting the component along the family boundary lets us:

- Narrow `type` to its meaningful per-family subset, so misuse (`<bs-radio type="switch">`) is a compile error rather than a silent bug.
- Drop `'radio_toggle_button'` as a distinct enum value — it becomes `<bs-radio type="toggle_button">`. The wrapper component disambiguates instead of the enum.
- Split `BsToggleButtonValueAccessor` into two focused accessors with no cross-family branching.
- Give each family its own group directive (`bsCheckboxGroup`, `bsRadioGroup`) with a typed `toggleButtons()` query.

Keeping `<bs-toggle-button>` as a thin **styling wrapper** preserves the existing Bootstrap form-check SCSS (`:host ::ng-deep { @import "node_modules/bootstrap/scss/forms/form-check"; }`) so the new components don't have to redeclare the import path or fight Angular's view-encapsulation scoping.

## 2. Goals / Non-goals

**Goals:**

- Two new public components — `<bs-checkbox>` and `<bs-radio>` — each with a narrowed `type` union, its own value accessor, and its own group directive.
- `<bs-toggle-button>` reduced to a styling wrapper: empty `<ng-content>` template + the existing `:host ::ng-deep` SCSS. No inputs, no value accessor, no aria-mirroring. The `@mintplayer/ng-bootstrap/toggle-button` entrypoint stays — `<bs-checkbox>` and `<bs-radio>` import `BsToggleButtonComponent` from it normally — but it's treated as an implementation-detail entrypoint: no demo page, no API docs, no consumer-facing surface. Anyone deep-importing it gets a working component, but it's not advertised.
- Bootstrap classes (`form-check`, `form-check-input`, `form-check-label`, `form-switch`, `btn-check`, `btn`, `btn-primary`, `btn-secondary`) keep working on projected content because the wrapper `<bs-toggle-button>` element sits in the DOM tree above the `<label>`/`<input>` and its `:host ::ng-deep` rules cascade down.
- ARIA host→input mirroring (today in `BsToggleButtonComponent`) moves into both new components — each owns its own inner `<input>` and mirrors `aria-*` host attributes onto it.
- All 15 current consumers (2 library, 13 demo) migrate to the new components in the same release.
- `[name]` resolution is mode-aware on both families:
  - **Radio:** `[name]` lives **only** on `[bsRadioGroup]`. `<bs-radio>` has no `[name]` input. Standalone radios (no group resolved) render but don't bind.
  - **Checkbox single-mode (standalone):** `[name]` lives on `<bs-checkbox>`. Binds to a `boolean` FormControl.
  - **Checkbox multi-mode (in `[bsCheckboxGroup]`):** `[name]` lives on `[bsCheckboxGroup]`, with the `[]` suffix auto-applied. Binds to a `string[]` FormControl. The per-instance `[name]` on each `<bs-checkbox>` inside a group is ignored — the group's name wins.
- **Non-adjacent grouping is supported.** Both group directives expose themselves via `exportAs` so consumers can place `[bsCheckboxGroup]` / `[bsRadioGroup]` on any ancestor element (e.g. a `<table>` whose rows each contain a single radio) and reference it with a template variable. For cases where DOM ancestry is impractical, `<bs-checkbox>` and `<bs-radio>` accept an optional `[group]` input that takes precedence over the injected ancestor. See § 4.5.
- **Full `ReactiveFormsModule` integration.** Both components and the radio group directive work with `[formControl]`, `[formControlName]`, and `FormBuilder`. See § 4.4 for which element receives the form binding in each scenario (single checkbox, checkbox group, radio group).
- The existing `/forms/toggle-button` demo route is **deleted**. Replaced by new `/forms/checkbox` and `/forms/radio` routes, each demonstrating its type variants and group behaviour. No redirect.

**Non-goals:**

- New visual variants (other Bootstrap button colors, custom shapes, icon-only modes) — out of scope.
- A backwards-compatibility shim that re-exports `<bs-toggle-button>` as the old branching component — per `feedback_breaking_changes_ok`, this repo treats BC as not-a-default-constraint. Document the breaks; don't carry shims.
- Changing the FormControl shape emitted by checkbox groups (`string[]`) or radio groups (`string`) — those contracts stay.
- Adding indeterminate checkbox state, custom validation messages, or async validators.

## 3. Scope

**In scope:**

- New package `libs/mintplayer-ng-bootstrap/checkbox/` mirroring the current toggle-button package layout: component + value accessor + group directive + type union + index.
- New package `libs/mintplayer-ng-bootstrap/radio/` with the same layout.
- Gutting `libs/mintplayer-ng-bootstrap/toggle-button/`: keep the package and its entrypoint; reduce the component to the styling wrapper (§ 4.6); shrink `index.ts` to a single `export { BsToggleButtonComponent }`. Drop `BsToggleButtonValueAccessor`, `BsToggleButtonGroupDirective`, and `BsCheckStyle`.
- Migrating the two library consumers (`bs-datatable`, `bs-multiselect`, `bs-color-picker`) to the new components.
- Migrating all demo pages that currently use `<bs-toggle-button>` (per § 9 Migration table).
- Deleting `apps/ng-bootstrap-demo/src/app/pages/basic/forms/toggle-button/` and its route. Adding new routes/pages `apps/ng-bootstrap-demo/src/app/pages/basic/forms/checkbox/` and `apps/ng-bootstrap-demo/src/app/pages/basic/forms/radio/`, each exercising every type variant + group behaviour for its component.

**Out of scope (deliberate):**

- Adding a separate `<bs-switch>` component. `'switch'` stays a `type` value on `<bs-checkbox>` because it shares form contract and binding semantics with `'checkbox'`; only the visual is different. Pulling `switch` out into its own tag would force consumers to pick by appearance rather than by behaviour, which is the wrong cut.

## 4. Design

### 4.1 Component hierarchy

A consumer writes:

```html
<bs-checkbox type="checkbox" name="agree" [(ngModel)]="agreed">
  I agree to the terms
</bs-checkbox>
```

The compiled DOM is:

```html
<bs-checkbox>
  <bs-toggle-button>                              <!-- styling wrapper -->
    <label class="form-check">
      <input type="checkbox" class="form-check-input" name="agree" #checkbox>
      <span class="form-check-label">
        <!-- consumer's projected content lands here -->
        I agree to the terms
      </span>
    </label>
  </bs-toggle-button>
</bs-checkbox>
```

`<bs-checkbox>` owns the `<label>`/`<input>` scaffolding and the value accessor. `<bs-toggle-button>` is inside its template purely so the Bootstrap form-check rules (loaded via `:host ::ng-deep` in `toggle-button.component.scss`) cascade onto `.form-check-input` / `.form-check-label` descendants. `<bs-radio>` mirrors the same hierarchy with `<input type="radio">`.

### 4.2 Narrowed `type` unions

```ts
// libs/mintplayer-ng-bootstrap/checkbox/src/types/checkbox-type.ts
export type BsCheckboxType = 'checkbox' | 'switch' | 'toggle_button';

// libs/mintplayer-ng-bootstrap/radio/src/types/radio-type.ts
export type BsRadioType = 'radio' | 'toggle_button';
```

`'toggle_button'` appears in **both** unions. The wrapper component disambiguates:

- `<bs-checkbox type="toggle_button">` ≡ today's `<bs-toggle-button type="toggle_button">` (checkbox-style button-toggle; multi-select).
- `<bs-radio type="toggle_button">` ≡ today's `<bs-toggle-button type="radio_toggle_button">` (radio-style button-toggle; single-select).

This collapses the awkward `'radio_toggle_button'` value out of the API.

### 4.3 Input contracts

`<bs-checkbox>`:

| Input | Type | Default | Purpose |
|---|---|---|---|
| `type` | `BsCheckboxType` | `'checkbox'` | Visual variant. |
| `name` | `string \| null` | `null` | Form control name for **standalone (single-mode) use only**. Binds to a `boolean` FormControl. Ignored when the checkbox resolves into a `[bsCheckboxGroup]` — the group's name wins (see § 4.5). |
| `value` | `string \| null` | `null` | Value emitted by this checkbox when checked (used by the group accessor in multi-mode). |
| `isToggled` | `model<boolean \| null>` | `false` | Two-way bound checked state. |
| `group` | `BsCheckboxGroupDirective \| null` | `null` | Optional explicit group reference. Resolved as `group() ?? inject(BsCheckboxGroupDirective, { optional: true, skipSelf: true })` — explicit input wins; falls back to DI ancestor; `null` means standalone (boolean form contract). |

`<bs-radio>`:

| Input | Type | Default | Purpose |
|---|---|---|---|
| `type` | `BsRadioType` | `'radio'` | Visual variant. |
| `value` | `string \| null` | `null` | Value emitted when this radio is selected. |
| `isToggled` | `model<boolean>` | `false` | Two-way bound checked state. |
| `group` | `BsRadioGroupDirective \| null` | `null` | Optional explicit group reference. Same resolution as checkbox: `group() ?? inject(BsRadioGroupDirective, { optional: true, skipSelf: true })`. Required (one or the other) for the radio to participate in form binding. |

Note: `<bs-radio>` has **no** `[name]` input — `name` lives on `[bsRadioGroup]` and is shared across all radios it owns. Standalone `<bs-radio>` (no resolved group at all) renders correctly but doesn't bind. This asymmetry vs. `<bs-checkbox>` is deliberate: a standalone radio without other radios in the same name group is semantically degenerate (radios exist to express *one of N*), so the form-binding hop pushes consumers toward the group-based pattern.

### 4.4 Value accessor split

`BsCheckboxValueAccessor` (host directive on `<bs-checkbox>`, implements `ControlValueAccessor`):

- **Single-mode (no group resolved):** form value is `boolean` (the checked state). The component's `[name]` input is used as the form-control name.
- **Multi-mode (in a `[bsCheckboxGroup]`):** form value is `string[]` of every checked `value()` in the group. The group's `[name]` input is used (with `[]` suffix auto-applied) — the per-checkbox `[name]` is ignored. The accessor on each in-group checkbox still listens to its own `(change)` event but routes the resulting update through the group's children so the group's FormControl receives the new array.

`BsRadioValueAccessor` (host directive on `[bsRadioGroup]`, **not** on `<bs-radio>`):

- Hosted on the group directive because the group owns the `name` and the FormControl binding. Implements `ControlValueAccessor` with a single `string` form value.
- Listens to `(change)` events from every `<bs-radio>` resolved into the group; on a `checked` change, emits the selected radio's `value()`. Programmatic `writeValue(v)` walks the group and sets `isToggled` on the matching radio.
- "Resolved into the group" covers both adjacency models: DOM-descendant radios via `contentChildren(BsRadioComponent)`, **plus** non-adjacent radios that opt in via `[group]="g"` (the group directive maintains a registry; each radio whose resolved group points at it registers/unregisters via `ngOnInit` / `ngOnDestroy`). The DOM-descendant path is sufficient for the common case; the explicit-input path supports table-row patterns and other DOM-detached arrangements.
- This is a structural change from today (where the accessor lives on each individual `<bs-toggle-button type="radio">`). Today's behaviour is "every radio is its own FormControl that happens to share a name"; the new behaviour is "the group is one FormControl whose value is the selected radio's value", matching how Angular's native `radio` form integration works (`FormControlName` on a group container, not on each input).

#### Multi-mode (group) checkboxes

Today's `<bs-toggle-button type="checkbox" [group]="g">` pattern — N checkboxes sharing a name, contributing to a `string[]` FormControl on the same name+`[]` — survives unchanged in semantics:

- Same FormControl shape: `string[]` of the checked `value()`s.
- Same `[]` name suffix applied by the accessor when a group is resolved.
- Same on-screen behaviour: each checkbox can be toggled independently.

The only differences are the renamed tag/inputs (per § 8 Migration) and the new resolution path for `group` (explicit `[group]` input wins over DI-injected `[bsCheckboxGroup]` ancestor). Existing reactive-form bindings continue to receive identical payloads.

#### `ReactiveFormsModule` integration

All three new artefacts implement `ControlValueAccessor` (via host directives, matching today's pattern), which is what makes them work with `[formControl]`, `[formControlName]`, and `FormBuilder`. The binding target depends on the shape you want:

| Use case | Bind `[formControl]` on… | Form value shape |
|---|---|---|
| Single checkbox (boolean toggle) | `<bs-checkbox>` itself | `boolean` |
| Checkbox group (multi-select) | `[bsCheckboxGroup]` element | `string[]` |
| Radio group (single-select among N) | `[bsRadioGroup]` element | `string` |

Example, reactive forms, radio group inside a table:

```ts
this.form = this.fb.group({
  selectedRow: this.fb.control<string | null>(null),
});
```

```html
<table [formGroup]="form">
  <tbody bsRadioGroup name="selectedRow" #g="bsRadioGroup" formControlName="selectedRow">
    @for (row of rows; track row.id) {
      <tr>
        <td><bs-radio [group]="g" [value]="row.id" /></td>
        <td>{{ row.label }}</td>
      </tr>
    }
  </tbody>
</table>
```

The `[bsRadioGroup]` directive carries the `formControlName`; each radio uses `[group]="g"` because the radios are in `<tr>`s and Angular's content-children query doesn't cross the `<tr>`/`<td>` boundary cleanly in every Angular version (and even when it does, the explicit binding is clearer for the reader).

Each accessor is ~30 lines because the cross-family branching is gone.

### 4.5 Group directives

```ts
// libs/mintplayer-ng-bootstrap/checkbox/src/directives/checkbox-group.directive.ts
@Directive({
  selector: '[bsCheckboxGroup]',
  exportAs: 'bsCheckboxGroup',
})
export class BsCheckboxGroupDirective {
  /** Shared name for the multi-mode form-array. Accessor appends `[]` automatically. */
  readonly name = input<string | null>(null);

  /** DOM-descendant children. Augment with the explicit-input registry from § 4.4. */
  readonly checkboxes = contentChildren(BsCheckboxComponent);
}
```

```ts
// libs/mintplayer-ng-bootstrap/radio/src/directives/radio-group.directive.ts
@Directive({
  selector: '[bsRadioGroup]',
  exportAs: 'bsRadioGroup',
  hostDirectives: [BsRadioValueAccessor],
})
export class BsRadioGroupDirective {
  readonly name = input<string | null>(null);
  readonly radios = contentChildren(BsRadioComponent);
}
```

The two directives differ in one structural way:

- `[bsRadioGroup]` hosts `BsRadioValueAccessor`, so the group itself is the FormControl-bindable element. `[bsCheckboxGroup]` is just a children sink — each `<bs-checkbox>` still owns its own value-accessor and binds its own boolean (standalone) or contributes to a `string[]` (in-group).

Both directives carry a `[name]` input. For `[bsRadioGroup]`, that's the *only* place radio-family names exist — `<bs-radio>` has no `[name]`. For `[bsCheckboxGroup]`, the group's `[name]` is the multi-mode form-array name (with `[]` suffix); per-instance `<bs-checkbox>` `[name]` is the single-mode boolean-control name and is ignored when the checkbox is in a group.

Both are exported from their respective package indexes. The `exportAs` names are the mechanism enabling the non-adjacent grouping pattern below.

#### Non-adjacent grouping pattern

Sometimes the natural DOM parent of a radio/checkbox isn't the right place for the group directive — e.g., each row in a table contains a single radio, but the directive belongs on the `<table>` or `<tbody>` so it owns one shared `name` and one FormControl:

```html
<table>
  <tbody bsRadioGroup name="selectedRow" #g="bsRadioGroup">
    @for (row of rows; track row.id) {
      <tr>
        <td><bs-radio [group]="g" [value]="row.id" /></td>
        <td>{{ row.label }}</td>
      </tr>
    }
  </tbody>
</table>
```

When DOM ancestry alone is enough (e.g. radios nested directly under `[bsRadioGroup]`), the explicit `[group]` is optional — the radio's `inject(BsRadioGroupDirective, { optional: true, skipSelf: true })` finds the ancestor and uses it. When ancestry is awkward (table rows, ng-template projections, conditional structural directives), the `#g="bsRadioGroup"` template variable lets you wire the relationship manually. Resolution order inside `<bs-radio>` (and `<bs-checkbox>`):

```ts
protected readonly resolvedGroup = computed(() =>
  this.group() ?? this.parentGroup ?? null,
);
private readonly parentGroup = inject(BsRadioGroupDirective, { optional: true, skipSelf: true });
```

Explicit input always wins. When both are null, the component is standalone (checkbox binds to a `boolean`; radio doesn't bind).

### 4.6 `<bs-toggle-button>` residue

After the split, the wrapper is reduced to:

```ts
// libs/mintplayer-ng-bootstrap/toggle-button/src/component/toggle-button.component.ts
@Component({
  selector: 'bs-toggle-button',
  template: '<ng-content></ng-content>',
  styleUrls: ['./toggle-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-inline-block' },
})
export class BsToggleButtonComponent {}
```

```scss
// toggle-button.component.scss — unchanged from today
:host ::ng-deep {
    @import "node_modules/bootstrap/scss/functions";
    @import "node_modules/bootstrap/scss/variables";
    @import "node_modules/bootstrap/scss/variables-dark";
    @import "node_modules/bootstrap/scss/mixins";
    @import "node_modules/bootstrap/scss/forms/form-check";
}
```

`index.ts` reduces to `export { BsToggleButtonComponent }`. `BsToggleButtonValueAccessor`, `BsToggleButtonGroupDirective`, and the `BsCheckStyle` type union are removed outright (breaking — see § 9).

The `@mintplayer/ng-bootstrap/toggle-button` entrypoint **survives** so `<bs-checkbox>` and `<bs-radio>` can import the wrapper class via a regular cross-entrypoint import (`import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button'`). It is treated as an implementation-detail entrypoint — no demo page under `apps/ng-bootstrap-demo`, no API docs, no link from the nav menu. Direct consumer use is not advertised but is not actively blocked either (the component has no inputs and does nothing on its own, so misuse is self-limiting).

### 4.7 ARIA host→input mirroring

The mirroring landed in commit `2af6668c` (forward every `aria-*` attribute from the host onto the inner `<input>` via a `MutationObserver`). With the split, the inner `<input>` lives inside `<bs-checkbox>` / `<bs-radio>` — not `<bs-toggle-button>` — so the mirroring code moves with it.

Each new component duplicates the existing logic:

```ts
private mirrorAriaAttributesToInput() {
  if (isPlatformServer(this.platformId)) return;
  const host = this.hostRef.nativeElement as HTMLElement;
  const input = this.checkbox().nativeElement;  // viewChild '#checkbox'
  const mirror = () => {
    Array.from(host.attributes)
      .filter(attr => attr.name.startsWith('aria-'))
      .forEach(({ name, value }) => input.setAttribute(name, value));
  };
  mirror();
  const observer = new MutationObserver(mirror);
  observer.observe(host, { attributes: true });
  this.destroyRef.onDestroy(() => observer.disconnect());
}
```

Since `<bs-toggle-button>` becomes a passive styling wrapper, any `aria-*` set on it would not have a focusable target to mirror to — the wrapper's removal of that code is correct.

### 4.8 Package layout

```
libs/mintplayer-ng-bootstrap/
├── checkbox/
│   ├── src/
│   │   ├── component/
│   │   │   ├── checkbox.component.html        // template wraps <bs-toggle-button> from @mintplayer/ng-bootstrap/toggle-button
│   │   │   ├── checkbox.component.scss        // empty or minimal — Bootstrap rules come from wrapped <bs-toggle-button>
│   │   │   ├── checkbox.component.ts
│   │   │   └── checkbox.component.spec.ts
│   │   ├── directives/
│   │   │   └── checkbox-group/
│   │   │       ├── checkbox-group.directive.ts
│   │   │       └── checkbox-group.directive.spec.ts
│   │   ├── value-accessor/
│   │   │   └── checkbox-value-accessor.ts
│   │   ├── types/
│   │   │   └── checkbox-type.ts
│   │   └── index.ts
│   ├── index.ts
│   └── ng-package.js
├── radio/                                      // mirror of checkbox/ with s/Checkbox/Radio/
│   └── src/component/radio.component.ts       // imports BsToggleButtonComponent from @mintplayer/ng-bootstrap/toggle-button
└── toggle-button/                              // gutted in place — entrypoint survives
    ├── src/
    │   ├── component/
    │   │   ├── toggle-button.component.ts     // styling wrapper, no inputs, no logic
    │   │   ├── toggle-button.component.scss   // unchanged :host ::ng-deep block
    │   │   └── toggle-button.component.spec.ts
    │   └── index.ts                            // export { BsToggleButtonComponent }
    └── ng-package.js
```

Path exports (TypeScript path mapping in `tsconfig.base.json` + ng-packagr-generated `package.json` `exports`):

| Path | Exports |
|---|---|
| `@mintplayer/ng-bootstrap/checkbox` | `BsCheckboxComponent`, `BsCheckboxValueAccessor`, `BsCheckboxGroupDirective`, `BsCheckboxType` |
| `@mintplayer/ng-bootstrap/radio` | `BsRadioComponent`, `BsRadioValueAccessor`, `BsRadioGroupDirective`, `BsRadioType` |
| `@mintplayer/ng-bootstrap/toggle-button` | `BsToggleButtonComponent` only — implementation-detail entrypoint imported by checkbox + radio. Not documented; no demo. |

## 5. Implementation outline

Suggested commit-per-step on a fresh branch (e.g. `feat/checkbox-radio-split`):

1. **`refactor(toggle-button): reduce to styling wrapper`** — Gut `BsToggleButtonComponent` to the minimal version in § 4.6. Drop `BsToggleButtonValueAccessor`, `BsToggleButtonGroupDirective`, `BsCheckStyle`. Update `index.ts` to `export { BsToggleButtonComponent }`. Delete `toggle-button.component.html` (template moves inline to `template: '<ng-content></ng-content>'`). This commit alone breaks every consumer of the old API; the next commits restore behaviour through the new components.
2. **`feat(checkbox): add BsCheckboxComponent + group + accessor`** — New `libs/mintplayer-ng-bootstrap/checkbox/` package per § 4.8. Component template wraps `<bs-toggle-button>` (imported from `@mintplayer/ng-bootstrap/toggle-button`) around the `<label>`/`<input>` per § 4.1. Ports the relevant computeds (mainCheckStyle, inputClass, labelClass, checkOrRadio, ariaRole, nameResult) from the old toggle-button into checkbox-flavored versions.
3. **`feat(radio): add BsRadioComponent + group + accessor`** — Same shape as commit 2; radio-only computeds. `BsRadioValueAccessor` hosted on `[bsRadioGroup]` per § 4.4. `[name]` lives only on the group directive. Imports `BsToggleButtonComponent` from `@mintplayer/ng-bootstrap/toggle-button`.
4. **`refactor(datatable): migrate to <bs-checkbox>`** — `datatable.component.html` lines 64 + 110.
5. **`refactor(multiselect, color-picker): migrate to <bs-checkbox>`** — `multiselect.component.html:12`, `color-picker.component.html:12`.
6. **`refactor(demo): migrate non-showcase toggle-button consumers`** — The 12 demo pages outside `/forms/toggle-button/` (per § 8). Bundle into one commit to keep CHANGELOG focused.
7. **`feat(demo): add /forms/checkbox + /forms/radio, delete /forms/toggle-button`** — New routes + components under `apps/ng-bootstrap-demo/src/app/pages/basic/forms/checkbox/` and `.../radio/`, each exercising every `type` variant for its component plus a grouped example. Delete the `.../toggle-button/` folder, remove its route entry, remove its nav-menu entry. No redirect.
8. **`docs(changelog): document <bs-toggle-button> split`** — Note the breaking changes in `CHANGELOG.md`.

Each commit should leave the workspace buildable (`npx nx build mintplayer-ng-bootstrap` green) and tests passing (`npx nx test mintplayer-ng-bootstrap` green) except commit 1 in isolation, which is fine because the chain is shipped together.

## 6. Demo page scenarios

The two new demo pages — `/forms/checkbox` and `/forms/radio` — must each cover every supported scenario for their component family. Each scenario is rendered as a live example paired with `<bs-code-snippet>` blocks showing the TS and HTML source, following the existing `apps/ng-bootstrap-demo/src/app/pages/basic/forms/multi-range/` layout:

```html
<div bsRow>
    <div [col]>
        <!-- live demo here -->
    </div>
    <div [col]>
        <bs-code-snippet [codeToCopy]="basicTs" [language]="'ts'"></bs-code-snippet>
        <bs-code-snippet [codeToCopy]="basicHtml" [language]="'html'"></bs-code-snippet>
    </div>
</div>
```

The page component holds the snippet source as string fields (`basicTs`, `basicHtml`, `groupReactiveTs`, …) populated with verbatim copies of the demo template — that's what `[codeToCopy]` consumes.

### 6.1 `/forms/checkbox` scenarios

Seven scenarios, top-down on the page:

**1. Single, template-driven.** Boolean toggle via `[(ngModel)]`.

```ts
agreed = signal(false);
```

```html
<bs-checkbox name="agree" [(ngModel)]="agreed">I agree to the terms</bs-checkbox>
```

**2. Single, reactive.** Boolean toggle via `[formControl]`.

```ts
agreed = this.fb.control(false);
```

```html
<bs-checkbox name="agree" [formControl]="agreed">I agree to the terms</bs-checkbox>
```

**3. `type="switch"`.** Same form contract as `'checkbox'`; only the visual differs.

```ts
darkMode = signal(false);
```

```html
<bs-checkbox type="switch" [(ngModel)]="darkMode">Dark mode</bs-checkbox>
```

**4. `type="toggle_button"`.** Checkbox-style button-toggle (multi-select capable when grouped, but shown here standalone for the variant).

```ts
bold = signal(false);
```

```html
<bs-checkbox type="toggle_button" [(ngModel)]="bold">Bold</bs-checkbox>
```

**5. Group (multi-mode), adjacent, template-driven.** `string[]` form value via shared `[bsCheckboxGroup]`. Demonstrates that per-instance `[name]` is unused inside a group — the group's `[name]` (`"toppings"`) drives the form control with `[]` suffix applied automatically.

```ts
toppings = signal<string[]>([]);
```

```html
<div bsCheckboxGroup name="toppings" [(ngModel)]="toppings">
    <bs-checkbox value="cheese">Cheese</bs-checkbox>
    <bs-checkbox value="mushroom">Mushroom</bs-checkbox>
    <bs-checkbox value="olive">Olive</bs-checkbox>
</div>
```

**6. Group (multi-mode), adjacent, reactive.** Same shape via `[formControl]` on the group element.

```ts
toppings = this.fb.control<string[]>([]);
```

```html
<div bsCheckboxGroup name="toppings" [formControl]="toppings">
    <bs-checkbox value="cheese">Cheese</bs-checkbox>
    <bs-checkbox value="mushroom">Mushroom</bs-checkbox>
    <bs-checkbox value="olive">Olive</bs-checkbox>
</div>
```

**7. Group (multi-mode), non-adjacent (table row pattern).** Uses `exportAs` + explicit `[group]` because each `<tr>` contains exactly one checkbox and DI-ancestor resolution across `<tbody>`/`<tr>`/`<td>` is fragile.

```ts
rows = signal([
  { id: 'r1', label: 'Row 1' },
  { id: 'r2', label: 'Row 2' },
  { id: 'r3', label: 'Row 3' },
]);
selectedRows = signal<string[]>([]);
```

```html
<table>
    <tbody bsCheckboxGroup name="rows" #g="bsCheckboxGroup" [(ngModel)]="selectedRows">
        @for (row of rows(); track row.id) {
            <tr>
                <td><bs-checkbox [group]="g" [value]="row.id" /></td>
                <td>{{ row.label }}</td>
            </tr>
        }
    </tbody>
</table>
```

### 6.2 `/forms/radio` scenarios

Four scenarios, top-down on the page:

**1. Group, adjacent, template-driven.** `string` form value via `[bsRadioGroup]` + `[(ngModel)]`. Demonstrates that `<bs-radio>` has no `[name]` input — the group owns it.

```ts
selectedFruit = signal<string>('apple');
```

```html
<div bsRadioGroup name="fruit" [(ngModel)]="selectedFruit">
    <bs-radio value="apple">Apple</bs-radio>
    <bs-radio value="banana">Banana</bs-radio>
    <bs-radio value="cherry">Cherry</bs-radio>
</div>
```

**2. Group, adjacent, reactive.** Same shape via `[formControl]` on the group element.

```ts
selectedFruit = this.fb.control<string | null>(null);
```

```html
<div bsRadioGroup name="fruit" [formControl]="selectedFruit">
    <bs-radio value="apple">Apple</bs-radio>
    <bs-radio value="banana">Banana</bs-radio>
    <bs-radio value="cherry">Cherry</bs-radio>
</div>
```

**3. Group with `type="toggle_button"`.** Radio-style button-toggle (single-select).

```ts
layout = signal<string>('grid');
```

```html
<div bsRadioGroup name="layout" [(ngModel)]="layout">
    <bs-radio type="toggle_button" value="grid">Grid</bs-radio>
    <bs-radio type="toggle_button" value="list">List</bs-radio>
    <bs-radio type="toggle_button" value="cards">Cards</bs-radio>
</div>
```

**4. Group, non-adjacent (table row pattern).** Mirror of the checkbox scenario 7, single-select.

```ts
rows = signal([
  { id: 'r1', label: 'Row 1' },
  { id: 'r2', label: 'Row 2' },
  { id: 'r3', label: 'Row 3' },
]);
selectedRow = signal<string | null>(null);
```

```html
<table>
    <tbody bsRadioGroup name="selectedRow" #g="bsRadioGroup" [(ngModel)]="selectedRow">
        @for (row of rows(); track row.id) {
            <tr>
                <td><bs-radio [group]="g" [value]="row.id" /></td>
                <td>{{ row.label }}</td>
            </tr>
        }
    </tbody>
</table>
```

### 6.3 Page wiring

- Files: `apps/ng-bootstrap-demo/src/app/pages/basic/forms/checkbox/checkbox.component.{ts,html,scss}` and `…/radio/radio.component.{ts,html,scss}`.
- Routing: add entries to `app.routes.ts` next to the existing `basic/forms/*` block; remove the `basic/forms/toggle-button` route in the same commit.
- Nav menu: add menu entries next to where `/forms/toggle-button` lives today; remove the `toggle-button` entry.
- The snippet source-of-truth strings (`basicTs`, `basicHtml`, etc.) live as `readonly` string fields on the page component — keep them in the same top-to-bottom order as the scenarios appear in the template so a reader scrolling either way sees the matching pair.

## 7. Alternatives considered

- **Shared SCSS partial instead of styling wrapper.** Put the Bootstrap form-check `@import` block in a shared partial (e.g. `libs/mintplayer-ng-bootstrap/checkbox/_shared.scss`) and `@use` it from both `checkbox.component.scss` and `radio.component.scss`. Avoids the extra `<bs-toggle-button>` element in the DOM. **Rejected** because it duplicates the `:host ::ng-deep` block across packages and forces every future "looks like a Bootstrap form-check" component to remember to import the partial. The wrapper-component approach makes "include the styles" a templating concern visible in the markup, not an SCSS toolchain concern.

- **Keep `<bs-toggle-button>` as the single component, type-narrow via overloads.** Use TypeScript declaration merging or component selectors like `bs-toggle-button[checkbox]` vs. `bs-toggle-button[radio]` to type-narrow without splitting the tag. **Rejected** because attribute-selector components are an Angular anti-pattern for primary widgets — they break tree-shaking heuristics and lose IDE autocomplete on the tag name. A separate tag per family is clearer for consumers.

- **Single value accessor with branching, just split the component.** Two components, but one shared `BsToggleValueAccessor` that branches on a `family` input. **Rejected** because the whole point of the split is to remove the cross-family branching; sharing the accessor preserves the mess we set out to delete.

## 8. Testing

- **Unit tests** — Each new component gets its own spec mirroring the current `toggle-button.component.spec.ts` coverage: rendering per `type`, name suffix handling (`[]` for grouped checkboxes only), `aria-role`/`aria-pressed` per variant, `aria-*` host→input mirroring (the test from `2af6668c` ports across).
- **Group accessor tests** — `BsCheckboxValueAccessor` with `string[]` emission across a 3-checkbox group; `BsRadioValueAccessor` with `string` emission across a 3-radio group; transitions when items mount/unmount.
- **Forms integration** — Template-driven (`[(ngModel)]`) and reactive (`[formControl]`) bindings for both components, all `type` values.
- **E2E** — The split showcase pages (`/forms/checkbox`, `/forms/radio`) get e2e specs that exercise click-toggle, keyboard activation, and screen-reader-name (via `getByRole('checkbox', { name: 'X' })`). The existing toggle-button e2e (if any) is retired.
- **Aria specs** — `aria-label` mirroring continues to be covered; the existing test for `BsToggleButtonComponent` moves to `BsCheckboxComponent` + `BsRadioComponent`.

## 9. Migration

Per `feedback_breaking_changes_ok`: ship breaking changes documented; no shim layer.

| Before | After |
|---|---|
| `<bs-toggle-button>` (no type → default checkbox) | `<bs-checkbox>` |
| `<bs-toggle-button type="checkbox">` | `<bs-checkbox type="checkbox">` (or just `<bs-checkbox>`) |
| `<bs-toggle-button type="switch">` | `<bs-checkbox type="switch">` |
| `<bs-toggle-button type="toggle_button">` | `<bs-checkbox type="toggle_button">` |
| `<bs-toggle-button type="radio">` | `<bs-radio type="radio">` (or just `<bs-radio>`) |
| `<bs-toggle-button type="radio_toggle_button">` | `<bs-radio type="toggle_button">` |
| `[bsToggleButtonGroup]` (on checkbox-family parent) | `[bsCheckboxGroup]` |
| `[bsToggleButtonGroup]` (on radio-family parent) | `[bsRadioGroup]` |
| `<bs-toggle-button type="radio" name="x" value="a">` (name on each radio, ungrouped) | `<div bsRadioGroup name="x"><bs-radio value="a">…</bs-radio></div>` (name on the group; radio loses its `[name]` input) |
| `<bs-toggle-button type="checkbox" name="opts" value="a" [group]="g">` (name on each checkbox in a multi-mode group) | `<div bsCheckboxGroup name="opts" #g="bsCheckboxGroup"><bs-checkbox [group]="g" value="a">…</bs-checkbox></div>` (name on the group; per-instance `[name]` ignored when grouped, kept for single-mode standalone use) |
| Reactive form binding via `formControlName` on every individual `<bs-toggle-button type="radio">` | `formControlName` moves up onto the `[bsRadioGroup]` element; the group is the FormControl-bindable host |
| Reactive form binding via `formControlName` on every individual `<bs-toggle-button type="checkbox" [group]="g">` | `formControlName` moves up onto the `[bsCheckboxGroup]` element for multi-mode; stays on the individual `<bs-checkbox>` for single-mode |
| `import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button'` | `import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox'` (or `BsRadioComponent`). The `@mintplayer/ng-bootstrap/toggle-button` path keeps resolving — it still exports `BsToggleButtonComponent` — but the component is now a styling wrapper with no inputs and no behaviour, so importing it directly buys you nothing. Treat as removed for consumer-facing purposes. |
| `import { BsCheckStyle }` | `import { BsCheckboxType }` or `BsRadioType` |

### Library consumers to migrate (3 sites)

- `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.html:64` — `<bs-toggle-button type="checkbox">` (Deselect-all) → `<bs-checkbox type="checkbox">`.
- `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.html:110` — `<bs-toggle-button type="checkbox">` (per-row select) → `<bs-checkbox type="checkbox">`.
- `libs/mintplayer-ng-bootstrap/multiselect/src/component/multiselect.component.html:12` — implicit checkbox → `<bs-checkbox>`.
- `libs/mintplayer-ng-bootstrap/color-picker/components/color-picker/color-picker.component.html:12` — `type="switch"` → `<bs-checkbox type="switch">`.

### Demo consumers to migrate (13 pages)

`apps/ng-bootstrap-demo/src/app/pages/basic/forms/toggle-button/toggle-button.component.html` (14 instances across 5 variants), plus single-instance migrations in: `basic/color-picker`, `basic/forms/range`, `basic/forms/multi-range`, `basic/forms/select`, `basic/placeholder`, `basic/table`, `animations/color-transition`, `advanced/navigation-lock`, `advanced/pipes/has-property`, `advanced/pipes/linify`, `advanced/tile-manager`, `advanced/splitter`, `overlay/offcanvas`, `overlay/shell` (3 instances, `radio_toggle_button` → `<bs-radio type="toggle_button">`).

### Public-API removals (breaking)

From `@mintplayer/ng-bootstrap/toggle-button`:

- `BsToggleButtonValueAccessor` — deleted outright.
- `BsToggleButtonGroupDirective` — deleted outright.
- `BsCheckStyle` — deleted outright.

`BsToggleButtonComponent` survives at the same import path but is now a styling-wrapper-only component with no inputs and no behaviour. The first two are replaced by their per-family equivalents under `@mintplayer/ng-bootstrap/checkbox` and `@mintplayer/ng-bootstrap/radio`; `BsCheckStyle` is replaced by `BsCheckboxType` and `BsRadioType`.

## 10. Open questions

No open questions remain after the 2026-05-13 design review. Resolutions below for the record.

### Resolved during review (2026-05-13)

- ~~`/forms/toggle-button` demo route fate.~~ **Resolved:** delete the route + folder; add `/forms/checkbox` and `/forms/radio`; no redirect. See § 3 Scope.
- ~~Naming the `'toggle_button'` value in both per-component unions.~~ **Resolved:** keep `'toggle_button'` in both `BsCheckboxType` and `BsRadioType`. The wrapper-component context disambiguates. See § 4.2.
- ~~Move `[name]` to `[bsRadioGroup]` instead of per-instance.~~ **Resolved:** in scope for this PRD. `<bs-radio>` loses its `[name]` input; `[bsRadioGroup]` gains it; `BsRadioValueAccessor` rehomes onto the group directive. See § 4.3, § 4.4, § 4.5. **Updated 2026-05-13 (follow-up review):** the same migration applies to the checkbox family, but asymmetrically — `[bsCheckboxGroup]` gains a `[name]` input (multi-mode name, `[]` suffix auto-applied), while `<bs-checkbox>` keeps its own `[name]` for single-mode (standalone boolean) use. When a checkbox is in a group, the group's `[name]` wins; the per-instance one is ignored. See § 2 Goals, § 4.3, § 4.4, § 4.5.
- ~~Should `<bs-toggle-button>` stay public after the split?~~ **Resolved:** the `@mintplayer/ng-bootstrap/toggle-button` entrypoint stays so `<bs-checkbox>` and `<bs-radio>` can import the wrapper class via a normal cross-entrypoint import. It's an implementation-detail entrypoint — no demo page, no docs link — but it's not actively hidden. The component itself has no inputs and no behaviour, so misuse is self-limiting. See § 4.6, § 4.8, § 9.
- ~~Support non-adjacent grouping (e.g. a radio per table row).~~ **Resolved:** both `[bsCheckboxGroup]` and `[bsRadioGroup]` expose `exportAs` so they can be referenced with `#g="bsRadioGroup"` template variables. `<bs-checkbox>` and `<bs-radio>` accept an optional `[group]` input that takes precedence over the DI-injected ancestor (`group() ?? parentGroup`). See § 4.3, § 4.5.
- ~~Multi-mode (group) checkbox behaviour preserved.~~ **Resolved:** yes — same FormControl shape (`string[]`), same `[]` name suffix applied automatically by the accessor when a group is resolved, same per-checkbox toggling. The only changes are tag/input renames and the new explicit-vs-ancestor `[group]` resolution. See § 4.4 "Multi-mode (group) checkboxes".
- ~~`ReactiveFormsModule` support.~~ **Resolved:** in scope. `[formControl]` / `[formControlName]` / `FormBuilder` bind to: `<bs-checkbox>` for single boolean, `[bsCheckboxGroup]` for `string[]`, `[bsRadioGroup]` for `string`. See § 4.4 "ReactiveFormsModule integration" for the binding-target table and a worked example.

## 11. References

- Component analysis: PRD research team (anatomy + consumer inventory + format conventions), 2026-05-13.
- BC philosophy: memory `feedback_breaking_changes_ok` — design for the cleanest API; document breaks; no shims.
- `:host ::ng-deep` viability: confirmed by anatomy report § 6 — `:host ::ng-deep` is the documented escape hatch for cross-component style projection under emulated view encapsulation; deprecated for new code but still functional and necessary for this pattern.
- Recent ARIA mirroring: commit `2af6668c` (`feat(toggle-button): mirror aria-* attributes from host onto inner <input>`) — the logic moves to `<bs-checkbox>` and `<bs-radio>` per § 4.7.
- Bootstrap 5 forms reference: [checks and radios](https://getbootstrap.com/docs/5.3/forms/checks-radios/).
- Sibling PRD precedents: [`scheduler-controlled-selection.md`](./scheduler-controlled-selection.md) (same "split a god component along a family boundary" pattern, applied to selection state); [`carousel-template-unification.md`](./carousel-template-unification.md) (same "consolidate shared styling/template into a wrapper" pattern, applied to swiper/carousel).

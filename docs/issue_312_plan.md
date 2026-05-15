# Development Plan: Issue #312

**Issue**: #312
**Title**: Query Builder
**Type**: Feature (new component)
**Priority**: Medium
**PRD**: [`docs/issue_312_PRD.md`](./issue_312_PRD.md)

## Executive Summary

Add `bs-query-builder` to `libs/mintplayer-ng-bootstrap` — a visual builder for composing arbitrarily nested AND/OR boolean queries, modelled on [Infragistics Ignite UI Angular `igxQueryBuilder`](https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder).

Shipped as **Lit web component (`mp-query-builder`) + Angular wrapper (`bs-query-builder`)** colocated inside the new `libs/mintplayer-ng-bootstrap/query-builder` secondary entry point, matching the precedent set by `bs-datetime-picker` (#332).

**Architectural principle: the frontend emits a canonical JSON expression tree only.** Backends receive the tree, validate it against their schema (whitelisted fields/operators/values per role), and build the actual DB query in their own language (SQL, RQL, OData, Mongo, etc.) server-side. The frontend never emits raw DB query strings — that would be unsanitizable. See [[feedback_json_wire_format_only]].

Scope (in one PR):

- Nested AND/OR groups with arbitrary depth, multi-entity sub-queries via `in` / `not-in`, drag-and-drop reorder including cross-group reparenting and cross-`mp-query-builder` moves with field reset on schema mismatch.
- Eight built-in value editors per data type (string, number, integer, date, datetime, boolean, enum, multi-list, **array**).
- Full Infragistics-parity operator catalog including **date relative operators** (today, this/last/next week|month|year, last/next-N-days, year-to-date) and **array/set operators** (`any-of` / `all-of` / `none-of` / `is-empty` / `is-not-empty`) on a new `FieldType: 'array'`.
- `ControlValueAccessor` on the Angular wrapper with re-entrancy-guarded `writeValue` ↔ model signal coordination.
- Built-in `[data]` / `(filteredResult)` in-memory dataset filtering on the Angular wrapper.
- Exported pure-function helpers: `evaluateQuery`, `visitTree<T>` (with lazy `walkInner: () => T`), `renderExpression`.
- Custom value editors via WC-level factory callback (`EditorHandle { element, dispose? }`) and Angular `*bsQueryBuilderEditor` structural directive that desugars to factory callbacks.
- Saved-query events (`saveQuery` / `loadQuery` / `deleteQuery`) with `[savedQueries]` input — events-only, consumer persists.
- `@lit/context`-based propagation of `editorRegistry` / `disabled` / `messages` to nested sub-query WCs; `query-change` events fire `bubbles: false` and the root WC re-dispatches consolidated events.

**Explicitly NOT in scope** (and not future-deferred work on this component either — these belong to other tools):

- No backend serializers (`toSql` / `toODataFilter` / `toMongoFilter` / `toHasuraWhere` / `toPrismaWhere` / `toLinqPredicate` — all dropped). Backend translation is the consumer's server-side responsibility.
- No `bs-datatable` modification. External wiring via `evaluateQuery` is documented in the demo.

This is a multi-month effort, phased internally as 15 milestones inside one branch.

---

## Problem Statement

### Current Behavior

`@mintplayer/ng-bootstrap` has no query builder. Consumers wanting a visual filter UI must compose `bs-datatable` filter inputs ad-hoc (no AND/OR grouping, no nesting), or roll their own component. There is no canonical JSON shape for "a boolean expression tree" in the library, so consumers can't agree on a wire format between frontends and backends.

### Expected Behavior

A new secondary entry point `@mintplayer/ng-bootstrap/query-builder` exports `bs-query-builder` (Angular) backed by `mp-query-builder` (Lit). The component renders a Bootstrap-styled tree of groups, conditions, and sub-queries; emits a canonical JSON `Expression` tree via two-way `[(query)]`; integrates with Angular reactive forms via `ControlValueAccessor`; optionally filters an in-memory dataset via `[data]` + `(filteredResult)`; supports custom value editors per field via the `*bsQueryBuilderEditor` directive.

The canonical JSON tree is the **only wire format**. Consumers post it to their backend; the backend validates it against its schema and builds the DB query.

### Impact

- Closes a major gap relative to Infragistics / DevExpress / Syncfusion competitor libraries.
- Establishes a canonical JSON expression-tree shape that other library components can adopt as a filter input.
- First library component to use multi-level pointer-event drag-and-drop with cross-shadow-DOM moves.

---

## Technical Analysis

### New files (high level)

```
libs/mintplayer-ng-bootstrap/query-builder/                            NEW PACKAGE
├── src/
│   ├── index.ts                                          # public re-exports
│   └── lib/
│       ├── web-components/
│       │   ├── mp-query-builder.element.ts               # root WC — holds the tree, provides Lit context
│       │   ├── mp-query-builder.element.html
│       │   ├── mp-query-builder.element.scss
│       │   ├── mp-query-group.element.ts                 # group (AND/OR) row — consumes Lit context
│       │   ├── mp-query-group.element.html
│       │   ├── mp-query-group.element.scss
│       │   ├── mp-query-condition.element.ts             # field/op/value row
│       │   ├── mp-query-condition.element.html
│       │   ├── mp-query-condition.element.scss
│       │   ├── mp-query-subquery.element.ts              # in/not-in + nested mp-query-builder (new context root)
│       │   ├── mp-query-subquery.element.html
│       │   ├── mp-query-subquery.element.scss
│       │   ├── context.ts                                # Lit context tokens (editorRegistry, disabled, messages)
│       │   └── value-editors/
│       │       ├── mp-qb-string-editor.element.ts
│       │       ├── mp-qb-number-editor.element.ts
│       │       ├── mp-qb-date-editor.element.ts
│       │       ├── mp-qb-datetime-editor.element.ts
│       │       ├── mp-qb-boolean-editor.element.ts
│       │       ├── mp-qb-enum-editor.element.ts
│       │       ├── mp-qb-list-editor.element.ts           # multi-select for in/not-in
│       │       ├── mp-qb-array-editor.element.ts          # NEW — value editor for array FieldType
│       │       └── mp-qb-date-relative-editor.element.ts  # NEW — N-input for last-N-days / next-N-days
│       ├── components/
│       │   ├── query-builder.component.ts                # bs-query-builder Angular wrapper (CVA + dataset binding)
│       │   ├── query-builder.component.html
│       │   ├── query-builder.component.scss
│       │   └── query-builder-editor.directive.ts         # *bsQueryBuilderEditor structural directive
│       ├── model/
│       │   ├── expression.ts                             # Expression discriminated union
│       │   ├── field-def.ts                              # FieldDef, EntitySchema types (minimal — no relationKey)
│       │   ├── operators.ts                              # OperatorCatalog per FieldType (incl. relative date + array ops)
│       │   ├── tree-ops.ts                               # immutable add/remove/update/move helpers
│       │   └── default-tree.ts                           # emptyGroup() / emptyCondition() factories
│       ├── evaluator/
│       │   ├── evaluate-query.ts                         # pure function; handles every operator incl. relative dates
│       │   └── evaluate-query.spec.ts
│       ├── visitor/
│       │   ├── visit-tree.ts                             # lazy walker — `visitTree(tree, visitor)` with walkInner
│       │   └── visitor-types.ts                          # TreeVisitor<T> contract
│       ├── dnd/
│       │   ├── drag-controller.ts                        # pointer-events controller, ghost in document.body
│       │   └── drop-zone.ts                              # drop-slot rendering + hit-test
│       ├── preview/
│       │   └── render-expression.ts                      # tree → human-readable string
│       └── i18n/
│           └── default-messages.ts                       # operator labels (EN)
├── ng-package.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── vitest.config.ts
└── README.md

apps/ng-bootstrap-demo/src/app/pages/advanced/query-builder/           NEW
├── query-builder.component.ts
├── query-builder.component.html
└── query-builder.component.scss

apps/ng-bootstrap-demo-e2e/src/query-builder.spec.ts                   NEW
```

### Files to modify

- `libs/mintplayer-ng-bootstrap/package.ts` **or** `package.json` — register the new secondary entry point. **Registration mechanism to verify during M1** — the previous review flagged that `libs/mintplayer-ng-bootstrap/package.ts` only re-exports `package.json` today; either it's a typo in the precedent or there's a separate step. Confirm against the datetime-picker pattern.
- `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs` — register `./query-builder`.
- `apps/ng-bootstrap-demo/src/app/app.routes.ts` (or equivalent) — add `/advanced/query-builder` route.
- Demo sidebar / navigation — link the demo page.

**No changes to `bs-datatable`.** Demo wires the builder to a datatable externally via `evaluateQuery`.

### Dependencies

- `lit` (already a workspace dep).
- **NEW: `@lit/context`** (~3 kB tree-shakeable) — for propagating `editorRegistry` / `disabled` / `messages` to nested sub-query WCs.
- No other runtime dependencies. Drag-and-drop uses native pointer events.

### Architecture Considerations

- **Wire format**: canonical JSON `Expression` tree only. Frontend never emits SQL/RQL/OData/Mongo/GraphQL. Backend validates the tree against its schema and builds the DB query. See [[feedback_json_wire_format_only]].
- **Tree representation**: plain JSON discriminated union, `kind: 'group' | 'condition' | 'subquery'`.
- **WC ownership**: WC owns the tree, edit gestures, rendering. Angular wrapper bridges signals to WC properties + custom events, mirroring `bs-datetime-picker`'s pattern.
- **Recursive WC + Lit Context**: each `mp-query-builder` provides a Lit context bundling `{ editorRegistry, disabled, messages }`. Sub-queries embed another `mp-query-builder` as a new context root that inherits the outer values unless explicitly overridden. Eliminates the propagation gap flagged in review.
- **Event bubbling**: `query-change`, `save-query`, `load-query`, `delete-query` CustomEvents fire with `bubbles: false`. Root `mp-query-builder` listens to its own internal mutation signals (Lit reactive controllers) and re-dispatches a single consolidated `query-change` event externally per user edit. Eliminates the N+1 event firing flagged in review.
- **Custom editors**: WC-level `editorRegistry: Record<string, (ctx: EditorContext) => EditorHandle>` property. `EditorHandle = { element: HTMLElement; dispose?: () => void }`. WC calls `handle.dispose?.()` on every removal path: field change, row remove, parent group remove (recursive), DnD reparent across schemas. Angular wrapper's `*bsQueryBuilderEditor` directive aggregates content children into the registry; each entry uses `ViewContainerRef.createEmbeddedView` and returns `{ element: view.rootNodes[0], dispose: () => view.destroy() }`. This is a NEW disposal convention in this repo; document it explicitly.
- **`ControlValueAccessor` re-entrancy**: `bs-query-builder` maintains a `writingFromForm: boolean` flag. `writeValue(tree)` sets the flag, writes to the `query` model signal, then clears the flag in a microtask. The `effect()` that propagates model changes to `onChange` early-returns when the flag is set. Prevents `writeValue → model → effect → onChange → FormControl → writeValue` infinite loop.
- **Drag-and-drop**:
  - Pointer events only (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`).
  - `touch-action: none` on drag handles ([[feedback_touch_action_immutable]]).
  - No `preventDefault()` on touch `pointerdown` ([[feedback_pointerdown_preventdefault]]).
  - **Ghost element rendered in `document.body`** (not in shadow DOM, to avoid clipping). `position: fixed`, `pointer-events: none`. Cleaned up on both `pointerup` and `pointercancel`.
  - **Cycle prevention**: on `pointerdown`, precompute a `Set<string>` of the dragged node's descendant ids. Drop targets test against the set in O(1) per `pointermove`.
  - **Drop slots**: `[data-drop-slot]` elements rendered between every pair of children + at the top and bottom of every group's body. Empty groups render a min-height-32px drop slot with "Drop here" placeholder during drag.
  - **Half-line hit test**: `event.clientY < rect.top + rect.height/2` → insert above the row; else below.
  - **Cross-tree DnD**: drop slots tagged `data-qb-root="<rootId>"`. Drops across different `mp-query-builder` roots are accepted. The moved node retains its field/operator/value if the field exists in the target entity's schema; otherwise the field resets to the target's first field, operator resets to that field's first valid operator, value resets to empty.
- **Visitor API**: `visitTree<T>(tree, visitor): T`. Visitor contract:
  ```ts
  interface TreeVisitor<T> {
    condition(node: Condition, ctx: VisitorContext): T;
    subquery(node: SubQueryCondition, ctx: VisitorContext, walkInner: () => T): T;
    group(node: Group, children: T[], ctx: VisitorContext): T;
  }
  ```
  `walkInner` is lazy so visitors can scope context (alias prefixes, parameter arrays, etc.) around the sub-tree walk. Trivial eager visitors call `walkInner()` immediately.
- **`evaluateQuery` and `[data]`/`(filteredResult)`**: `evaluateQuery` is a pure function. The Angular wrapper's `[data]` + `(filteredResult)` uses it internally. Single source of truth for in-memory evaluation semantics.
- **Operator catalog**: closed but expanded per Infragistics. New entries: relative date operators, array operators on the new `'array'` `FieldType`.
- **Theming**: internal Lit styles use CSS custom properties; respects dark-mode toggle (#324).
- **A11y**: `role="group"` on every group with `aria-label="AND group" | "OR group"`; native focus order; demo page documents the keymap per [[project_wc_aria_decisions]].
- **i18n**: operator labels (including the new date relative + array ops) translatable via `[messages]` input. Default English.

---

## Implementation Plan

Phases are internal milestones inside one PR.

### Phase 1: Data model + scaffold

1. Create `libs/mintplayer-ng-bootstrap/query-builder/` secondary entry point (mirror `datetime-picker/`).
2. Define `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType` (including `'array'`), `OperatorCatalog`, `SavedQuery`, `EditorContext`, `EditorHandle` in `model/`.
3. Define `TreeVisitor<T>` + `VisitorContext` in `visitor/visitor-types.ts` with `walkInner: () => T` on `subquery`.
4. Define Lit context tokens in `web-components/context.ts`: `editorRegistryContext`, `disabledContext`, `messagesContext`.
5. Define `emptyGroup()`, `emptyCondition()`, `emptySubquery()` factories + `cloneTree()` deep-clone.
6. Verify registration step — read `datetime-picker` and `scheduler` ng-package files to confirm where new entries actually get listed (`package.ts` vs `package.json` vs `ng-package.secondary.cjs`).
7. Verify `nx build mintplayer-ng-bootstrap` builds the empty entry point clean.

### Phase 2: Lit WC scaffold — read-only tree rendering

1. Implement `mp-query-builder.element.ts` (root WC). Accepts `query`, `schema`, `rootEntity`, `disabled`, `editorRegistry`, `messages` properties. Provides Lit contexts for `editorRegistry`, `disabled`, `messages`.
2. Implement `mp-query-group.element.ts`, `mp-query-condition.element.ts`, `mp-query-subquery.element.ts`. Sub-query renders an inner `<mp-query-builder>` as a new context root.
3. Verify recursive rendering against a hand-written tree (group → group → condition / subquery → group → condition).

### Phase 3: Built-in value editors per data type

1. Implement string, number, integer, date, datetime, boolean (tri-state via `is-true`/`is-false`/`is-null`/`is-not-null`), enum (single-select), list (multi-select for `in`/`not-in`), **array** (multi-select for `any-of`/`all-of`/`none-of`), **date-relative** (N-input for `last-N-days` / `next-N-days`).
2. Wire `mp-query-condition.element.ts` to pick the right editor by `field.type` + `condition.operator`. The date-relative editor renders only when the operator is parameterised; parameterless relative ops (`today`, `this-week`, etc.) render no value editor.
3. The Lit `editorRegistry` context overrides built-in editors per field name when provided.

### Phase 4: Custom editor extensibility (factory callback + EditorHandle)

1. Define `EditorHandle = { element: HTMLElement; dispose?: () => void }`.
2. Define `EditorContext = { field: FieldDef; operator: Operator; value: unknown; onChange: (next: unknown) => void; disabled: boolean }`.
3. WC stores per-condition `Map<conditionId, EditorHandle>`. On every removal path (field change, operator change with shape mismatch, row remove, parent group remove, DnD reparent across schemas, WC disconnect), call `handle.dispose?.()` then `handle.element.remove()`.
4. Lit context consumer in `mp-query-condition.element.ts` reads `editorRegistry` and prefers the registered factory over the built-in editor.

### Phase 5: Edit mode — mutations through tree

1. `mp-query-condition` controls: field selector, operator selector (filtered by `OperatorCatalog[fieldType]`), value editor, remove button.
2. `mp-query-group` controls: AND/OR toggle, "Add condition" / "Add group" / "Add sub-query" buttons, remove button (disabled on root).
3. Immutable tree-update helpers in `model/tree-ops.ts`: `addChild`, `removeChild`, `updateCondition`, `setGroupLogic`, `moveNode(tree, sourceId, targetParentId, targetIndex, schemaForTarget?)` — the `schemaForTarget?` argument supports the cross-tree move's field-reset logic.
4. All mutations clone — never mutate the input tree.
5. Stable `id` (uuid) on every node at creation.

### Phase 6: Operator catalog + per-type filtering

1. `OperatorCatalog` covering:
   - **String**: `equals`, `not-equals`, `contains`, `does-not-contain`, `starts-with`, `ends-with`, `is-null`, `is-not-null`, `in`, `not-in`
   - **Number / Integer**: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`, `in`, `not-in`
   - **Date / Datetime**: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`, **`today`**, **`yesterday`**, **`this-week`**, **`last-week`**, **`next-week`**, **`this-month`**, **`last-month`**, **`next-month`**, **`this-year`**, **`last-year`**, **`next-year`**, **`last-n-days`**, **`next-n-days`**, **`year-to-date`**
   - **Boolean**: `is-true`, `is-false`, `is-null`, `is-not-null`
   - **Enum**: `equals`, `not-equals`, `in`, `not-in`, `is-null`, `is-not-null`
   - **Array** (NEW): `any-of`, `all-of`, `none-of`, `is-empty`, `is-not-empty`
2. Value-shape rules:
   - `between` / `not-between`: tuple `[v1, v2]`, inclusive.
   - `in` / `not-in` / `any-of` / `all-of` / `none-of`: array.
   - `last-n-days` / `next-n-days`: `{ n: number }`.
   - Other relative date ops: `null` (no value).
   - `is-null` / `is-not-null` / `is-true` / `is-false` / `is-empty` / `is-not-empty`: `null` (no value).
3. Operator dropdown filters by `OperatorCatalog[field.type]`; switching field auto-resets operator + value if previous shape isn't valid for the new type. Switching operator auto-resets value if the value shape differs.

### Phase 7: Nested groups + sub-queries + Lit Context propagation

1. `add group` inserts a nested `Group` at any depth.
2. `add sub-query` inserts a `SubQueryCondition`. Sub-query field is a relation field (`FieldDef.type === 'relation'`, `targetEntity` set); operator fixed to `in` / `not-in`; value is an entire nested `Group` rooted on `targetEntity`'s schema.
3. The inner `<mp-query-builder>` inside a `SubQuery` is a new context root that inherits the outer's `editorRegistry`/`disabled`/`messages` via `@lit/context` unless its own property is set.
4. `query-change`, `save-query`, `load-query`, `delete-query` CustomEvents fire with `bubbles: false`. Root WC tracks internal changes via Lit reactive controllers and re-dispatches a single consolidated `query-change` event externally per user edit.
5. Recursion-safe: sub-queries can contain sub-queries. `maxDepth` input (default `Infinity`).

### Phase 8: Drag-and-drop reorder (within-group + cross-group + cross-tree)

1. Drag handles (`bi-grip-vertical`) on every condition row and group header.
2. `DragController` in `dnd/drag-controller.ts`:
   - `pointerdown` on handle → record source node id + start position; precompute `descendantIds: Set<string>` for cycle prevention.
   - Create ghost element by cloning the source row; append to `document.body`; `position: fixed; pointer-events: none; z-index: <high>`.
   - `pointermove` → translate ghost; compute target drop slot via `elementFromPoint` (which crosses shadow DOM with `composed: true` semantics in modern browsers — fall back to per-root hit-test if needed).
   - `pointerup` → if target slot exists and target is not in `descendantIds`, dispatch `moveNode(tree, sourceId, targetParentId, targetIndex, targetSchema)`. Clean up ghost.
   - `pointercancel` → clean up ghost; no move dispatched.
3. `touch-action: none` on handles.
4. **Drop slots** (`dnd/drop-zone.ts`): rendered between every pair of children + at top/bottom of every group's body. Visible only during a drag. Empty group renders a min-height-32px placeholder.
5. **Half-line hit-test**: `event.clientY < rect.top + rect.height/2` → insert above; else below.
6. **Cross-group reparenting**: drop into another group's slot moves the node; node `kind` and contents preserved.
7. **Cross-tree DnD** (across `mp-query-builder` roots): drop slots tagged `data-qb-root="<rootId>"`. Cross-root drops accepted. On drop, `moveNode` is invoked with the target schema. If the moved node's field exists in target schema → keep field/operator/value. Else → reset to target's first field, first valid operator, empty value. Sub-tree moves (groups) walk all descendant conditions and apply the same reset rule per condition.
8. Cycle prevention: drop targets tested against `descendantIds`; matches rejected.

### Phase 9: Expression preview rendering

1. `renderExpression(tree, schema, messages?)` in `preview/render-expression.ts` — pure function returning human-readable string with parentheses.
2. Render relative date ops as their localized labels (e.g. "Order date is in the last 7 days").
3. Render array ops with bracketed value lists (e.g. "Tags any of [urgent, blocked]").
4. Exposed as a separate export.
5. Rendered at the top of the WC's host inside a `<pre>` block (toggleable via `[showPreview]`, default `false`).

### Phase 10: `evaluateQuery` helper

1. `evaluateQuery(tree, record, schema, options?): boolean` — pure function.
2. Operator coverage:
   - All comparison ops (equals, lt, gt, between, etc.) — straightforward.
   - **Relative date ops** — evaluated against `options.now ?? new Date()` so tests can pin time.
   - **Array ops** — `any-of` (intersection non-empty), `all-of` (superset), `none-of` (disjoint), `is-empty` / `is-not-empty`.
3. Sub-queries: optional `getRelatedRecords(record, fieldName): unknown[]` callback. `in` → true if at least one related record matches the sub-tree; `not-in` → true if zero match.
4. NULL semantics: `equals`/`lt`/`gt`/`between` against `null` → `false`. Only `is-null`/`is-not-null` match nullness.
5. String comparisons: case-insensitive by default; `EvaluateOptions { caseSensitive?: boolean; now?: Date; getRelatedRecords?: ... }`.
6. Unit tests cover every operator × every applicable type × null × sub-query.

### Phase 11: Visitor API (lazy `walkInner`)

1. `visitTree<T>(tree, visitor): T` in `visitor/visit-tree.ts`.
2. Signature:
   ```ts
   interface TreeVisitor<T> {
     condition(node: Condition, ctx: VisitorContext): T;
     subquery(node: SubQueryCondition, ctx: VisitorContext, walkInner: () => T): T;
     group(node: Group, children: T[], ctx: VisitorContext): T;
   }
   interface VisitorContext {
     schema: EntitySchema[];
     currentEntity: string;
     depth: number;
   }
   ```
3. Walker is called via `visitTree(tree, visitor, { schema, rootEntity })`.
4. Used in-tree by `evaluateQuery` (eager — calls `walkInner()` immediately) and `renderExpression` (eager).
5. Exported for consumers who want to write their own JS-side transformations (debug printers, simplifiers, pre-validators).

### Phase 12: Saved queries — events-only API

1. WC inputs: `savedQueries: SavedQuery[]` (default `[]`), `showSavedQueries: boolean` (default `false`).
2. WC outputs: `save-query`, `load-query`, `delete-query` CustomEvents (non-bubbling; re-dispatched by root).
3. Picker dropdown renders at top of host: list of saved queries with per-row Load + Delete buttons; "💾 Save current as..." action opens an inline name input.
4. WC does not persist; consumer wires `[savedQueries]` and the three event handlers to their own store (localStorage / IndexedDB / REST).

### Phase 13: Angular wrapper

1. Implement `bs-query-builder` mirroring `bs-datetime-picker`'s pattern.
2. Inputs: `[schema]`, `[rootEntity]`, `[messages]`, `[showPreview]`, `[showSavedQueries]`, `[maxDepth]`, `[savedQueries]`, `[operatorOverrides]`, `[disabled]`, `[data]`.
3. Models: `[(query)]`.
4. Outputs: `(queryChange)`, `(saveQuery)`, `(loadQuery)`, `(deleteQuery)`, `(filteredResult)`.
5. **`ControlValueAccessor` with re-entrancy guard**:
   - `private writingFromForm = false`
   - `writeValue(tree)`: `this.writingFromForm = true; this.query.set(tree ?? emptyGroup()); queueMicrotask(() => this.writingFromForm = false);`
   - `effect()` propagating `query()` → `onChange`: early-return if `writingFromForm`.
   - `setDisabledState(state)`: toggles the `disabled` input on the WC (which propagates through Lit context to all nested instances).
6. **`*bsQueryBuilderEditor` directive**:
   - Structural directive; reads `fieldName` from input.
   - `@ContentChildren(QueryBuilderEditorDirective)` aggregated in the wrapper into an `editorRegistry: Record<string, (ctx) => EditorHandle>`.
   - Per registered field: factory does `const view = vcr.createEmbeddedView(templateRef, { $implicit: ctx, ctx }); return { element: view.rootNodes[0], dispose: () => view.destroy() };`.
   - Wrapper forwards the `editorRegistry` to the WC's property; Lit context propagates to nested sub-query WCs automatically.
7. **`[data]` + `(filteredResult)`**: `effect()` recomputes `data().filter(row => evaluateQuery(query(), row, schemaForRoot()))` on changes; emits `(filteredResult)`.
8. Re-export public types: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EvaluateOptions`, `EditorContext`, `EditorHandle`, `SavedQuery`, `TreeVisitor`, `VisitorContext`.

### Phase 14: Demo page

1. New demo page at `apps/ng-bootstrap-demo/src/app/pages/advanced/query-builder/`.
2. Examples:
   - **Single-entity basics** (Orders schema with `tags: 'array'` field for set-op demo).
   - **Pre-loaded tree** with nested AND/OR.
   - **Multi-entity sub-query** (Customers + Orders).
   - **Relative date ops** ("orders in the last 7 days").
   - **Array set-ops** ("tags any-of [urgent, blocked]").
   - **Live in-memory evaluation** via `[data]` + `(filteredResult)`.
   - **External `bs-datatable` wiring** — demo shows `<bs-datatable [data]="filteredRows()">` pattern using `(filteredResult)` rather than modifying datatable.
   - **Custom editor** — `*bsQueryBuilderEditor="orderDate"` projecting `bs-datepicker`.
   - **Custom editor for an array field** — multi-select with custom rendering.
   - **Reactive forms** — same builder bound via `[formControl]`, showing lossless round-trip.
   - **Saved queries** — wired to `localStorage` in the demo.
   - **JSON tree view** — live JSON next to the builder, illustrating the wire format.
3. Document the keymap.
4. Document the architectural principle: "frontend posts JSON; backend translates" — with a short code snippet showing a hypothetical backend endpoint receiving the tree.

### Phase 15: Testing + a11y validation

1. **Unit tests** (Vitest):
   - Tree ops including `moveNode` with cross-tree field reset (descendant cycle blocking, schema-mismatch reset).
   - `evaluateQuery` × every operator × every applicable type × null × sub-query × relative date ops with pinned `options.now`.
   - `renderExpression` snapshots.
   - `visitTree` eager vs lazy `walkInner` consumers.
   - Operator catalog: every type has a non-empty operator list; value-shape rules per operator.
2. **WC unit tests**: field/op/value round-trips through `query-change`; cross-group + cross-tree DnD; Lit context propagation across sub-query WCs (changing outer `editorRegistry` reflects in inner conditions); event bubbling assertion (consumer sees exactly one `query-change` per edit regardless of depth).
3. **Angular wrapper unit tests**:
   - `[(query)]` two-way binding.
   - `[formControl]` round-trip + `setDisabledState` + re-entrancy: editing the tree fires `onChange` exactly once per user edit; `setValue → onChange` does NOT re-enter.
   - `*bsQueryBuilderEditor` projection; disposal: `ApplicationRef.viewCount` stable across add/remove cycles.
   - `[data]` + `(filteredResult)` emits on `(query)` changes; doesn't emit when `[data]` is absent.
   - `(saveQuery)` payload correctness.
4. **Playwright e2e** (`apps/ng-bootstrap-demo-e2e/src/query-builder.spec.ts`):
   - Build a flat AND query; assert preview.
   - Build a nested OR group; assert tree shape via `evaluateQuery`.
   - Sub-query across entities; assert matching row count.
   - Cross-group DnD; assert tree shape.
   - Cross-tree DnD with field reset; assert moved condition's field changed.
   - Relative date op ("orders in the last 7 days"); assert correct rows match.
   - Array op (`any-of`); assert correct rows match.
   - `[formControl]` round-trip.
   - Save / refresh / load via localStorage.
   - Drag ghost cleanup on `pointercancel` (synthesized cancel event leaves no orphan in `document.body`).
   - Use `await page.waitForLoadState('networkidle')` per [[project_e2e_destructive_bootstrap]].
5. **axe-core** — zero serious findings on the demo page.
6. **Firefox smoke test** — drag handles don't shrink in flex containers ([[feedback_firefox_flex_shrink]]); ghost not clipped during cross-group drags.
7. **Memory-leak test** — Angular `ApplicationRef.viewCount` stable across 100 add/remove condition cycles when custom editors are projected.

---

## Test Scenarios

### Scenario 1: Build a flat AND query
- **Given**: Empty tree, Orders schema, demo page.
- **When**: User clicks "Add condition" twice, picks `total > 100` and `status = "open"`.
- **Then**: Preview reads `Total > 100 AND Status = "open"`. `evaluateQuery` returns `true` for `{ total: 150, status: "open" }`.

### Scenario 2: Nested group with OR
- **Given**: Existing condition `total > 100`.
- **When**: User adds a nested group with two `status` conditions, toggles OR.
- **Then**: Preview reads `Total > 100 AND (Status = "open" OR Status = "pending")`.

### Scenario 3: Sub-query with Lit context inheritance
- **Given**: Customers + Orders schemas; root entity Customers; outer wrapper has `*bsQueryBuilderEditor="orderDate"` projecting `bs-datepicker`.
- **When**: User adds a sub-query on `orders` and inside picks the `orderDate` field.
- **Then**: The inner sub-query renders the same `bs-datepicker` as the outer (Lit context inherited). Editing the date inside fires exactly ONE `query-change` event at the consumer (not two).

### Scenario 4: Cross-tree DnD with field reset
- **Given**: A condition `total > 100` on Orders in the outer tree; an empty sub-query on `orders`.
- **When**: User drags the condition into the sub-query's body. `total` exists on Orders (target). 
- **Then**: Condition moves with field/operator/value preserved.
- **And-when**: User drags a `customerName = "Foo"` condition (which lives on Customer, the outer entity) into the sub-query.
- **Then**: Condition moves but field resets to the sub-query's first field (e.g., `orderId`), operator resets, value clears.

### Scenario 5: Relative date operator
- **Given**: Orders schema with `orderDate: 'date'`.
- **When**: User adds a condition with operator `last-N-days`, sets N=7.
- **Then**: Preview reads `Order date is in the last 7 days`. `evaluateQuery` with pinned `options.now = 2026-05-15` matches rows with `orderDate >= 2026-05-08`.

### Scenario 6: Array operator
- **Given**: Orders schema with `tags: 'array'` of string.
- **When**: User adds `tags any-of ["urgent", "blocked"]`.
- **Then**: `evaluateQuery` returns `true` for `{ tags: ["urgent", "low-priority"] }`, `false` for `{ tags: ["low-priority"] }`.

### Scenario 7: `[formControl]` round-trip with re-entrancy guard
- **Given**: `bs-query-builder` bound via `[formControl]="ctrl"`.
- **When**: User edits the tree once.
- **Then**: `onChange` fires exactly once. `ctrl.setValue(otherTree)` updates the UI and does NOT re-invoke `onChange`. `ctrl.disable()` disables all interactive controls in the outer AND nested sub-query trees (via Lit context).

### Scenario 8: Custom editor disposal — no leak
- **Given**: 100 cycles of "add condition with custom-editor field; remove condition".
- **When**: Measure `ApplicationRef.viewCount` before and after.
- **Then**: View count is stable (no growth). Custom editor `EditorHandle.dispose` was called on each removal.

### Scenario 9: Drag ghost cleanup
- **Given**: Drag in progress.
- **When**: `pointercancel` fires (browser interruption / OS gesture).
- **Then**: Ghost element is removed from `document.body`. No orphan node remains.

### Scenario 10: Switch field resets operator + value
- **Given**: Condition with `total > 100`.
- **When**: User changes field from `total` (number) to `status` (string).
- **Then**: Operator resets, value resets.

### Scenario 11: Keyboard-only construction
- **Given**: Empty tree.
- **When**: User uses Tab + Enter only to add a condition and fill it.
- **Then**: Construction completes with no mouse use. `Alt+ArrowUp` / `Alt+ArrowDown` move rows among siblings.

### Scenario 12: External `bs-datatable` wiring
- **Given**: Demo wires `<bs-datatable [data]="filteredRows()">` where `filteredRows` is a signal fed by `(filteredResult)`.
- **When**: User builds a query.
- **Then**: Datatable reflects only matching rows. **No `bs-datatable` source modifications.**

---

## Acceptance Criteria

- [ ] `@mintplayer/ng-bootstrap/query-builder` secondary entry builds clean.
- [ ] `bs-query-builder` round-trips an unedited JSON tree.
- [ ] Eight built-in value editors (string, number, integer, date, datetime, boolean, enum, list, array, date-relative).
- [ ] Operator catalog covers Infragistics parity including relative date + array ops; filters by field type.
- [ ] Nested groups to arbitrary depth.
- [ ] Sub-queries via `in` / `not-in`; recursable.
- [ ] Drag-and-drop reorder within-group, cross-group, **and cross-tree with field reset**.
- [ ] Drag ghost rendered in `document.body`; cleaned up on both `pointerup` and `pointercancel`.
- [ ] Cycle prevention: dropping a group into its own descendant is rejected.
- [ ] Lit context propagates `editorRegistry`/`disabled`/`messages` to nested sub-query WCs.
- [ ] `query-change` events fire `bubbles: false`; consumer sees exactly one event per user edit regardless of depth.
- [ ] `evaluateQuery` exported, pure, covers every operator with NULL semantics + relative dates + array ops + sub-queries.
- [ ] `renderExpression` exported.
- [ ] `visitTree<T>` exported with lazy `walkInner`.
- [ ] `bs-query-builder` implements `ControlValueAccessor` with re-entrancy guard.
- [ ] `[data]` + `(filteredResult)` work on the wrapper.
- [ ] `*bsQueryBuilderEditor` projects custom editors; `EditorHandle.dispose` called on every removal path; no Angular view leaks.
- [ ] WC `editorRegistry` factory works for framework-agnostic consumers.
- [ ] `(saveQuery)` / `(loadQuery)` / `(deleteQuery)` events fire with correct payloads.
- [ ] Demo page covers all 12 scenarios.
- [ ] Playwright e2e covers all 12 scenarios.
- [ ] axe-core passes with zero serious findings.
- [ ] Firefox smoke test passes (no flex-shrink regression; ghost not clipped).
- [ ] Memory-leak test passes (`ApplicationRef.viewCount` stable across 100 cycles).
- [ ] **No `bs-datatable` source changes.**
- [ ] **No backend serializer code in the library.**

---

## Risks & Open Considerations

- **Scope is large.** 15 internal milestones, multi-month effort. Acknowledged.
- **Lit context with a recursive element is mildly unusual.** Inner `mp-query-builder` is both a context *consumer* (inherits outer's values) and a context *provider* (re-broadcasts to its own children, possibly with overrides). Verify with the `@lit/context` docs that nested provider/consumer chains work as expected; likely fine but worth a focused test.
- **`elementFromPoint` across shadow DOM**: modern browsers support `composedPath()` and `elementsFromPoint()` that pierce shadow roots. Test in Chromium + Firefox + WebKit if Playwright covers all three.
- **Cross-tree DnD with field reset**: when a *group* is moved across trees, every descendant condition must be checked individually for field validity. Performance is fine (these trees are small, single-digit nodes typically) but the logic is non-trivial — add a focused unit test.
- **Registration step uncertainty**: the previous code-review pass flagged `libs/mintplayer-ng-bootstrap/package.ts` as suspect — file only re-exports `package.json` today. M1 must verify the actual registration mechanism against the datetime-picker precedent before proceeding.
- **Custom-editor disposal is a NEW convention.** No precedent in this repo for disposing WC-mounted custom elements. Document the `EditorHandle` contract in the README + JSDoc so future contributors don't reinvent.
- **In-memory `evaluateQuery` semantics may diverge from a backend's actual DB semantics.** Document explicitly: `evaluateQuery` is the *frontend reference* for the UI's live preview / `[data]` filter / unit tests. Backends are free to define their own semantics (e.g., a SQL backend might use case-sensitive string compare by default where `evaluateQuery` is case-insensitive). The JSON wire format is the contract; semantics belong to each backend.
- **`maxDepth: Infinity` default** — there's no built-in protection against pathological trees. Consumers wanting protection should set a finite `maxDepth`.

---

## Build & Test Commands

```bash
# Build the library subproject
npx nx build mintplayer-ng-bootstrap

# Unit tests for the query-builder entry
npx nx test mintplayer-ng-bootstrap --testPathPattern=query-builder

# Demo app
npm start

# Playwright e2e
npx nx e2e ng-bootstrap-demo-e2e --testPathPattern=query-builder
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/datetime-picker/` — primary precedent for WC + wrapper layout + CVA pattern. Study the `effect()`-driven WC-property push + `writeValue` interplay before designing the `[(query)]`/CVA re-entrancy guard.
- `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts` — second wrapper precedent.
- `libs/mintplayer-ng-bootstrap/package.ts` and `ng-package.secondary.cjs` — registration mechanism to verify in M1.
- [[feedback_json_wire_format_only]] — architectural principle: frontend ships JSON tree only, no backend serializers.
- [[feedback_pointer_over_html5_dnd]], [[feedback_pointerdown_preventdefault]], [[feedback_touch_action_immutable]] — DnD ground rules.
- [[project_wc_aria_decisions]] — ARIA pattern + demo keymap requirement.
- [[feedback_wc_plus_angular_wrapper]] — packaging rationale.
- [[feedback_prd_unified_scope]] — multi-part feature shipping policy.
- [[feedback_computed_signals_in_template]] — derive transformations in `computed()`, not inline.
- [[feedback_no_imperative_iteration]] — use map/filter/flatMap; no forEach + accumulator.

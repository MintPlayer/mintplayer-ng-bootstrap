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

- `libs/mintplayer-ng-bootstrap/package.json` — add `@lit/context` to `peerDependencies` alongside `lit` (verified by re-review: not in deps today).
- **No changes to `libs/mintplayer-ng-bootstrap/package.ts`, `libs/mintplayer-ng-bootstrap/package.json` exports field, or `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs`.** Secondary-entry registration is auto-discovered by ng-packagr via the `**/ng-package.js` glob (verified against the datetime-picker precedent). The new entry only needs its own `ng-package.js`, `package.json`, `src/index.ts`, `tsconfig.lib.json`, `tsconfig.spec.json`, `vitest.config.ts` files — ng-packagr picks them up automatically on build.
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
- **Recursive WC + Lit Context** (three separate context tokens — `editorRegistryContext`, `disabledContext`, `messagesContext`): each `mp-query-builder` is BOTH a context consumer (inheriting from any outer `mp-query-builder` ancestor) AND a context provider (broadcasting the effective value to its descendants). The default `@lit/context` behaviour of "provider always wins, undefined included" is wrong here — we need "inner property overrides outer; otherwise inherit". Plumbing pattern:
  ```ts
  // In mp-query-builder.element.ts
  private _consumedRegistry = new ContextConsumer(this, { context: editorRegistryContext, subscribe: true });
  private _registryProvider = new ContextProvider(this, { context: editorRegistryContext, initialValue: undefined });
  willUpdate(changed: PropertyValues) {
    this._registryProvider.setValue(this.editorRegistry ?? this._consumedRegistry.value);
  }
  ```
  Per-token inheritance semantics:
  - `editorRegistry`: **override** — `this.editorRegistry ?? consumedRegistry`. Inner can replace outer entirely.
  - `disabled`: **OR** — `consumedDisabled || this.disabled`. A disabled outer disables the entire sub-tree; an inner can't re-enable.
  - `messages`: **merge** — `{ ...consumedMessages, ...this.messages }`. Per-key override.
- **Event bubbling**: `query-change`, `save-query`, `load-query`, `delete-query` CustomEvents fire with `bubbles: false`. Root `mp-query-builder` listens to its own internal mutation signals (Lit reactive controllers) and re-dispatches a single consolidated `query-change` event externally per user edit. Eliminates the N+1 event firing flagged in review.
- **Custom editors**: WC-level `editorRegistry: Record<string, (ctx: EditorContext) => EditorHandle>` property. `EditorHandle = { element: HTMLElement; dispose?: () => void }`. WC calls `handle.dispose?.()` on every removal path: field change, row remove, parent group remove (recursive), DnD reparent across schemas. Angular wrapper's `*bsQueryBuilderEditor` directive aggregates content children into the registry; each entry uses `ViewContainerRef.createEmbeddedView` and returns `{ element: view.rootNodes[0], dispose: () => view.destroy() }`. This is a NEW disposal convention in this repo; document it explicitly.
- **`ControlValueAccessor` re-entrancy**: `bs-query-builder` maintains a `writingFromForm: boolean` flag. `writeValue(tree)` sets the flag, writes to the `query` model signal, then clears the flag in a microtask. The `effect()` that propagates model changes to `onChange` early-returns when the flag is set. Prevents `writeValue → model → effect → onChange → FormControl → writeValue` infinite loop.
- **Drag-and-drop**:
  - Pointer events only (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`).
  - `touch-action: none` on drag handles ([[feedback_touch_action_immutable]]).
  - No `preventDefault()` on touch `pointerdown` ([[feedback_pointerdown_preventdefault]]).
  - **Ghost element rendered in `document.body`** (not in shadow DOM, to avoid clipping). `position: fixed`, `pointer-events: none`. Cleaned up on both `pointerup` and `pointercancel`. Access to `document.body` is gated by `typeof document !== 'undefined'` (per dock precedent — see `mint-dock-manager.element.ts`).
  - **Cycle prevention**: on `pointerdown`, precompute a `Set<string>` of the dragged node's descendant ids. Drop targets test against the set in O(1) per `pointermove`.
  - **Drop slots**: `[data-drop-slot]` elements rendered between every pair of children + at the top and bottom of every group's body. Empty groups render a min-height-32px drop slot with "Drop here" placeholder during drag.
  - **Half-line hit test**: `event.clientY < rect.top + rect.height/2` → insert above the row; else below.
  - **Shadow-DOM hit-test algorithm** (cross-browser): prefer `document.elementsFromPoint(x, y)` (plural form — returns the composed path, supported in Chromium / Firefox / modern WebKit). Walk the returned array looking for an element with `[data-drop-slot]`. Fallback for older WebKit: walk the precomputed set of `mp-query-builder` host elements; for each, call `host.shadowRoot.elementFromPoint(x, y)` and check that descendant chain for `[data-drop-slot]`. Cap the recursive descent at `maxDepth` levels.
  - **Cross-tree DnD**: drop slots tagged `data-qb-root="<rootId>"`. Drops across different `mp-query-builder` roots are accepted. The moved node retains its field/operator/value if the field exists in the target entity's schema; otherwise the field resets to the target's first field, operator resets to that field's first valid operator, value resets to empty. For group moves, walk all descendant conditions and apply the reset rule per condition.
  - **Cancellation on tree mutation**: the `DragController` subscribes to the WC's `query` property changes via Lit's `updated()` lifecycle. If the dragged `sourceId` is no longer present in the new tree (e.g., a programmatic `[(query)]` reset fires mid-drag), the controller calls its `pointercancel` cleanup path immediately: removes the ghost from `document.body`, resets internal state, dispatches no `moveNode`.
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

1. Add `@lit/context` to `libs/mintplayer-ng-bootstrap/package.json` `peerDependencies`. Run `npm install` to pull it.
2. Create `libs/mintplayer-ng-bootstrap/query-builder/` secondary entry point — copy from `datetime-picker/` config files (`ng-package.js`, `package.json`, `src/index.ts`, `tsconfig.lib.json`, `tsconfig.spec.json`, `vitest.config.ts`, `README.md`). The `ng-package.js` is a one-liner: `module.exports = require('../ng-package.secondary.cjs').secondaryEntry();`. No changes to parent `package.ts`, parent `package.json` exports, or `ng-package.secondary.cjs` (auto-discovery via `**/ng-package.js`).
3. Define `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType` (including `'array'`), `OperatorCatalog`, `SavedQuery`, `EditorContext`, `EditorHandle` in `model/`.
4. Define `TreeVisitor<T>` + `VisitorContext` in `visitor/visitor-types.ts` with `walkInner: () => T` on `subquery`.
5. Define Lit context tokens in `web-components/context.ts`: `editorRegistryContext`, `disabledContext`, `messagesContext`.
6. Define `emptyGroup()`, `emptyCondition()`, `emptySubquery()` factories + `cloneTree()` deep-clone.
7. Define `MaxDepthExceededError` (typed error thrown by `evaluateQuery` / `visitTree` / `renderExpression` when recursion exceeds `maxDepth`).
8. Verify `nx build mintplayer-ng-bootstrap` builds the empty entry point clean.

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
3. **Lit Context consume-and-provide plumbing**. Each `mp-query-builder` instantiates three pairs of `ContextConsumer` + `ContextProvider` (one pair per context token). In `willUpdate`, compute the effective value per token and write to the provider:
   - `editorRegistry` (override semantics): `effective = this.editorRegistry ?? this._consumedRegistry.value`
   - `disabled` (OR semantics): `effective = (this._consumedDisabled.value ?? false) || (this.disabled ?? false)`
   - `messages` (merge semantics): `effective = { ...(this._consumedMessages.value ?? {}), ...(this.messages ?? {}) }`
   Each provider has `subscribe: true` on its consumer so outer changes propagate reactively. Each condition / subquery consumes from the nearest provider (its own `mp-query-builder`).
4. `query-change`, `save-query`, `load-query`, `delete-query` CustomEvents fire with `bubbles: false`. Root WC tracks internal changes via Lit reactive controllers and re-dispatches a single consolidated `query-change` event externally per user edit.
5. Recursion-safe: sub-queries can contain sub-queries. **`maxDepth` input default `32`** (down from `Infinity` — see Risks). Exceeding `maxDepth` during render shows an inline "Tree too deep" placeholder for the violating subtree and emits a warning.

### Phase 8: Drag-and-drop reorder (within-group + cross-group + cross-tree)

1. Drag handles (`bi-grip-vertical`) on every condition row and group header.
2. `DragController` in `dnd/drag-controller.ts`:
   - `pointerdown` on handle → record `sourceId` + `descendantIds: Set<string>` + start position.
   - Create ghost by cloning the source row; gate on `typeof document !== 'undefined'`; append to `document.body`; `position: fixed; pointer-events: none; z-index: <high>`.
   - `pointermove` → translate ghost; resolve drop target via the shadow-DOM hit-test algorithm (see Architecture). Reject if target id ∈ `descendantIds` (cycle).
   - `pointerup` → if a valid target slot exists, dispatch `moveNode(tree, sourceId, targetParentId, targetIndex, targetSchema)`. Clean up ghost.
   - `pointercancel` → clean up ghost; no move dispatched.
3. `touch-action: none` on handles.
4. **Drop slots** (`dnd/drop-zone.ts`): rendered between every pair of children + at top/bottom of every group's body. Tagged with `data-drop-slot` + `data-qb-root="<rootId>"` + `data-parent-id` + `data-index`. Visible only during a drag. Empty group renders a min-height-32px placeholder.
5. **Half-line hit-test**: `event.clientY < rect.top + rect.height/2` → insert above; else below.
6. **Cross-group reparenting**: drop into another group's slot moves the node; node `kind` and contents preserved.
7. **Cross-tree DnD** (across `mp-query-builder` roots): drops across `data-qb-root` boundaries accepted. On drop, `moveNode` is invoked with the target schema. If the moved node's field exists in target schema → keep field/operator/value. Else → reset to target's first field, first valid operator, empty value. Sub-tree moves (groups) walk all descendant conditions and apply the same reset rule per condition.
8. **Cancellation on tree mutation**: in the WC's `updated(changedProps)`, if `changedProps.has('query')` and the drag is active and `sourceId` is not present in the new tree (use `findNodeById(newTree, sourceId)`), invoke `controller.cancel()` (same path as `pointercancel`): remove ghost, reset internal state, no `moveNode` dispatched.

### Phase 9: Expression preview rendering

1. `renderExpression(tree, schema, messages?)` in `preview/render-expression.ts` — pure function returning human-readable string with parentheses.
2. Render relative date ops as their localized labels (e.g. "Order date is in the last 7 days").
3. Render array ops with bracketed value lists (e.g. "Tags any of [urgent, blocked]").
4. Exposed as a separate export.
5. Rendered at the top of the WC's host inside a `<pre>` block (toggleable via `[showPreview]`, default `false`).

### Phase 10: `evaluateQuery` helper

1. `evaluateQuery(tree, record, schema, options?): boolean` — pure function.
2. **Implements the canonical semantics defined in PRD Appendix A.** Every operator's algorithm matches that table exactly so backend implementers can reuse the same rules.
3. Operator coverage:
   - All comparison ops (equals, lt, gt, between, etc.).
   - **Relative date ops** — evaluated against `options.now ?? new Date()`, **boundaries in UTC**, **ISO 8601 week start (Monday)** per Appendix A.
   - **Array ops** — `any-of` (intersection non-empty), `all-of` (superset), `none-of` (disjoint), `is-empty` / `is-not-empty`.
4. Sub-queries: optional `getRelatedRecords(record, fieldName): unknown[]` callback. `in` → true if at least one related record matches the sub-tree; `not-in` → true if zero match.
5. NULL semantics: `equals`/`lt`/`gt`/`between` against `null` → `false`. Only `is-null`/`is-not-null` match nullness.
6. String comparisons: case-insensitive by default; `EvaluateOptions { caseSensitive?: boolean; now?: Date; getRelatedRecords?: ...; maxDepth?: number }`.
7. **Recursion bound**: walker tracks depth; if `depth > (options.maxDepth ?? 32)` at any point, throws `MaxDepthExceededError`. Bounded by default so deep-nesting attacks can't stack-overflow the demo or unit-test runner.
8. Unit tests cover every operator × every applicable type × null × sub-query. **One property-based test** (fast-check or hand-rolled) generates ~200 random valid trees + random records and asserts `evaluateQuery` (a) doesn't throw unexpectedly and (b) respects monotonicity (adding an AND clause never increases the match set).

### Phase 11: Visitor API (lazy `walkInner`)

1. `visitTree<T>(tree, visitor, ctx, options?): T` in `visitor/visit-tree.ts`.
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
3. Walker is called via `visitTree(tree, visitor, { schema, rootEntity }, { maxDepth: 32 })`.
4. Tracks `depth` in `VisitorContext`; throws `MaxDepthExceededError` if depth exceeds `options.maxDepth ?? 32` at any point.
5. Used in-tree by `evaluateQuery` (eager — calls `walkInner()` immediately) and `renderExpression` (eager).
6. Exported for consumers who want to write their own JS-side transformations (debug printers, simplifiers, pre-validators).

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
7. **`[operatorOverrides]` validation**: in the wrapper, run a `validateOperatorOverrides(schema, overrides)` helper that intersects each `Operator[]` with `OperatorCatalog[field.type]` for the named field. Log a `console.warn` (with field name + offending operators) on (a) operators not in the catalog for that field's type, (b) operator-set fully empty after intersection. The validation does not throw; the WC silently uses the intersected (valid) set. Export `validateOperatorOverrides` for consumers who want compile-time-ish checking.
8. **`[data]` + `(filteredResult)` with debounce + memoization**:
   - Debounce: a `setTimeout(... , 100)` scheduled on every `query()` change; cleared if another change arrives before it fires. After settling, the filter recomputes once.
   - Memoization: cache `(treeIdentity, dataIdentity)` → `filteredResult`. Tree identity = the root `Group.id` plus a depth-checked structural hash on dirty (NOT a deep equality every time — too expensive). Data identity = the input array's reference identity (immutable updates from the consumer are expected). On cache hit, emit the cached result without recomputing.
   - Add a perf acceptance test (Phase 15): 10k-row dataset × ~10-node tree filter completes < 50 ms after the 100 ms debounce settles.
9. Re-export public types: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EvaluateOptions`, `EditorContext`, `EditorHandle`, `SavedQuery`, `TreeVisitor`, `VisitorContext`, `MaxDepthExceededError`, `validateOperatorOverrides`.

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
- [ ] `@lit/context` added to `libs/mintplayer-ng-bootstrap/package.json` peerDependencies in M1.
- [ ] Lit Context override semantics tested (Phase 15.2): inner inherits when its prop is unset, overrides when set, reverts to inherited on clear.
- [ ] `maxDepth` default is `32` (finite). `evaluateQuery` / `visitTree` / `renderExpression` throw `MaxDepthExceededError` when exceeded.
- [ ] `validateOperatorOverrides(schema, overrides)` exported; wrapper logs `console.warn` on invalid override entries; runtime uses only the intersected (valid) set.
- [ ] `(filteredResult)` debounced 100ms + memoized by tree+data identity; 10k rows × 10-node tree filters in < 50 ms after debounce.
- [ ] Shadow-DOM hit-test algorithm spec'd and tested across Chromium / Firefox / WebKit.
- [ ] DnD cancellation on tree mutation: programmatic `[(query)]` reset mid-drag cleans up ghost and dispatches no `moveNode`.
- [ ] `document.body` access guarded by `typeof document !== 'undefined'` (per dock precedent).

---

## Risks & Open Considerations

- **Scope is large.** 15 internal milestones, multi-month effort. Acknowledged.
- **Lit Context recursive provider/consumer requires explicit plumbing.** The default `@lit/context` behaviour is "the nearest provider wins, even if its value is undefined." Our spec requires "inner overrides outer; otherwise inherit". The fix is a per-token `ContextConsumer` + `ContextProvider` pair on every `mp-query-builder`, with the provider's value computed from `this.<prop> ?? consumer.value` (or merge / OR for `messages` / `disabled`). Spec'd in Phase 7.3; Phase 15.2 test asserts (a) inner inherits when its own prop is unset, (b) inner overrides when its own prop is set, (c) clearing the inner's prop reverts to inherited.
- **Cross-browser `elementFromPoint` across shadow DOM**: modern Chromium/Firefox/WebKit support `document.elementsFromPoint()` (plural — returns composed path). Older WebKit (pre-2024) only returns the host. Fallback algorithm spec'd in Architecture §Drag-and-drop.
- **Cross-tree DnD with field reset silently destroys values**: moving a 10-condition group across schemas resets 10 field/value assignments with no consent UI. Acceptable as v1; if user feedback complains, add a `(moveRequiresFieldReset)` event consumers can intercept.
- **Custom-editor disposal is a NEW convention.** No precedent in this repo for disposing WC-mounted custom elements. Document the `EditorHandle` contract in the README + JSDoc so future contributors don't reinvent.
- **In-memory `evaluateQuery` semantics may diverge from a backend's actual DB semantics.** `evaluateQuery` implements the canonical semantics from PRD Appendix A; backend implementers should refer to that appendix so their query language matches. If a backend deliberately diverges (e.g., case-sensitive string compare), document in the backend's own README per PRD Appendix F.
- **`@lit/context` is NOT yet a workspace dep.** M1 must add it to `libs/mintplayer-ng-bootstrap/package.json` `peerDependencies` before any WC code references it.
- **Saved-query name collision**: component does not dedupe. `(saveQuery)` fires regardless of whether the name exists; consumer's store decides overwrite / prompt / reject. Demo's localStorage example demonstrates overwrite-with-confirm as the reference pattern.

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

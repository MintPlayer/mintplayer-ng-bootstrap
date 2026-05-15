# Development Plan: Issue #312

**Issue**: #312
**Title**: Query Builder
**Type**: Feature (new component) + small cross-cutting addition to `bs-datatable`
**Priority**: Medium
**PRD**: [`docs/issue_312_PRD.md`](./issue_312_PRD.md)

## Executive Summary

Add `bs-query-builder` to `libs/mintplayer-ng-bootstrap` — a visual builder for composing arbitrarily nested AND/OR boolean queries, modelled on [Infragistics Ignite UI Angular `igxQueryBuilder`](https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder) and shipped **fully-fledged** in one PR.

Shipped as **Lit web component (`mp-query-builder`) + Angular wrapper (`bs-query-builder`)** colocated inside the new `libs/mintplayer-ng-bootstrap/query-builder` secondary entry point, matching the precedent set by `bs-datetime-picker` (#332).

In addition to the canonical Infragistics surface (nested AND/OR groups, multi-entity sub-queries via `in`/`not-in`, built-in value editors per data type, expression preview, drag-and-drop reorder including cross-group reparenting), this release ships:

- **`ControlValueAccessor`** on the Angular wrapper for `[(ngModel)]` / `[formControl]` integration.
- **Built-in dataset binding** — `[data]` + `(filteredResult)` for in-memory filter scenarios (wraps the exported `evaluateQuery` helper).
- **Visitor API** (`visitTree(tree, visitor)`) plus five **reference serializers**: SQL, OData v4, LINQ (TypeScript predicate), Mongo `$filter`, GraphQL Hasura-style `where`. Each is a pure-function module under `libs/mintplayer-ng-bootstrap/query-builder/serializers/`, individually importable.
- **Custom value editors** via a WC-level factory callback (`[editorRegistry]`) and an Angular-wrapper TemplateRef sugar (`[editors]` map of `TemplateRef`) that desugars to factory callbacks internally — so consumers in any framework get extensibility, and Angular consumers get template-syntax DX.
- **Saved-query event model** — `(saveQuery)` / `(loadQuery)` / `(deleteQuery)` outputs + `[savedQueries]` input. The component does not own storage; consumers persist however they like.
- **`bs-datatable` `[filterTree]` input** — `bs-datatable` gains a small additive input that internally calls `evaluateQuery` on each row. Cleanly pipes query-builder output into datatable filtering with one line of consumer template.

This is a deliberately large diff — phased internally as 16 milestones inside one branch, not split across releases (per [[feedback_prd_unified_scope]]).

---

## Problem Statement

### Current Behavior

`@mintplayer/ng-bootstrap` has no query builder. Consumers wanting a visual filter UI must compose `bs-datatable` filter inputs ad-hoc (no AND/OR grouping, no nesting), or roll their own component. There is no canonical JSON shape for "a boolean expression tree" in the library, so backend integrations diverge on the wire format. Consumers targeting SQL, OData, LINQ, Mongo, or GraphQL backends each reinvent the same serializer.

### Expected Behavior

A new secondary entry point `@mintplayer/ng-bootstrap/query-builder` exports `bs-query-builder` (Angular) backed by `mp-query-builder` (Lit). The component renders a Bootstrap-styled tree of groups, conditions, and sub-queries; emits a canonical JSON `Expression` tree via two-way `[(query)]`; integrates with Angular reactive forms via `ControlValueAccessor`; optionally filters an in-memory dataset via `[data]` + `(filteredResult)`; and lets consumers either project custom editors per field or use the built-in editor for each data type.

A separately importable serializer sub-package ships five reference serializers (SQL, OData v4, LINQ, Mongo, GraphQL Hasura). A `visitTree(tree, visitor)` walker is exposed for custom backends.

`bs-datatable` gains a single new input — `[filterTree]: Expression | null` — that internally consults `evaluateQuery` per row. Wiring is one line in consumer templates: `<bs-datatable [data]="rows" [filterTree]="query()">`.

### Impact

- Closes a major gap relative to Infragistics / DevExpress / Syncfusion competitor libraries.
- Establishes a canonical JSON expression-tree shape that other library components can adopt as a filter input.
- Removes the most common consumer pain point of converting a builder UI's output into a backend query (5 reference serializers covering the most common stacks).
- First library component to use multi-level drag-and-drop reordering including reparenting — exercises [[feedback_pointer_over_html5_dnd]] at scale.

---

## Technical Analysis

### New files (high level)

```
libs/mintplayer-ng-bootstrap/query-builder/                            NEW PACKAGE
├── src/
│   ├── index.ts                                          # public re-exports
│   └── lib/
│       ├── web-components/
│       │   ├── mp-query-builder.element.ts               # root WC — holds the tree
│       │   ├── mp-query-builder.element.html
│       │   ├── mp-query-builder.element.scss
│       │   ├── mp-query-group.element.ts                 # group (AND/OR) row
│       │   ├── mp-query-group.element.html
│       │   ├── mp-query-group.element.scss
│       │   ├── mp-query-condition.element.ts             # field/op/value row
│       │   ├── mp-query-condition.element.html
│       │   ├── mp-query-condition.element.scss
│       │   ├── mp-query-subquery.element.ts              # in/not-in + nested mp-query-builder
│       │   ├── mp-query-subquery.element.html
│       │   ├── mp-query-subquery.element.scss
│       │   └── value-editors/
│       │       ├── mp-qb-string-editor.element.ts
│       │       ├── mp-qb-number-editor.element.ts
│       │       ├── mp-qb-date-editor.element.ts
│       │       ├── mp-qb-datetime-editor.element.ts
│       │       ├── mp-qb-boolean-editor.element.ts
│       │       ├── mp-qb-enum-editor.element.ts
│       │       └── mp-qb-list-editor.element.ts
│       ├── components/
│       │   ├── query-builder.component.ts                # bs-query-builder (Angular wrapper, CVA + TemplateRef sugar)
│       │   ├── query-builder.component.html
│       │   ├── query-builder.component.scss
│       │   └── query-builder-editor.directive.ts         # *bsQueryBuilderEditor="fieldName" structural directive
│       ├── model/
│       │   ├── expression.ts                             # Expression discriminated union
│       │   ├── field-def.ts                              # FieldDef, EntitySchema types
│       │   ├── operators.ts                              # OperatorCatalog per data type
│       │   ├── tree-ops.ts                               # immutable add/remove/update/move helpers
│       │   └── default-tree.ts                           # `emptyGroup()` / `emptyCondition()`
│       ├── evaluator/
│       │   ├── evaluate-query.ts                         # exported helper
│       │   └── evaluate-query.spec.ts
│       ├── visitor/
│       │   ├── visit-tree.ts                             # generic walker — `visitTree(tree, visitor)`
│       │   └── visitor-types.ts                          # TreeVisitor<T> contract
│       ├── serializers/
│       │   ├── index.ts                                  # re-exports
│       │   ├── to-sql.ts                                 # ANSI-SQL-ish predicate with parameterised args
│       │   ├── to-odata.ts                               # OData v4 `$filter` expression
│       │   ├── to-linq.ts                                # TypeScript predicate `(row) => boolean` (uses evaluateQuery)
│       │   ├── to-mongo.ts                               # Mongo `$match` / `$filter` object
│       │   └── to-graphql.ts                             # Hasura/Prisma-style `where` object
│       ├── preview/
│       │   └── render-expression.ts                      # tree → human-readable string
│       └── i18n/
│           └── default-messages.ts                       # operator labels (EN)
├── ng-package.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── vitest.config.ts
└── README.md

libs/mintplayer-ng-bootstrap/datatable/                                MODIFIED
└── src/lib/components/datatable/datatable.component.ts                # + [filterTree] input
└── src/lib/components/datatable/datatable.component.html              # filter-aware row rendering

apps/ng-bootstrap-demo/src/app/pages/advanced/query-builder/           NEW
├── query-builder.component.ts
├── query-builder.component.html
└── query-builder.component.scss

apps/ng-bootstrap-demo-e2e/src/query-builder.spec.ts                   NEW
```

### Files to modify

- `libs/mintplayer-ng-bootstrap/package.ts` — register the new secondary entry point.
- `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs` — register `./query-builder`.
- `libs/mintplayer-ng-bootstrap/datatable/src/...` — add `[filterTree]: Expression | null` input + integration with row filtering.
- `apps/ng-bootstrap-demo/src/app/app.routes.ts` (or equivalent) — add `/advanced/query-builder` route.
- `apps/ng-bootstrap-demo/src/app/components/sidebar` (or wherever the nav lives) — link the demo page.

### Dependencies

- `lit` (already a workspace dep for dock / scheduler / datetime-picker WCs).
- No new runtime dependencies. Drag-and-drop uses native pointer events (per [[feedback_pointer_over_html5_dnd]]).

### Architecture Considerations

- **Tree representation** — plain JSON discriminated union, `kind: 'group' | 'condition' | 'subquery'`. Serializable round-trip. See PRD §Data Model.
- **WC ownership** — the WC owns the tree, edit gestures, and rendering. The Angular wrapper bridges signals (input/output/model) to WC properties + custom events, mirroring `bs-scheduler` (see `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts`).
- **Custom editors** —
  - **At the WC layer**: a `editorRegistry` property maps `fieldName → (ctx: EditorContext) => HTMLElement`. The WC calls the factory once per condition and re-uses the returned element until the condition's field changes.
  - **At the Angular layer**: the wrapper accepts an `@ContentChildren(QueryBuilderEditorDirective)` query of `*bsQueryBuilderEditor="fieldName"` structural directives. The wrapper converts each `TemplateRef` to a factory callback that creates a portaled view and returns its host element. This is the "TemplateRef sugar" — Angular DX with WC-level fallback for non-Angular consumers.
- **Editors per data type (built-in)** — Infragistics-equivalent. Per data type, the WC renders one of seven editors (string / number / integer / date / datetime / boolean / enum / multi-select-list) when no custom editor is registered for that field.
- **Operators per type** — a static catalog (`OperatorCatalog`) maps each `FieldType` → allowed operators. Consumers can pass a `[operatorOverrides]` input to restrict operators per field, but cannot add new operator semantics in v1.
- **Drag-and-drop, including cross-group** — pointer events only (`pointerdown` / `pointermove` / `pointerup`), `touch-action: none` on drag handles (per [[feedback_touch_action_immutable]]), no `preventDefault()` on touch pointerdown (per [[feedback_pointerdown_preventdefault]]). Cross-group drops are accepted; the moved node's `kind` is preserved (a `Condition` stays a `Condition`; only its parent group changes).
- **Visitor API** — `visitTree<T>(tree: Expression, visitor: TreeVisitor<T>): T`. Visitor pattern: callbacks for `enterGroup` / `exitGroup` / `condition` / `subquery`. Each returns a `T` and the parent reduces children's `T`s. All 5 reference serializers are implemented as `TreeVisitor` instances.
- **`evaluateQuery` and `[filterTree]`** — `evaluateQuery` is exported as a pure function. The WC's `[data]` + `(filteredResult)` and `bs-datatable`'s new `[filterTree]` input both consume it internally. Single source of truth for evaluation semantics.
- **`ControlValueAccessor`** — `bs-query-builder` implements `ControlValueAccessor` so `[(ngModel)]` and `[formControl]` work. `writeValue(tree | null)` updates the model signal; `registerOnChange(fn)` wires the callback to the model effect; `setDisabledState(state)` toggles a `disabled` input on the WC that disables all interactive controls.
- **Saved-query events** — `(saveQuery): EventEmitter<{ name: string; tree: Expression }>`, `(loadQuery): EventEmitter<{ name: string }>`, `(deleteQuery): EventEmitter<{ name: string }>`. Combined with an `[savedQueries]: SavedQuery[]` input that drives the picker dropdown UI. Component does not persist anything; consumer writes to localStorage / IndexedDB / REST as preferred.
- **Theming** — internal Lit styles use CSS custom properties keyed off the repo's theme system (dark-mode toggle from #324). All visible colors / borders / focus rings inherit from the theme.
- **A11y** — `role="group"` on every group node with `aria-label="AND group"` / `"OR group"`; native focus order through form controls; condition rows do **not** use `role="treeitem"`. Demo page must show the keymap per [[project_wc_aria_decisions]].
- **i18n** — operator labels, group toggle labels, and saved-query action labels are translatable via `[messages]` input on the Angular wrapper. WC defaults to English.

---

## Implementation Plan

Phases are **internal milestones inside one PR**, not separate releases.

### Phase 1: Data model + scaffold

1. Create `libs/mintplayer-ng-bootstrap/query-builder/` secondary entry point (mirror `datetime-picker/` config files).
2. Define `Expression` discriminated union, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `SavedQuery`, `EditorContext` in `model/`.
3. Define `emptyGroup()`, `emptyCondition()`, `emptySubquery()` factory helpers + a `cloneTree()` deep-clone.
4. Define `TreeVisitor<T>` contract in `visitor/visitor-types.ts`.
5. Register the new entry in `package.ts` and `ng-package.secondary.cjs`.
6. Verify `nx build mintplayer-ng-bootstrap` builds the empty entry point clean.

### Phase 2: Lit WC scaffold — read-only tree rendering

1. Implement `mp-query-builder.element.ts` (root WC) — accepts `query`, `schema`, `rootEntity`, `disabled`, `editorRegistry` properties.
2. Implement `mp-query-group.element.ts`, `mp-query-condition.element.ts`, `mp-query-subquery.element.ts` — read-only render.
3. Verify recursive rendering against a hand-written test tree (group → group → condition / subquery → group → condition).

### Phase 3: Built-in value editors per data type

1. Implement the seven Lit editors: string, number, integer, date, datetime, boolean (tri-state), enum (single-select), list (multi-select).
2. Wire `mp-query-condition.element.ts` to pick the right editor based on `field.type` — unless an `editorRegistry[field.name]` factory is registered (Phase 4).

### Phase 4: Custom editor extensibility (factory callback)

1. Add `editorRegistry: Record<string, (ctx: EditorContext) => HTMLElement>` property on `mp-query-builder.element.ts`.
2. In `mp-query-condition.element.ts`, prefer the registered factory over the built-in editor.
3. Pass `EditorContext` = `{ field, operator, value, onChange(next), record? }` to factories. `record?` is undefined; reserved for future row-context-aware editors.
4. When the condition's field changes, dispose the old custom editor element (call `(el as any).dispose?.()` if defined; otherwise just `remove()`) and re-invoke the factory.

### Phase 5: Edit mode — mutations through tree

1. Add `mp-query-condition` controls: field selector, operator selector (filtered by `OperatorCatalog[fieldType]`), value editor (Phase 3 / Phase 4), remove button.
2. On any control change, emit a `query-change` CustomEvent from the root WC with a freshly cloned tree (immutable update — never mutate the input).
3. Add `mp-query-group` controls: AND/OR toggle, "Add condition" / "Add group" / "Add sub-query" buttons, remove button (disabled on root).
4. Implement immutable tree-update helpers in `model/tree-ops.ts`: `addChild(tree, parentId, child)`, `removeChild(tree, nodeId)`, `updateCondition(tree, nodeId, patch)`, `setGroupLogic(tree, nodeId, logic)`, `moveNode(tree, nodeId, targetParentId, targetIndex)`.
5. Assign stable `id` (uuid) to every node at creation.

### Phase 6: Operator catalog + per-type operator filtering

1. Author `OperatorCatalog` covering all PRD-specified operators per type.
2. `between` / `not-between` operators take a **two-value** payload — value editor renders two inputs. Reflected in `Condition.value` as a tuple.
3. `in` / `not-in` operators take an array value — value editor is the multi-select tag input (unless overridden by a custom editor for that field).
4. Operator dropdown filters by `OperatorCatalog[field.type]`; switching field auto-resets operator + value if the previous operator isn't valid for the new type.

### Phase 7: Nested groups + sub-queries

1. Allow `add group` to insert a nested `Group` at any depth.
2. Allow `add sub-query` to insert a `SubQueryCondition`. The sub-query field is a relation field; operator fixed to `in` / `not-in`; value is an entire nested `Group` rooted on `targetEntity`'s schema.
3. The nested `<mp-query-builder>` inside a `SubQuery` swaps `rootEntity` to the target.
4. Recursion-safe: sub-queries can contain sub-queries. `maxDepth` input (default `Infinity`).

### Phase 8: Drag-and-drop reorder (within-group + cross-group)

1. Add a grab-handle (`bi-grip-vertical`) on every condition row and group header.
2. Implement a pointer-events-based DnD primitive:
   - `pointerdown` on handle → record source node id + start position.
   - `pointermove` → translate a floating "drag ghost" element; compute hover target by intersecting with sibling and **other-group child** node bounding rects.
   - `pointerup` → if target ≠ source, dispatch a `move-node` update via `moveNode(tree, sourceId, targetParentId, targetIndex)`.
3. `touch-action: none` on the handle element.
4. **Cross-group reparenting**: dropping a node into a different group's body changes its parent group; the node's `kind` and internal contents are preserved (a `Condition` stays a `Condition`; a `Group` retains its full subtree).
5. Visual feedback during hover: the target group's outline highlights; the proposed drop-index gap shows an insertion line.
6. Self-drop into descendant is blocked (would create a cycle for groups).

### Phase 9: Expression preview rendering

1. Implement `renderExpression(tree, schema, messages)` in `preview/render-expression.ts` — pure function.
2. Expose as a separate export.
3. Render the preview at the top of the WC's host inside a `<pre>` block (toggleable via `[showPreview]` input, default `false`).

### Phase 10: `evaluateQuery` helper

1. Implement `evaluateQuery(tree, record, schema, options?): boolean` — pure function.
2. Walks the tree; evaluates each condition per the operator.
3. Sub-queries: `evaluateQuery` accepts an optional `getRelatedRecords(record, fieldName): Record[]` callback. Sub-query `in` → `true` if at least one related record matches the sub-tree.
4. NULL semantics: `equals`/`lt`/`gt` against `null` value → `false`. `is-null` / `is-not-null` are the only operators that match nullness.
5. String comparisons: case-insensitive by default; `EvaluateOptions { caseSensitive?: boolean }` second argument.
6. Unit tests cover every operator × every data type × null × sub-query cases.

### Phase 11: Visitor API + 5 reference serializers

1. Implement `visitTree<T>(tree, visitor): T` in `visitor/visit-tree.ts`. Visitor contract:
   ```ts
   interface TreeVisitor<T> {
     condition(node: Condition, ctx: VisitorContext): T;
     subquery(node: SubQueryCondition, inner: T, ctx: VisitorContext): T;
     group(node: Group, children: T[], ctx: VisitorContext): T;
   }
   ```
2. Implement `toSql(tree, schema): { sql: string; params: unknown[] }` — ANSI-SQL-ish with `?` placeholders for values; group → `(... AND/OR ...)`; sub-query → `field IN (SELECT ... FROM target WHERE ...)`. Case-insensitive `LIKE` for string operators with `%` wildcards.
3. Implement `toODataFilter(tree, schema): string` — OData v4 `$filter` syntax (e.g. `Total gt 100 and (Status eq 'open' or Status eq 'pending')`). Sub-queries use `any(o: ...)` lambda.
4. Implement `toLinqPredicate(tree, schema): (row) => boolean` — delegates to `evaluateQuery` internally. This is the in-process predicate compiler.
5. Implement `toMongoFilter(tree, schema): Record<string, unknown>` — `$and` / `$or` / `$eq` / `$gt` / `$in` / `$elemMatch` for sub-queries.
6. Implement `toGraphQLWhere(tree, schema): Record<string, unknown>` — Hasura/Prisma nested-object dialect: `{ _and: [...] }`, `{ _or: [...] }`, `{ field: { _eq: value } }`. Sub-queries use the relation field shape.
7. Each serializer is individually importable: `import { toSql } from '@mintplayer/ng-bootstrap/query-builder/serializers/sql'`.
8. Unit tests: snapshot tests of a non-trivial tree serialized by each.

### Phase 12: Saved queries — events-only API

1. Add WC inputs: `savedQueries: SavedQuery[]` (default `[]`).
2. Add WC outputs: `save-query`, `load-query`, `delete-query` CustomEvents.
3. Render a saved-query picker dropdown at the top of the WC's host (toggleable via `[showSavedQueries]` input, default `false`).
4. Saved-query dropdown items: list of `savedQueries` with a load button per row + delete button. A "Save current as..." action at the top opens a name input → fires `save-query` event with `{ name, tree }`.
5. No persistence inside the WC. Consumer wires `[savedQueries]="storedQueries()"` + `(saveQuery)="persist($event)"`.

### Phase 13: Angular wrapper

1. Implement `bs-query-builder` mirroring `bs-scheduler`'s pattern.
2. Inputs: `[schema]`, `[rootEntity]`, `[messages]`, `[showPreview]`, `[showSavedQueries]`, `[maxDepth]`, `[savedQueries]`, `[operatorOverrides]`, `[disabled]`, `[data]`.
3. Models: `[(query)]`.
4. Outputs: `(queryChange)`, `(saveQuery)`, `(loadQuery)`, `(deleteQuery)`, `(filteredResult)` (emits when `[data]` is set and `[(query)]` changes — values are the records that match).
5. **`ControlValueAccessor`** implementation: `writeValue(tree | null)` writes to `query` model; `registerOnChange(fn)` wires `query()` changes; `setDisabledState(state)` toggles the `disabled` input on the WC.
6. **TemplateRef editor sugar**: `@ContentChildren(QueryBuilderEditorDirective)` projects the registered templates into an `editorRegistry` map. Each template's `*bsQueryBuilderEditor="fieldName"` directive registers a factory that uses `ViewContainerRef.createEmbeddedView(templateRef, ctx)` to mount the template, returning the view's `rootNodes[0]` for the WC to insert.
7. Re-export types from the package: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EvaluateOptions`, `EditorContext`, `SavedQuery`, `TreeVisitor`.

### Phase 14: `bs-datatable` `[filterTree]` integration

1. Add `[filterTree]: Expression | null` input on `bs-datatable`.
2. Add `[filterSchema]: EntitySchema` input — needed so `evaluateQuery` can resolve field types.
3. When `filterTree` is set, the datatable's internal row pipeline runs `evaluateQuery(tree, row, schema)` per row in addition to any existing filter / sort logic.
4. Backwards-compatible: `[filterTree]` is optional; existing datatable consumers see no change.
5. Document the integration in `bs-datatable`'s README.

### Phase 15: Demo page

1. New demo page at `apps/ng-bootstrap-demo/src/app/pages/advanced/query-builder/`.
2. Examples:
   - **Single-entity basics** (Orders schema).
   - **Pre-loaded tree** demonstrating nested AND/OR groups.
   - **Multi-entity sub-query** (Customers + Orders).
   - **Live evaluation** via `[data]` + `(filteredResult)`.
   - **`bs-datatable` integration** — same query drives `[filterTree]` on a datatable below the builder.
   - **Custom editor** — `*bsQueryBuilderEditor="orderDate"` projecting `bs-datepicker` into the WC.
   - **Reactive forms** — same builder bound via `[formControl]`, showing `valueChanges` stream.
   - **Saved queries** — wired to `localStorage` in the demo (illustrates the events-only model).
   - **Serializer tabs** — live JSON output for all 5 serializers as the user edits the tree.
3. Document the keymap on the demo page.

### Phase 16: Testing + a11y validation

1. **Unit tests** (Vitest):
   - Tree ops (`addChild`, `removeChild`, `updateCondition`, `moveNode` — including cross-group moves and self-descendant cycle blocking).
   - `evaluateQuery` — every operator × type × null × sub-query case.
   - `renderExpression` — snapshot tests.
   - All 5 serializers — snapshot tests of a shared canonical tree.
   - Operator catalog — every type has a non-empty operator list; `between` reflects two-value editor; `in` reflects list-value editor.
2. **WC unit tests** — happy-path field/op/value selection round-trips through `query-change`; cross-group DnD reorder.
3. **Angular wrapper unit tests** — `[(query)]` two-way, `[formControl]` round-trip, `setDisabledState`, `*bsQueryBuilderEditor` TemplateRef projection, `(saveQuery)` event payload.
4. **Playwright e2e** (`apps/ng-bootstrap-demo-e2e/src/query-builder.spec.ts`):
   - Build a flat AND query; assert preview.
   - Build a nested OR group; assert tree shape via `evaluateQuery`.
   - Build a sub-query across entities; assert matching row count.
   - Drag a condition across groups; assert tree shape.
   - Switch field — assert operator/value reset.
   - Bind via `[formControl]` — assert `valueChanges`.
   - Save a query, refresh, load it — assert tree restored (via localStorage in the demo).
   - Switch serializer tabs — assert each serializer renders the expected output for a known tree.
   - Use `await page.waitForLoadState('networkidle')` after `goto` per [[project_e2e_destructive_bootstrap]].
5. **axe-core** — zero serious findings on the demo page.
6. **Firefox smoke test** — verify drag handles don't shrink in flex containers ([[feedback_firefox_flex_shrink]]); verify cross-group drop animations don't tear.

---

## Test Scenarios

### Scenario 1: Build a flat AND query
- **Given**: Empty tree, Orders schema, demo page.
- **When**: User clicks "Add condition" twice, picks `total > 100` and `status = "open"`.
- **Then**: Preview reads `Total > 100 AND Status = "open"`. `evaluateQuery` returns `true` for `{ total: 150, status: "open" }`.

### Scenario 2: Nested group with OR
- **Given**: Existing condition `total > 100`.
- **When**: User adds a nested group with two conditions on `status`, toggles to OR.
- **Then**: Preview reads `Total > 100 AND (Status = "open" OR Status = "pending")`.

### Scenario 3: Sub-query across entities
- **Given**: Customers + Orders schemas; root entity = Customers.
- **When**: User adds a sub-query on `orders` relation with `total > 100`.
- **Then**: Tree contains a `SubQueryCondition`; `evaluateQuery` (with `getRelatedRecords` wired) returns `true` for customers with at least one matching order.

### Scenario 4: Cross-group drag-and-drop reparenting
- **Given**: Tree with two groups, each containing one condition.
- **When**: User drags the condition from Group A into Group B via the grab handle.
- **Then**: Group A is now empty; Group B contains two conditions in DOM order matching the drop position; original node `id` preserved.

### Scenario 5: Switching field resets operator + value
- **Given**: Condition with `total > 100`.
- **When**: User changes field from `total` (number) to `status` (string).
- **Then**: Operator resets, value resets.

### Scenario 6: `[formControl]` round-trip
- **Given**: `bs-query-builder` bound via `[formControl]="ctrl"` to a `FormControl<Expression | null>`.
- **When**: User edits the tree.
- **Then**: `ctrl.valueChanges` emits the new tree. `ctrl.setValue(otherTree)` updates the builder's UI. `ctrl.disable()` disables all interactive controls.

### Scenario 7: Custom editor projection
- **Given**: Schema has a `orderDate: 'date'` field. Demo projects `<bs-datepicker *bsQueryBuilderEditor="'orderDate'"></bs-datepicker>` into the wrapper.
- **When**: User adds a condition on `orderDate`.
- **Then**: The value editor is `bs-datepicker`, not the built-in date input. Selecting a date emits `query-change`.

### Scenario 8: All 5 serializers
- **Given**: Canonical tree: `total > 100 AND status IN ("open", "pending")`.
- **When**: Each serializer is invoked.
- **Then**:
  - `toSql` → `Total > ? AND Status IN (?, ?)` + `params: [100, "open", "pending"]`
  - `toODataFilter` → `Total gt 100 and (Status eq 'open' or Status eq 'pending')`
  - `toLinqPredicate(row)` → `row.total > 100 && ["open","pending"].includes(row.status)`
  - `toMongoFilter` → `{ $and: [ { total: { $gt: 100 } }, { status: { $in: ["open","pending"] } } ] }`
  - `toGraphQLWhere` → `{ _and: [ { total: { _gt: 100 } }, { status: { _in: ["open","pending"] } } ] }`

### Scenario 9: Saved-query event flow
- **Given**: Demo wires `(saveQuery)` to `localStorage.setItem`. Empty initial state.
- **When**: User builds a query, clicks Save, enters name `"Big open orders"`, then refreshes and clicks Load.
- **Then**: After refresh, `[savedQueries]` is populated from localStorage; clicking Load restores the tree.

### Scenario 10: `bs-datatable` `[filterTree]`
- **Given**: A `bs-datatable` below the builder with `[data]="rows"` and `[filterTree]="query()"`.
- **When**: User builds a query in the builder.
- **Then**: Datatable rows reflect only matching rows. No additional consumer code needed.

### Scenario 11: Keyboard-only construction + reorder
- **Given**: Empty tree, demo page, no mouse.
- **When**: User tabs to "Add condition", presses Enter, fills field/op/value, then `Alt+ArrowUp` to reorder.
- **Then**: A complete condition is added and moved without touching the mouse.

---

## Acceptance Criteria

- [ ] `@mintplayer/ng-bootstrap/query-builder` secondary entry point builds clean (`nx build mintplayer-ng-bootstrap`).
- [ ] `bs-query-builder` round-trips an unedited JSON tree.
- [ ] All seven built-in value editors function.
- [ ] All operators from the catalog function and filter by field type.
- [ ] Nested groups to arbitrary depth.
- [ ] Sub-queries (`in` / `not-in`) against another entity, recursable.
- [ ] Drag-and-drop reorder works within a group **and** across groups.
- [ ] `evaluateQuery` exported, covers every operator + sub-queries.
- [ ] `renderExpression` exported.
- [ ] `visitTree<T>` exported.
- [ ] All 5 reference serializers (SQL, OData, LINQ, Mongo, GraphQL) exported and individually importable.
- [ ] `bs-query-builder` implements `ControlValueAccessor` — works with `[(ngModel)]` and `[formControl]`.
- [ ] `[data]` + `(filteredResult)` work on the wrapper.
- [ ] `*bsQueryBuilderEditor` structural directive projects custom editors per field name.
- [ ] WC `editorRegistry` factory callback works framework-agnostically.
- [ ] `(saveQuery)` / `(loadQuery)` / `(deleteQuery)` events fire with correct payloads; `[savedQueries]` drives picker UI.
- [ ] `bs-datatable` accepts `[filterTree]` + `[filterSchema]` and filters rows accordingly without breaking existing API.
- [ ] Demo page covers all 11 test scenarios.
- [ ] Playwright e2e covers all 11 scenarios.
- [ ] axe-core passes with zero serious findings.
- [ ] Firefox smoke test passes.
- [ ] Keymap documented on demo page.

---

## Risks & Open Considerations

- **Scope is very large.** Full Infragistics parity *plus* CVA, dataset binding, 5 serializers, custom editors, saved-query events, and a small `bs-datatable` addition. Multi-month effort acknowledged; the user explicitly chose this scope after seeing the recommended trimmed version. Internal phasing keeps milestones independently reviewable on the branch.
- **5 serializers, 5 separate semantics.** SQL string-comparison rules, OData v4 lambda syntax for sub-queries (`any(o: ...)`), Mongo `$elemMatch` vs `$in`, GraphQL Hasura dialect choice. Each serializer needs its own test snapshot and its own NULL/casing/escape contract. The Hasura/Prisma dialect for GraphQL is a deliberate choice; consumers on Apollo with custom resolvers will still need to write their own visitor.
- **Cross-group DnD reparenting is the subtle one.** Cycle prevention (can't drop a group into its own descendant), drop-index calculation across heterogeneous siblings (condition rows vs nested group cards have different heights), and visual feedback during cross-group hover are non-trivial. Allocate a focused implementation pass.
- **Custom editors + shadow DOM lifecycle.** When a condition's field changes, the old custom editor must be disposed cleanly. The convention is `(el as any).dispose?.()` if defined; for Angular-template-derived editors, the wrapper must destroy the embedded view when the WC asks for disposal. Risk: memory leaks if disposal is missed.
- **`bs-datatable` modification.** Touching a separate library subproject means: (1) datatable unit tests must still pass; (2) the new `[filterTree]` input must be additive (no breaking changes); (3) datatable's existing filter / sort / paginate pipeline must compose correctly with `evaluateQuery`.
- **No CVA on nested sub-queries.** The `[formControl]` integration binds the *root* tree only. Sub-query trees are part of the root value; consumers cannot bind a separate `FormControl` to a nested sub-query. This is intentional — the tree is one value — but worth flagging in the README.
- **No backend serializer for "your DB".** PostgreSQL JSONB containment, BigQuery, DynamoDB, etc. are not shipped. Visitor API is the escape hatch.

---

## Build & Test Commands

```bash
# Build the library subproject
npx nx build mintplayer-ng-bootstrap

# Run unit tests for the query-builder entry
npx nx test mintplayer-ng-bootstrap --testPathPattern=query-builder

# Run unit tests for the datatable changes
npx nx test mintplayer-ng-bootstrap --testPathPattern=datatable

# Run the demo app
npm start

# Run Playwright e2e
npx nx e2e ng-bootstrap-demo-e2e --testPathPattern=query-builder
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts` — reference Angular wrapper pattern.
- `libs/mintplayer-ng-bootstrap/datetime-picker/` — reference WC + wrapper colocation layout + CVA pattern.
- `libs/mintplayer-ng-bootstrap/datatable/` — gets `[filterTree]` + `[filterSchema]` additive inputs.
- `libs/mintplayer-ng-bootstrap/package.ts` — register new secondary entry.
- `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs` — register new secondary entry.
- `apps/ng-bootstrap-demo/src/app/app.routes.ts` (or equivalent).
- [[feedback_pointer_over_html5_dnd]], [[feedback_pointerdown_preventdefault]], [[feedback_touch_action_immutable]] — DnD ground rules.
- [[project_wc_aria_decisions]] — ARIA pattern + demo keymap requirement.
- [[feedback_wc_plus_angular_wrapper]] — packaging rationale.
- [[feedback_prd_unified_scope]] — multi-part feature shipping policy.
- [[feedback_computed_signals_in_template]] — derive transformations in `computed()`, not inline.
- [[feedback_no_imperative_iteration]] — use map/filter/flatMap; no forEach + accumulator.

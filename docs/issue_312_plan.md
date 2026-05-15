# Development Plan: Issue #312

**Issue**: #312
**Title**: Query Builder
**Type**: Feature (new component)
**Priority**: Medium
**PRD**: [`docs/issue_312_PRD.md`](./issue_312_PRD.md)

## Executive Summary

Add `bs-query-builder` to `libs/mintplayer-ng-bootstrap` — a visual builder for composing arbitrarily nested AND/OR boolean queries, modelled on [Infragistics Ignite UI Angular `igxQueryBuilder`](https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder).

Shipped as **Lit web component (`mp-query-builder`) + Angular wrapper (`bs-query-builder`)** colocated inside the new `libs/mintplayer-ng-bootstrap/query-builder` secondary entry point, matching the precedent set by `bs-datetime-picker` (#332). The component emits a canonical JSON expression tree via two-way `[(query)]`; a sibling `evaluateQuery(tree, record, schema)` helper is exported for in-memory filtering. **The component is a tree-emitter — it does not execute the query itself.**

User has committed to **full Infragistics parity** in one PR: nested AND/OR groups, multi-entity sub-queries (`in` / `not-in` against another expression tree), drag-and-drop reorder, built-in value editors per data type, and human-readable expression preview. This is a deliberately large diff — phased internally as milestones inside one branch, not split across releases (per [[feedback_prd_unified_scope]]).

---

## Problem Statement

### Current Behavior

`@mintplayer/ng-bootstrap` has no query builder. Consumers wanting a visual filter UI must compose `bs-datatable` filter inputs ad-hoc (no AND/OR grouping, no nesting), or roll their own component. There is no canonical JSON shape for "a boolean expression tree" in the library, so backend integrations diverge on the wire format.

### Expected Behavior

A new secondary entry point `@mintplayer/ng-bootstrap/query-builder` exports `bs-query-builder` (Angular) backed by `mp-query-builder` (Lit). The component renders a Bootstrap-styled tree of:

- **Groups** (AND/OR) — toggleable logic operator, "add condition" / "add group" / "add sub-query" / "remove" actions, drag handle for reordering siblings.
- **Conditions** — field selector, operator selector (filtered to the field's data type), value editor (chosen by data type), drag handle, remove button.
- **Sub-queries** — field selector (cross-entity), `in` / `not-in` operator, a nested `mp-query-builder` rooted on the target entity.

The current expression tree is exposed via two-way `[(query)]`. A separately exported `evaluateQuery` helper walks the tree against a single record (used for tests, demo, and in-memory consumers); backend consumers serialize the tree themselves (SQL / OData / LINQ / Mongo are out of scope).

### Impact

- Closes a major gap relative to Infragistics / DevExpress / Syncfusion competitor libraries.
- Establishes a canonical JSON expression-tree shape that other components in the library (notably `bs-datatable`) can adopt as a filter input down the road.
- First library component to use multi-level drag-and-drop reordering — exercises the [[feedback_pointer_over_html5_dnd]] pattern at scale.

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
│       │       ├── mp-qb-enum-editor.element.ts          # single-select from list
│       │       └── mp-qb-list-editor.element.ts          # multi-select (for `in`)
│       ├── components/
│       │   ├── query-builder.component.ts                # bs-query-builder Angular wrapper
│       │   ├── query-builder.component.html
│       │   └── query-builder.component.scss
│       ├── model/
│       │   ├── expression.ts                             # Expression discriminated union
│       │   ├── field-def.ts                              # FieldDef, EntitySchema types
│       │   ├── operators.ts                              # OperatorCatalog per data type
│       │   └── default-tree.ts                           # `emptyGroup()` / `emptyCondition()`
│       ├── evaluator/
│       │   ├── evaluate-query.ts                         # exported helper
│       │   └── evaluate-query.spec.ts
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

- `libs/mintplayer-ng-bootstrap/package.ts` — register the new secondary entry point.
- `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs` — register `./query-builder`.
- `apps/ng-bootstrap-demo/src/app/app.routes.ts` (or equivalent) — add `/advanced/query-builder` route.
- `apps/ng-bootstrap-demo/src/app/components/sidebar` (or wherever the nav lives) — link the demo page.

### Dependencies

- `lit` (already a workspace dep for dock / scheduler / datetime-picker WCs).
- No new runtime dependencies. Drag-and-drop uses native pointer events (per [[feedback_pointer_over_html5_dnd]]).

### Architecture Considerations

- **Tree representation** — plain JSON discriminated union, `kind: 'group' | 'condition' | 'subquery'`. Serializable round-trip. See PRD §Data Model.
- **WC ownership** — the WC owns the tree, edit gestures, and rendering. The Angular wrapper bridges signals (input/output/model) to WC properties + custom events, mirroring `bs-scheduler` (see `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts`).
- **Editors are built-in only** — Infragistics parity, no slot projection. Per data type, the WC renders one of seven editors (string / number / integer / date / datetime / boolean / enum / multi-select-list). Pluggable editors are explicitly **out of scope** and will be a separate issue if requested.
- **Operators per type** — a static catalog (`OperatorCatalog`) maps each `FieldType` → allowed operators. Consumers can pass a `[operatorOverrides]` input to restrict operators per field, but cannot add new operator semantics in v1.
- **Drag-and-drop** — pointer events only (`pointerdown` / `pointermove` / `pointerup`), `touch-action: none` on drag handles (per [[feedback_touch_action_immutable]]), no `preventDefault()` on touch pointerdown (per [[feedback_pointerdown_preventdefault]]).
- **Theming** — internal Lit styles use CSS custom properties keyed off the repo's theme system (dark-mode toggle from #324). All visible colors / borders / focus rings inherit from the theme.
- **A11y** — `role="group"` on every group node with `aria-label="AND group"` / `"OR group"`; native focus order through form controls; condition rows do **not** use `role="treeitem"` (form controls in condition rows would conflict with tree semantics). Demo page must show the keymap per [[project_wc_aria_decisions]].
- **i18n** — operator labels and group toggle labels are translatable via `[messages]` input on the Angular wrapper. WC defaults to English.
- **No `ControlValueAccessor` in v1** — the canonical surface is `[(query)]` signal-model. CVA is deferred until a real consumer needs `[formControl]` integration (separate issue).

---

## Implementation Plan

Phases are **internal milestones inside one PR**, not separate releases.

### Phase 1: Data model + scaffold

1. Create `libs/mintplayer-ng-bootstrap/query-builder/` secondary entry point (mirror `datetime-picker/` config files).
2. Define `Expression` discriminated union, `FieldDef`, `EntitySchema`, `Operator`, and `OperatorCatalog` in `model/`.
3. Define `emptyGroup()`, `emptyCondition()`, `emptySubquery()` factory helpers + a `cloneTree()` deep-clone.
4. Register the new entry in `package.ts` and `ng-package.secondary.cjs`.
5. Verify `nx build mintplayer-ng-bootstrap` builds the empty entry point clean.

### Phase 2: Lit WC scaffold — read-only tree rendering

1. Implement `mp-query-builder.element.ts` (root WC) — accepts `query`, `schema`, `rootEntity` properties; renders a recursive `<mp-query-group>` for the root.
2. Implement `mp-query-group.element.ts` — renders the AND/OR pill + a list of children, each as `<mp-query-condition>` / `<mp-query-group>` / `<mp-query-subquery>`.
3. Implement `mp-query-condition.element.ts` — renders field label + operator label + raw value (no editors yet).
4. Implement `mp-query-subquery.element.ts` — renders field + `in`/`not-in` label + a recursive `<mp-query-builder>` for the sub-tree.
5. Verify recursive rendering: a hand-written test tree (group → group → condition / subquery → group → condition) renders correctly in Storybook-style harness or the demo page.

### Phase 3: Value editors per data type

1. Implement `mp-qb-string-editor.element.ts` (text input).
2. Implement `mp-qb-number-editor.element.ts` (numeric input, `step="any"`).
3. Implement `mp-qb-date-editor.element.ts` (date input — uses native `<input type="date">` for v1; can be swapped to `mp-calendar` in a follow-up).
4. Implement `mp-qb-datetime-editor.element.ts` (datetime-local).
5. Implement `mp-qb-boolean-editor.element.ts` (checkbox + tri-state for "any").
6. Implement `mp-qb-enum-editor.element.ts` (single-select from `FieldDef.options`).
7. Implement `mp-qb-list-editor.element.ts` (multi-select tag input — for `in` operators on enum / scalar fields).
8. Wire each editor into `mp-query-condition.element.ts` via a `data-editor` switch based on the field's data type.

### Phase 4: Edit mode — mutations through tree

1. Add `mp-query-condition` controls: field selector dropdown, operator selector dropdown (filtered by `OperatorCatalog[fieldType]`), value editor (already from Phase 3), remove button.
2. On any control change, emit a `query-change` CustomEvent from the root WC with a freshly cloned tree (immutable update — never mutate the input).
3. Add `mp-query-group` controls: AND/OR toggle, "add condition" button, "add group" button, "add sub-query" button (only if schema has multiple entities), remove button (disabled on the root).
4. Implement immutable tree-update helpers in `model/tree-ops.ts`: `addChild(tree, parentId, child)`, `removeChild(tree, nodeId)`, `updateCondition(tree, nodeId, patch)`, `setGroupLogic(tree, nodeId, logic)`.
5. Assign stable `id` (uuid) to every node at creation so updates can target nodes without path arrays.

### Phase 5: Operator catalog + per-type operator filtering

1. Author `OperatorCatalog` covering: `equals`, `not-equals`, `contains`, `starts-with`, `ends-with`, `does-not-contain` (string only); `lt`, `lte`, `gt`, `gte`, `between`, `not-between` (number / date / datetime); `in`, `not-in` (any scalar; takes a list value); `is-null`, `is-not-null` (all types); `is-true`, `is-false` (boolean only).
2. `between` / `not-between` operators take a **two-value** payload — value editor renders two inputs. Reflected in `Condition.value` as a tuple.
3. `in` / `not-in` operators take an array value — value editor is the multi-select tag input.
4. Operator dropdown filters by `OperatorCatalog[field.type]`; switching field auto-resets operator + value if the previous operator isn't valid for the new type.

### Phase 6: Nested groups + sub-queries

1. Allow `add group` to insert a nested `Group` child into any group, to arbitrary depth.
2. Allow `add sub-query` to insert a `SubQuery` condition. The sub-query field is a relation field (`FieldDef.type === 'relation'`, with `targetEntity`). Operator fixed to `in` / `not-in`. Value is an entire nested `Group` tree against `targetEntity`'s schema.
3. The nested `<mp-query-builder>` inside a `SubQuery` swaps `rootEntity` to the target — its internal schema view filters to that entity's fields.
4. Recursion-safe: sub-queries can themselves contain sub-queries. Add a `maxDepth` input (default `Infinity`) to let consumers cap if needed.

### Phase 7: Drag-and-drop reorder

1. Add a grab-handle (`bi-grip-vertical`) on every condition row and group header.
2. Implement a pointer-events-based DnD primitive (no HTML5 native dnd — per [[feedback_pointer_over_html5_dnd]]):
   - `pointerdown` on handle → record source node id + start position; do **not** call `preventDefault` on touch ([[feedback_pointerdown_preventdefault]]).
   - `pointermove` → translate a floating "drag ghost" element; compute hover target by intersecting with all sibling node bounding rects.
   - `pointerup` → if target ≠ source, dispatch a `move-node` update.
3. `touch-action: none` on the handle element ([[feedback_touch_action_immutable]]).
4. Allow drops within the **same group only** in v1 (cross-group moves are reparenting — surprisingly subtle UX with logic-operator changes; defer).

### Phase 8: Expression preview rendering

1. Implement `renderExpression(tree, schema, messages)` in `preview/render-expression.ts` — pure function that returns a human-readable string like:
   ```
   (Total > 100 AND (Status = "open" OR Status = "pending"))
   AND Customer IN (Country = "BE")
   ```
2. Expose as a separate export `import { renderExpression } from '@mintplayer/ng-bootstrap/query-builder'`.
3. Render the preview at the top of the WC's host inside a `<pre>` block (toggleable via `[showPreview]` input, default `false`).

### Phase 9: `evaluateQuery` helper

1. Implement `evaluateQuery(tree, record, schema): boolean` in `evaluator/evaluate-query.ts`.
2. Pure function — no Angular / no Lit. Walks the tree, evaluates each condition against the record's field per the operator.
3. Sub-queries: `evaluateQuery` accepts an optional `getRelatedRecords(record, fieldName): Record[]` callback for relation traversal. Sub-query `in` evaluates to `true` if **at least one** related record matches the sub-tree.
4. NULL semantics: `equals`/`lt`/`gt` against `null` value → `false`. `is-null` / `is-not-null` are the only operators that match nullness directly.
5. String comparisons: **case-insensitive** by default; expose an `EvaluateOptions { caseSensitive?: boolean }` second argument.
6. Unit tests cover every operator × every data type × null cases.

### Phase 10: Angular wrapper

1. Implement `bs-query-builder` mirroring `bs-scheduler`'s pattern: `input()` for `schema` / `rootEntity` / `messages` / `showPreview`; `model()` for `query`; `output()` for `queryChange`.
2. Effects sync inputs to WC properties; event listeners bridge `query-change` CustomEvent → model update.
3. Re-export types: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `OperatorCatalog`.

### Phase 11: Demo page

1. New demo page at `apps/ng-bootstrap-demo/src/app/pages/advanced/query-builder/`.
2. Examples:
   - **Single-entity basics** — Orders schema (id, total, status, date, customer). Empty tree → user builds it.
   - **Pre-loaded tree** — same schema, but starts with a non-trivial nested AND/OR.
   - **Multi-entity** — Customers + Orders schemas; demo a `Customer WHERE orders IN (total > 100)` sub-query.
   - **Live evaluation** — bind a `mockData` array; render rows that match the current query (uses `evaluateQuery`).
   - **JSON view** — show the live tree JSON next to the builder.
3. Document the keymap on the demo page (per [[project_wc_aria_decisions]]).

### Phase 12: Testing + a11y validation

1. **Unit tests** (Vitest):
   - Tree ops (`addChild`, `removeChild`, `updateCondition`, `moveNode`) — pure-function tests.
   - `evaluateQuery` — every operator × type × null × sub-query case.
   - `renderExpression` — snapshot tests of a handful of trees.
   - Operator catalog — every type has a non-empty operator list; `between` reflects two-value editor; `in` reflects list-value editor.
2. **WC unit tests** — happy-path field/op/value selection round-trips through `query-change`.
3. **Angular wrapper unit tests** — `[(query)]` two-way binding fires on mutations; `[messages]` overrides operator labels.
4. **Playwright e2e** — `apps/ng-bootstrap-demo-e2e/src/query-builder.spec.ts`:
   - Add a condition, fill it, assert preview text.
   - Add a nested group, toggle AND/OR, assert tree shape via `evaluateQuery` against sample rows.
   - Add a sub-query, fill the sub-tree, assert matching row count.
   - Drag a condition to reorder, assert the tree order changed.
   - Use `await page.waitForLoadState('networkidle')` after `goto` per [[project_e2e_destructive_bootstrap]].
5. **axe-core** — zero serious findings on the demo page.
6. **Firefox smoke test** — verify drag handles don't shrink in flex containers ([[feedback_firefox_flex_shrink]]).

---

## Test Scenarios

### Scenario 1: Build a flat AND query
- **Given**: Empty tree, Orders schema, demo page.
- **When**: User clicks "Add condition" twice, picks `total > 100` and `status = "open"`, leaves root group as AND.
- **Then**: Preview reads `Total > 100 AND Status = "open"`. `evaluateQuery` returns `true` for `{ total: 150, status: "open" }` and `false` for `{ total: 50, status: "open" }`.

### Scenario 2: Nested group with OR
- **Given**: Existing condition `total > 100`.
- **When**: User clicks "Add group" inside the root, adds two conditions `status = "open"` and `status = "pending"`, toggles the inner group to OR.
- **Then**: Preview reads `Total > 100 AND (Status = "open" OR Status = "pending")`. Tree JSON has a nested `Group` child with `logic: 'or'`.

### Scenario 3: Sub-query across entities
- **Given**: Customers + Orders schemas; root entity = Customers.
- **When**: User adds a sub-query on the `orders` relation field with operator `in`, then inside the sub-tree adds `total > 100`.
- **Then**: Tree JSON has a `SubQuery` child with `op: 'in'`, `targetEntity: 'orders'`, and a nested `Group { children: [{ kind: 'condition', field: 'total', op: 'gt', value: 100 }] }`. `evaluateQuery` (with `getRelatedRecords` wired) returns `true` for customers with at least one order > 100.

### Scenario 4: Drag-and-drop reorder
- **Given**: Two conditions in the root group: `total > 100` (index 0), `status = "open"` (index 1).
- **When**: User drags the status row above the total row via the grab handle.
- **Then**: `query-change` fires with children swapped; preview text now reads `Status = "open" AND Total > 100`. No HTML5 native dnd events fired (verify via console event log).

### Scenario 5: Switching field resets operator + value
- **Given**: Condition with `total > 100`.
- **When**: User changes the field from `total` (number) to `status` (string).
- **Then**: Operator resets (defaults to `equals` for string), value resets to empty string. Old operator `gt` (number-only) does not persist.

### Scenario 6: Round-trip JSON
- **Given**: A non-trivial tree serialized as JSON.
- **When**: Pass the JSON to `[(query)]`, then read it back after no edits.
- **Then**: Output JSON is structurally equal to input (including node `id`s if the input had them; new ids generated only on `add*` ops).

### Scenario 7: Keyboard-only construction
- **Given**: Empty tree, demo page, no mouse.
- **When**: User tabs to "Add condition", presses Enter, tabs through field/op/value, enters values.
- **Then**: A complete condition is added without using the mouse. Focus order is logical; the field selector is the first stop after "Add condition".

---

## Acceptance Criteria

- [ ] `@mintplayer/ng-bootstrap/query-builder` secondary entry point builds clean (`nx build mintplayer-ng-bootstrap`).
- [ ] `bs-query-builder` renders, accepts a schema + tree, and round-trips an unedited JSON tree.
- [ ] All seven built-in value editors function (string, number, integer, date, datetime, boolean, enum, multi-list).
- [ ] All twelve operators function (equals, not-equals, contains, starts-with, ends-with, does-not-contain, lt, lte, gt, gte, between, not-between, in, not-in, is-null, is-not-null, is-true, is-false — the operator catalog filters by type so consumers only see the relevant ones per field).
- [ ] Nested groups to arbitrary depth.
- [ ] Sub-queries (`in` / `not-in`) against another entity, recursable.
- [ ] Drag-and-drop reorder within a group, pointer-events-based.
- [ ] `evaluateQuery` helper exported, with full operator coverage and sub-query support.
- [ ] `renderExpression` helper exported.
- [ ] Demo page covers single-entity, multi-entity, pre-loaded tree, live evaluation, JSON view.
- [ ] Playwright e2e covers Scenarios 1–7.
- [ ] axe-core passes with zero serious findings on the demo page.
- [ ] Firefox smoke test passes (no flex-shrink regression on drag handles).
- [ ] Keymap documented on the demo page.

---

## Risks & Open Considerations

- **Scope is large.** Full Infragistics parity in one PR is a multi-month effort. Confirmed with developer; not relitigated. The plan is phased internally to keep each milestone independently reviewable on the branch, but they ship together.
- **Multi-entity sub-queries roughly double data-model complexity.** The recursive `mp-query-builder` inside `SubQuery` needs separate `rootEntity` context per nesting level. Worth dedicating a focused implementation pass to this rather than treating it as an incremental tweak.
- **Drag-and-drop with nested groups is subtle.** v1 restricts drops to same-group siblings to avoid reparenting edge cases. Cross-group drops can be a follow-up issue.
- **No `ControlValueAccessor` yet.** The canonical surface is `[(query)]`. Reactive-forms integration is deferred to a separate issue once a real consumer needs it.
- **No serializer subsystem.** SQL / OData / LINQ / Mongo serializers are explicitly out of scope. The tree JSON is the wire format; consumers translate on their backend. A community-contributed `@mintplayer/ng-bootstrap/query-builder-serializers/` sub-package is a plausible future home.

---

## Build & Test Commands

```bash
# Build the library subproject
npx nx build mintplayer-ng-bootstrap

# Run unit tests for the query-builder entry
npx nx test mintplayer-ng-bootstrap --testPathPattern=query-builder

# Run the demo app
npm start

# Run Playwright e2e
npx nx e2e ng-bootstrap-demo-e2e --testPathPattern=query-builder
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts` — reference Angular wrapper pattern (effects + custom event listeners).
- `libs/mintplayer-ng-bootstrap/datetime-picker/` — reference WC + wrapper colocation layout (most recent precedent).
- `libs/mintplayer-ng-bootstrap/package.ts` — register new secondary entry.
- `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs` — register new secondary entry.
- `apps/ng-bootstrap-demo/src/app/app.routes.ts` (or equivalent route config).
- [[feedback_pointer_over_html5_dnd]], [[feedback_pointerdown_preventdefault]], [[feedback_touch_action_immutable]] — DnD ground rules.
- [[project_wc_aria_decisions]] — ARIA pattern + demo keymap requirement.
- [[feedback_wc_plus_angular_wrapper]] — packaging rationale.
- [[feedback_prd_unified_scope]] — multi-part feature shipping policy.

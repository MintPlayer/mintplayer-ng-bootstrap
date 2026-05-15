# Product Requirements Document: Query Builder

**Issue**: #312
**Title**: Query Builder
**Status**: Draft
**Created**: 2026-05-15
**Last Updated**: 2026-05-15

---

## Overview

Add `bs-query-builder` to `libs/mintplayer-ng-bootstrap` — a visual builder for composing arbitrarily nested AND/OR boolean queries, modelled feature-for-feature on [Infragistics Ignite UI Angular `igxQueryBuilder`](https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder).

Shipped as **Lit web component (`mp-query-builder`) + Angular wrapper (`bs-query-builder`)** colocated inside a new `libs/mintplayer-ng-bootstrap/query-builder` secondary entry point, matching the precedent set by `bs-datetime-picker` (#332). The WC owns the tree, edit gestures, and rendering; the wrapper bridges signals to WC properties and custom events.

The canonical surface is a JSON expression tree exposed via two-way `[(query)]`. A sibling `evaluateQuery(tree, record, schema)` helper is **separately exported** for in-memory filtering — the WC itself does not execute queries against a dataset. SQL / OData / LINQ / Mongo serializers are out of scope for this PRD; consumers translate the tree on their backend.

Reference UI surface: Infragistics `igxQueryBuilder` (https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder). We mimic the feature set, not the visual style. Visual style is pure Bootstrap 5 primitives (`form-control`, `input-group`, `dropdown-menu`, BS Icons), styled via CSS custom properties so the dark-mode toggle from #324 applies automatically.

---

## Goals & Objectives

### Primary Goals

- Ship a feature-complete query builder: nested AND/OR groups, multi-entity sub-queries, built-in value editors per data type, drag-and-drop reorder, human-readable expression preview, all in one release.
- Establish a canonical JSON expression-tree shape (`Expression` discriminated union) that other library components (notably `bs-datatable`) can adopt as a filter input down the road.
- Full ARIA + keyboard parity on day one — no follow-up a11y pass (per library's WC ARIA policy, [[project_wc_aria_decisions]]).
- Export a pure-function `evaluateQuery` helper so consumers can filter in-memory datasets without writing a tree walker.

### Success Metrics

- A consumer can build, edit, serialize, deserialize, and evaluate any valid Infragistics-shaped query without writing custom code.
- Keyboard-only users can construct a complete tree (add condition, fill field/op/value, add group, toggle AND/OR, drag-reorder via keyboard alternative) without touching the mouse.
- axe-core reports zero serious findings on the demo page.
- JSON round-trip is structurally lossless (input tree → mounted WC → serialized output is identical aside from re-generated node `id`s).
- Smoke-tested on Chromium + Firefox; drag handles unaffected by Firefox flex-shrink behavior ([[feedback_firefox_flex_shrink]]).

---

## Non-Goals / Out of Scope

- **`ControlValueAccessor` integration.** The canonical surface is `[(query)]`. CVA is deferred until a real `[formControl]` consumer is identified — separate issue.
- **Backend serializers** (SQL / OData / LINQ / Mongo). The tree JSON is the wire format; consumers translate server-side. A community-contributed `@mintplayer/ng-bootstrap/query-builder-serializers/` is a plausible future home.
- **Built-in dataset binding** (`[data]` input + `(filteredResult)` output). The WC emits a tree; `evaluateQuery` is a sibling helper, not part of the WC's API surface. Coupling the WC to in-memory datasets would obscure backend-paginated use cases.
- **Custom / pluggable value editors.** Built-in editors only, one per data type (string, number, integer, date, datetime, boolean, enum, multi-list). Slot-based projection of arbitrary `bs-*` editors is a separate issue if requested.
- **Cross-group drag-and-drop reparenting.** v1 allows reorder within the same group only. Cross-group drops require reasoning about logic-operator inheritance and are a follow-up issue.
- **Saved queries / query library UI.** No persistence layer, no "load saved query" picker. Consumer's responsibility.
- **`bs-datatable` integration.** The query builder emits a tree; wiring it into `bs-datatable.filter` is a separate issue once both components stabilize on a shared shape.

---

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1**: New secondary entry point `@mintplayer/ng-bootstrap/query-builder` builds clean and is registered in `package.ts` and `ng-package.secondary.cjs`.
- [ ] **FR-2**: `bs-query-builder` Angular wrapper exposes:
  - `[schema]: EntitySchema[]` (input)
  - `[rootEntity]: string` (input — the entity the root group filters)
  - `[(query)]: Expression` (model — the tree)
  - `[messages]: Partial<QueryBuilderMessages>` (input — i18n overrides for operator labels and group toggle labels)
  - `[showPreview]: boolean` (input, default `false`)
  - `[maxDepth]: number` (input, default `Infinity`)
  - `(queryChange): EventEmitter<Expression>` (output — fires on every tree mutation)
- [ ] **FR-3**: WC owns and renders the tree recursively via `mp-query-group`, `mp-query-condition`, `mp-query-subquery` child elements.
- [ ] **FR-4**: Group node renders an AND/OR toggle (segmented control), "Add condition" / "Add group" / "Add sub-query" buttons, and a remove button (disabled on the root group).
- [ ] **FR-5**: Condition node renders a field selector, operator selector (filtered by `OperatorCatalog[field.type]`), value editor (chosen by `field.type`), drag handle, remove button.
- [ ] **FR-6**: Sub-query node renders a relation-field selector, `in` / `not-in` operator selector, and a nested `<mp-query-builder>` rooted on the target entity.
- [ ] **FR-7**: Seven built-in value editors:
  - `mp-qb-string-editor` (text input)
  - `mp-qb-number-editor` (numeric input)
  - `mp-qb-date-editor` (date input)
  - `mp-qb-datetime-editor` (datetime-local input)
  - `mp-qb-boolean-editor` (tri-state: true / false / any)
  - `mp-qb-enum-editor` (single-select dropdown from `FieldDef.options`)
  - `mp-qb-list-editor` (multi-select tag input for `in` / `not-in`)
- [ ] **FR-8**: Operator catalog covers (filtered per field type at runtime):
  - String: `equals`, `not-equals`, `contains`, `does-not-contain`, `starts-with`, `ends-with`, `is-null`, `is-not-null`, `in`, `not-in`
  - Number / Integer: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`, `in`, `not-in`
  - Date / Datetime: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`
  - Boolean: `is-true`, `is-false`, `is-null`, `is-not-null`
  - Enum: `equals`, `not-equals`, `in`, `not-in`, `is-null`, `is-not-null`
- [ ] **FR-9**: `between` / `not-between` value editor renders **two** inputs and stores a `[v1, v2]` tuple. Switching field type or operator resets the value.
- [ ] **FR-10**: Drag-and-drop reorder within the same group, pointer-events-based, with `touch-action: none` on the handle. No HTML5 native dnd. Same-group drops only.
- [ ] **FR-11**: `evaluateQuery(tree, record, schema, options?)` exported as a pure function. Covers every operator, NULL semantics (only `is-null` / `is-not-null` match nullness; other operators against `null` return `false`), and case-insensitive string compare by default.
- [ ] **FR-12**: `evaluateQuery` accepts an optional `getRelatedRecords(record, fieldName): Record[]` callback for sub-query traversal. `in` sub-query → `true` if **any** related record matches the sub-tree.
- [ ] **FR-13**: `renderExpression(tree, schema, messages?)` exported as a pure function returning a human-readable string with parentheses around groups.
- [ ] **FR-14**: Every node has a stable `id` (uuid) assigned on creation so tree-update helpers can target nodes without path arrays. Immutable updates — never mutate the input.
- [ ] **FR-15**: ARIA — each group renders `role="group" aria-label="AND group" | "OR group"`. Form controls inside condition rows are reachable in DOM order. No `role="treeitem"` (would conflict with focusable form controls inside).
- [ ] **FR-16**: Demo page at `/advanced/query-builder` covers: single-entity basics, pre-loaded tree, multi-entity sub-query, live evaluation against mock data, JSON tree view. Keymap documented on the page.
- [ ] **FR-17**: Theming — internal Lit styles use CSS custom properties; dark-mode toggle from #324 applies without component-specific changes.
- [ ] **FR-18**: Public types re-exported from the secondary entry point: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EvaluateOptions`.

### Should Have (P1)

- [ ] **FR-19**: Keyboard alternative to drag-and-drop — `Alt+ArrowUp` / `Alt+ArrowDown` on a focused condition row moves it among same-group siblings.
- [ ] **FR-20**: Operator-override input — `[operatorOverrides]: Partial<Record<string, Operator[]>>` keyed by field name, lets the consumer restrict which operators show up for specific fields.

### Won't Have (this issue — explicitly tracked as follow-up issues if needed)

- Cross-group drag-and-drop reparenting
- `ControlValueAccessor` integration
- Backend serializers (SQL / OData / LINQ / Mongo)
- Built-in dataset binding (`[data]` + `(filteredResult)`)
- Pluggable / slot-projected custom value editors
- Saved-query persistence + picker
- Direct `bs-datatable` integration

---

## Data Model

```ts
type Expression = Group | Condition | SubQueryCondition;

interface Group {
  kind: 'group';
  id: string;
  logic: 'and' | 'or';
  children: Expression[];
}

interface Condition {
  kind: 'condition';
  id: string;
  field: string;           // FieldDef.name
  operator: Operator;
  value: unknown;          // shape depends on operator + field type
}

interface SubQueryCondition {
  kind: 'subquery';
  id: string;
  field: string;           // a relation field (FieldDef.type === 'relation')
  operator: 'in' | 'not-in';
  subQuery: Group;         // root of the nested expression tree
}

type Operator =
  | 'equals' | 'not-equals'
  | 'contains' | 'does-not-contain' | 'starts-with' | 'ends-with'
  | 'lt' | 'lte' | 'gt' | 'gte'
  | 'between' | 'not-between'
  | 'in' | 'not-in'
  | 'is-null' | 'is-not-null'
  | 'is-true' | 'is-false';

type FieldType =
  | 'string' | 'number' | 'integer'
  | 'date' | 'datetime'
  | 'boolean' | 'enum' | 'relation';

interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: unknown; label: string }[];   // enum only
  targetEntity?: string;                            // relation only — name of EntitySchema.name
}

interface EntitySchema {
  name: string;
  label: string;
  fields: FieldDef[];
}

interface EvaluateOptions {
  caseSensitive?: boolean;          // default false for string ops
  getRelatedRecords?: (record: unknown, fieldName: string) => unknown[];
}
```

**Round-trip rules**:
- IDs are preserved on read; new IDs are generated only on `add*` operations.
- `subQuery.value` is always a `Group` (even if the user-facing operator is on the parent `SubQueryCondition` rather than the group).
- Empty groups (zero children) are valid — they render but `evaluateQuery` returns `true` for AND-empty, `false` for OR-empty (vacuous truth).

---

## UX Specification

### Anatomy

```
┌─ Query Builder ─────────────────────────────────────────────────┐
│ [AND ▽] (root group)                          [+condition] [+grp]│
│                                                                  │
│  ⋮ Total          [>      ▽] [100        ]              [×]      │
│  ⋮ Status         [equals ▽] [open       ▽]             [×]      │
│  ⋮ ┌─ (OR group) ──────────────────────────────────[+c] [+g] [×]─│
│  ⋮ │ ⋮ Customer.Country [equals ▽] [BE    ▽]            [×]     │
│  ⋮ │ ⋮ Customer.Country [equals ▽] [NL    ▽]            [×]     │
│  ⋮ └────────────────────────────────────────────────────────────│
│  ⋮ Orders [in ▽] ┌─ (subquery on Orders) ─────[+c] [+g] [×]──┐ │
│              ▲   │ ⋮ Total [>      ▽] [1000       ]      [×] │ │
│              │   └─────────────────────────────────────────────│ │
└──────────────┴─────────────────────────────────────────────────┘
                                                                ▲
   Preview (when [showPreview]=true):                           │
   ┌──────────────────────────────────────────────────────────┐ │
   │ Total > 100 AND Status = "open"                          │ │
   │   AND (Customer.Country = "BE" OR Customer.Country = "NL")│ │
   │   AND Orders IN (Total > 1000)                           │ │
   └──────────────────────────────────────────────────────────┘ │
                                                                drag handle
```

### Interactions

- **Add condition** appends a new `Condition` to the current group with the first schema field selected, the first valid operator picked, and an empty value.
- **Add group** appends a new empty `Group` (logic `and`) inside the current group.
- **Add sub-query** is offered only when the current entity's schema has at least one relation field. Appends a `SubQueryCondition` with operator `in` and an empty sub-tree group.
- **AND/OR toggle** is a segmented control on each group header. Click switches the group's logic.
- **Field change** auto-resets operator (to the first valid operator for the new type) and value (to `null` or `""`).
- **Operator change** auto-resets value if the operator's value shape differs from the previous one (e.g. switching from `equals` to `between`).
- **Remove** deletes the node. Removing a group removes its entire subtree. The root group's remove button is hidden.
- **Drag** — pointer down on the `⋮` handle starts a drag; pointer up over another sibling within the same group reorders.

### Keymap (documented on demo page)

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus through controls in DOM order |
| `Enter` on Add condition / Add group | Insert child + move focus to the new field selector |
| `Delete` or `Backspace` on a focused row (when no input is active) | Remove the row, with confirmation |
| `Alt+ArrowUp` / `Alt+ArrowDown` on a focused row | Move row up / down among same-group siblings (FR-19) |
| `Esc` | Close any open dropdown |

### Theming

All visible color / border / focus-ring tokens come from CSS custom properties. The dark-mode toggle from #324 should apply with zero per-component overrides. Bootstrap utility classes (`form-control`, `btn`, `btn-group`, `dropdown-menu`) are used inside the shadow DOM where they cascade; tokens compensate for shadow-DOM CSS isolation.

---

## Timeline & Milestones

Single PR. Internal milestones map 1:1 to the phases in [`issue_312_plan.md`](./issue_312_plan.md):

- [ ] **M1**: Data model + scaffold
- [ ] **M2**: Lit WC scaffold — read-only tree rendering
- [ ] **M3**: Value editors per data type
- [ ] **M4**: Edit mode — mutations through tree
- [ ] **M5**: Operator catalog + per-type operator filtering
- [ ] **M6**: Nested groups + sub-queries
- [ ] **M7**: Drag-and-drop reorder
- [ ] **M8**: Expression preview rendering
- [ ] **M9**: `evaluateQuery` helper
- [ ] **M10**: Angular wrapper
- [ ] **M11**: Demo page
- [ ] **M12**: Testing + a11y validation

Estimate: multi-month effort. Acknowledged at planning time.

---

## Open Questions

> No outstanding escalations — all decisions resolved with the developer during planning.

---

## Technical Notes (Issue-Specific)

- The WC is a Lit element colocated inside the `libs/mintplayer-ng-bootstrap/query-builder/` package (per #332 datetime-picker precedent), not a separate top-level `mp-query-builder-wc` lib (which was the earlier dock/scheduler convention).
- Sub-queries use **recursive `<mp-query-builder>`** rather than a separate "nested builder" element. This keeps the recursion natural and means the same Lit element handles arbitrary depth.
- Drag-and-drop uses pointer events exclusively. Touch must not call `preventDefault()` on `pointerdown` ([[feedback_pointerdown_preventdefault]]); `touch-action: none` on the handle is set at element-creation time ([[feedback_touch_action_immutable]]).
- `evaluateQuery` is a **pure function** (no Angular, no Lit imports) so it can be used from tests, demo, and any framework consumer of the WC.
- Operator catalog (`OperatorCatalog`) is a static const, not a registry — operators are a closed set in v1. Custom operator semantics are explicitly out of scope.

---

## Related

- Issue #312 (this PRD)
- Issue #332 (DateTime Picker — most recent WC+wrapper precedent; reference for package layout and Lit conventions)
- Reference UI: https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder
- See CLAUDE.md for: WC + Angular wrapper pattern, Lit 3 migration status, theme system / dark-mode toggle (#324), Bootstrap grid usage rules ([[feedback_use_bs_grid_directives]]).

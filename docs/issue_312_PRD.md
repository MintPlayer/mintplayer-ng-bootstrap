# Product Requirements Document: Query Builder

**Issue**: #312
**Title**: Query Builder
**Status**: Draft
**Created**: 2026-05-15
**Last Updated**: 2026-05-15

---

## Overview

Add `bs-query-builder` to `libs/mintplayer-ng-bootstrap` — a visual builder for composing arbitrarily nested AND/OR boolean queries, modelled feature-for-feature on [Infragistics Ignite UI Angular `igxQueryBuilder`](https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder) and shipped **fully-fledged** in one PR.

Shipped as **Lit web component (`mp-query-builder`) + Angular wrapper (`bs-query-builder`)** colocated inside a new `libs/mintplayer-ng-bootstrap/query-builder` secondary entry point, matching the precedent set by `bs-datetime-picker` (#332). The WC owns the tree, edit gestures, and rendering; the wrapper bridges signals to WC properties and custom events, adds `ControlValueAccessor`, and adds a TemplateRef-projection sugar over the WC's custom-editor factory API.

Beyond the canonical Infragistics surface, this release also ships:

- **`ControlValueAccessor`** on the Angular wrapper so `[(ngModel)]` and `[formControl]` integrations work out of the box.
- **Built-in dataset binding** — `[data]` + `(filteredResult)` for in-memory filter scenarios. Wraps the exported `evaluateQuery` helper.
- **Visitor API** (`visitTree<T>(tree, visitor): T`) and **five reference serializers** — SQL, OData v4, LINQ (TypeScript predicate), Mongo, GraphQL (Hasura/Prisma-style nested-object dialect). Each is individually importable.
- **Custom value editors** via:
  - WC-level factory callback (`[editorRegistry]`) — framework-agnostic, works in any host.
  - Angular-wrapper TemplateRef sugar (`*bsQueryBuilderEditor="fieldName"` structural directive) — desugars to a factory callback under the hood. Best of both worlds.
- **Saved-query event model** — `(saveQuery)` / `(loadQuery)` / `(deleteQuery)` outputs with `[savedQueries]` input. The component does **not** own storage; consumers persist via localStorage / IndexedDB / REST as they prefer.
- **`bs-datatable` integration** — `bs-datatable` gains a small additive `[filterTree]` + `[filterSchema]` input pair. Internally calls `evaluateQuery` per row. One-line consumer wiring.

Reference UI surface: Infragistics `igxQueryBuilder` (https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder). We mimic the feature set, not the visual style. Visual style is pure Bootstrap 5 primitives (`form-control`, `input-group`, `dropdown-menu`, BS Icons), styled via CSS custom properties so the dark-mode toggle from #324 applies automatically.

---

## Goals & Objectives

### Primary Goals

- Ship a feature-complete query builder: nested AND/OR groups, multi-entity sub-queries, built-in value editors per data type, **cross-group** drag-and-drop reorder, expression preview, **reactive-forms integration**, **in-memory dataset binding**, **five backend serializers + a visitor API for custom backends**, **custom-editor projection** (TemplateRef in Angular, factory in vanilla JS), **saved-query events**, and **`bs-datatable` `[filterTree]`** — all in one release.
- Establish a canonical JSON expression-tree shape (`Expression` discriminated union) that other library components can adopt as a filter input.
- Full ARIA + keyboard parity on day one — no follow-up a11y pass.

### Success Metrics

- A consumer can build, edit, serialize (to any of five backend dialects), deserialize, evaluate, and persist any valid Infragistics-shaped query without writing custom code beyond their storage adapter.
- `[formControl]` round-trip is lossless (`setValue(tree)` → `valueChanges` emits structurally-equal tree after no edits, modulo node id regeneration on adds).
- Keyboard-only users can construct, reorder, and save a complete tree without touching the mouse.
- axe-core reports zero serious findings on the demo page.
- All 5 serializers pass snapshot tests against a canonical input tree.
- `bs-datatable` consumers see no behaviour change unless they opt into `[filterTree]`.
- Smoke-tested on Chromium + Firefox.

---

## Non-Goals / Out of Scope

- **PostgreSQL JSONB containment, BigQuery, DynamoDB, Elasticsearch DSL, or other niche backends.** Visitor API is the escape hatch — `visitTree<T>(tree, visitor)` lets consumers write their own serializer in ~50 lines.
- **Apollo GraphQL with custom resolvers.** The shipped GraphQL serializer targets Hasura/Prisma-style nested-object `where` (`{ _and: [...] }`, `{ field: { _eq: ... } }`). Apollo schemas that diverge from this dialect need their own serializer (visitor API supports it).
- **Saved-query storage layer.** Component fires events; consumer persists. No localStorage, IndexedDB, or REST coupling inside the component.
- **CVA for nested sub-query trees.** The tree is one value; `[formControl]` binds the root tree. Sub-queries are part of the root, not separately bindable.
- **`bs-datatable` server-side filter compilation.** `[filterTree]` runs `evaluateQuery` in-process. Server-side consumers serialize the tree themselves and pass it to their backend; the datatable does not auto-emit a serialized filter.
- **Operator semantic customization.** Operator catalog is a closed set in v1. No `[operatorCatalog]` override at the operator-semantics level (only at the per-field operator-availability level via `[operatorOverrides]`).

---

## Functional Requirements

### Must Have (P0)

**Core component**

- [ ] **FR-1**: New secondary entry point `@mintplayer/ng-bootstrap/query-builder` builds clean and is registered in `package.ts` and `ng-package.secondary.cjs`.
- [ ] **FR-2**: `bs-query-builder` Angular wrapper inputs/outputs:
  - `[schema]: EntitySchema[]`
  - `[rootEntity]: string`
  - `[(query)]: Expression` (model)
  - `[messages]: Partial<QueryBuilderMessages>`
  - `[showPreview]: boolean` (default `false`)
  - `[showSavedQueries]: boolean` (default `false`)
  - `[maxDepth]: number` (default `Infinity`)
  - `[savedQueries]: SavedQuery[]` (default `[]`)
  - `[operatorOverrides]: Partial<Record<string, Operator[]>>`
  - `[disabled]: boolean` (default `false`)
  - `[data]: unknown[]` (optional)
  - `(queryChange)`, `(saveQuery)`, `(loadQuery)`, `(deleteQuery)`, `(filteredResult)` outputs.
- [ ] **FR-3**: WC owns and renders the tree recursively via `mp-query-group`, `mp-query-condition`, `mp-query-subquery` child elements.
- [ ] **FR-4**: Group node renders an AND/OR toggle, "Add condition" / "Add group" / "Add sub-query" buttons, remove button (disabled on root).
- [ ] **FR-5**: Condition node renders a field selector, operator selector (filtered by `OperatorCatalog[field.type]`), value editor, drag handle, remove button.
- [ ] **FR-6**: Sub-query node renders a relation-field selector, `in` / `not-in` operator, and a recursive `<mp-query-builder>` for the sub-tree.

**Built-in value editors**

- [ ] **FR-7**: Seven built-in editors: string, number, integer, date, datetime, boolean (tri-state), enum (single-select), list (multi-select).
- [ ] **FR-8**: Operator catalog covers (filtered per field type at runtime):
  - String: `equals`, `not-equals`, `contains`, `does-not-contain`, `starts-with`, `ends-with`, `is-null`, `is-not-null`, `in`, `not-in`
  - Number / Integer: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`, `in`, `not-in`
  - Date / Datetime: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`
  - Boolean: `is-true`, `is-false`, `is-null`, `is-not-null`
  - Enum: `equals`, `not-equals`, `in`, `not-in`, `is-null`, `is-not-null`
- [ ] **FR-9**: `between` / `not-between` editors render two inputs and store a tuple. Switching field/operator resets the value.

**Drag-and-drop**

- [ ] **FR-10**: Drag-and-drop reorder, pointer-events-based, with `touch-action: none` on the handle. No HTML5 native dnd.
- [ ] **FR-11**: **Cross-group reparenting** — drops accepted in any other group; node `kind` and contents preserved. Self-drop into a descendant is blocked (cycle prevention).

**Evaluation, visitor, serializers**

- [ ] **FR-12**: `evaluateQuery(tree, record, schema, options?)` exported as a pure function. Covers every operator, NULL semantics, case-insensitive string compare default, optional `getRelatedRecords` for sub-queries.
- [ ] **FR-13**: `renderExpression(tree, schema, messages?)` exported as a pure function returning a human-readable string with parentheses.
- [ ] **FR-14**: `visitTree<T>(tree, visitor): T` exported. Visitor contract: `condition(node, ctx) → T`, `subquery(node, innerT, ctx) → T`, `group(node, childrenTs, ctx) → T`.
- [ ] **FR-15**: Five reference serializers, each individually importable from `@mintplayer/ng-bootstrap/query-builder/serializers/<format>`:
  - `toSql(tree, schema): { sql: string; params: unknown[] }` — parameterised ANSI-SQL-ish.
  - `toODataFilter(tree, schema): string` — OData v4 `$filter` syntax.
  - `toLinqPredicate(tree, schema): (row: unknown) => boolean` — TypeScript predicate (delegates to `evaluateQuery`).
  - `toMongoFilter(tree, schema): Record<string, unknown>` — Mongo `$and`/`$or`/`$gt`/`$in`/`$elemMatch`.
  - `toGraphQLWhere(tree, schema): Record<string, unknown>` — Hasura/Prisma `{ _and, _or, field: { _eq, _gt, _in, ... } }`.

**Angular wrapper extras**

- [ ] **FR-16**: `bs-query-builder` implements `ControlValueAccessor`. `[(ngModel)]` and `[formControl]` both work. `setDisabledState` disables interactive controls.
- [ ] **FR-17**: `[data]` + `(filteredResult)` — when `[data]` is provided, the wrapper emits the filtered subset on every `[(query)]` mutation. Uses `evaluateQuery` internally.

**Custom editors**

- [ ] **FR-18**: WC-level `editorRegistry: Record<string, (ctx: EditorContext) => HTMLElement>` property. The factory is called once per condition; returned element is reused until the condition's field changes. On field change, the WC calls `(el as any).dispose?.()` then `el.remove()` before invoking the factory for the new field.
- [ ] **FR-19**: Angular-wrapper `*bsQueryBuilderEditor="fieldName"` structural directive. The wrapper aggregates content children into an `editorRegistry` map and forwards to the WC. Each template is mounted via `ViewContainerRef.createEmbeddedView`; the directive's `dispose` destroys the view when the WC requests cleanup.

**Saved queries**

- [ ] **FR-20**: Saved-query picker UI renders when `[showSavedQueries]` is true. Lists `savedQueries` with load/delete buttons; a "Save current as..." action opens a name input.
- [ ] **FR-21**: `(saveQuery)` fires `{ name: string; tree: Expression }`; `(loadQuery)` fires `{ name: string }`; `(deleteQuery)` fires `{ name: string }`. Component does **not** persist; consumer wires `[savedQueries]` from their store.

**`bs-datatable` integration**

- [ ] **FR-22**: `bs-datatable` gains additive inputs `[filterTree]: Expression | null` and `[filterSchema]: EntitySchema`. When set, rows are filtered through `evaluateQuery(filterTree, row, filterSchema)`. Default null = no behaviour change.
- [ ] **FR-23**: `[filterTree]` composes with existing `bs-datatable` filter / sort / paginate logic (filter applies before sort and paginate).

**General**

- [ ] **FR-24**: Every node has a stable `id` (uuid) on creation; immutable updates everywhere; never mutate the input.
- [ ] **FR-25**: ARIA — each group renders `role="group" aria-label="AND group" | "OR group"`; native focus order through form controls.
- [ ] **FR-26**: Demo page at `/advanced/query-builder` covers all 11 test scenarios with visible code snippets. Keymap documented.
- [ ] **FR-27**: Theming — internal Lit styles use CSS custom properties; dark-mode toggle from #324 applies without component-specific changes.
- [ ] **FR-28**: Public types re-exported: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EvaluateOptions`, `EditorContext`, `SavedQuery`, `TreeVisitor`, `VisitorContext`.

### Should Have (P1)

- [ ] **FR-29**: Keyboard alternative to DnD — `Alt+ArrowUp` / `Alt+ArrowDown` moves a focused row among same-group siblings. (Cross-group keyboard moves deferred.)
- [ ] **FR-30**: `[operatorOverrides]` input — `Partial<Record<string, Operator[]>>` keyed by field name to restrict operators per field.

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
  field: string;
  operator: Operator;
  value: unknown;
}

interface SubQueryCondition {
  kind: 'subquery';
  id: string;
  field: string;
  operator: 'in' | 'not-in';
  subQuery: Group;
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
  targetEntity?: string;                            // relation only
}

interface EntitySchema {
  name: string;
  label: string;
  fields: FieldDef[];
}

interface EvaluateOptions {
  caseSensitive?: boolean;
  getRelatedRecords?: (record: unknown, fieldName: string) => unknown[];
}

interface EditorContext {
  field: FieldDef;
  operator: Operator;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled: boolean;
}

interface SavedQuery {
  name: string;
  tree: Expression;
  createdAt?: string;     // ISO 8601 — optional metadata for consumers
}

interface TreeVisitor<T> {
  condition(node: Condition, ctx: VisitorContext): T;
  subquery(node: SubQueryCondition, inner: T, ctx: VisitorContext): T;
  group(node: Group, children: T[], ctx: VisitorContext): T;
}

interface VisitorContext {
  schema: EntitySchema[];
  currentEntity: string;
  depth: number;
}
```

**Round-trip rules**:
- IDs preserved on read; new IDs generated only on `add*` operations.
- `subQueryCondition.subQuery` is always a `Group` even if it has one child.
- Empty groups (zero children) render but `evaluateQuery` returns `true` for AND-empty and `false` for OR-empty (vacuous truth).

---

## UX Specification

### Anatomy

```
┌─ [Saved ▽] ─ Big open orders ─ [💾 Save] ───────────────────────┐  (visible when showSavedQueries=true)
└─────────────────────────────────────────────────────────────────┘
┌─ Query Builder ─────────────────────────────────────────────────┐
│ [AND ▽] (root group)                          [+condition] [+grp]│
│                                                                  │
│  ⋮ Total          [>      ▽] [100        ]              [×]      │
│  ⋮ Status         [equals ▽] [open       ▽]             [×]      │
│  ⋮ ┌─ (OR group) ──────────────────────────[+c] [+g] [+sq] [×]──┐│
│  ⋮ │ ⋮ Customer.Country [equals ▽] [BE    ▽]            [×]    ││
│  ⋮ │ ⋮ Customer.Country [equals ▽] [NL    ▽]            [×]    ││
│  ⋮ └────────────────────────────────────────────────────────────┘│
│  ⋮ Orders [in ▽] ┌─ (subquery on Orders) ─────[+c] [+g] [×]────┐ │
│              ▲   │ ⋮ Total [>      ▽] [1000       ]      [×]   │ │
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

- **Add condition / Add group / Add sub-query** — buttons on each group header, including nested ones.
- **AND/OR toggle** — segmented control on each group; clicking flips logic.
- **Field change** — auto-resets operator and value.
- **Operator change** — auto-resets value if shape differs.
- **Remove** — deletes the node and its subtree.
- **Drag** — pointer down on `⋮` starts a drag; pointer up over any group's drop zone (same or other group) reorders. Cycle prevention: cannot drop a group into its own descendant.
- **Saved-query picker** (when `[showSavedQueries]=true`):
  - Dropdown lists `[savedQueries]` items by name.
  - Per-item Load and Delete buttons fire the respective outputs.
  - "💾 Save" button opens an inline name input; submit fires `(saveQuery)`.

### Custom editor projection (Angular)

```html
<bs-query-builder [schema]="schema" [rootEntity]="'orders'" [(query)]="query">
  <bs-datepicker *bsQueryBuilderEditor="'orderDate'; let ctx"
                 [value]="ctx.value"
                 (valueChange)="ctx.onChange($event)">
  </bs-datepicker>

  <bs-multiselect *bsQueryBuilderEditor="'tags'; let ctx"
                  [options]="tagOptions"
                  [value]="ctx.value"
                  (valueChange)="ctx.onChange($event)">
  </bs-multiselect>
</bs-query-builder>
```

The directive's micro-syntax `let ctx` exposes `EditorContext` for the template. The wrapper aggregates content children, builds an `editorRegistry` map, and forwards to the WC. When the condition's field changes (e.g., user picks a different field), the wrapper destroys the embedded view and the WC instantiates the new field's editor.

### Custom editor projection (vanilla JS / non-Angular)

```js
const qb = document.querySelector('mp-query-builder');
qb.editorRegistry = {
  orderDate: (ctx) => {
    const el = document.createElement('my-datepicker');
    el.value = ctx.value;
    el.disabled = ctx.disabled;
    el.addEventListener('valueChange', e => ctx.onChange(e.detail));
    return el;
  }
};
```

### Keymap (documented on demo page)

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus through controls in DOM order |
| `Enter` on Add condition / Add group / Add sub-query | Insert child + focus the new field selector |
| `Delete` or `Backspace` on a focused row (no input active) | Remove the row, with confirmation |
| `Alt+ArrowUp` / `Alt+ArrowDown` on a focused row | Move row among same-group siblings (FR-29) |
| `Esc` | Close any open dropdown |

### `bs-datatable` integration

```html
<bs-query-builder [schema]="schema" [rootEntity]="'orders'" [(query)]="query"></bs-query-builder>

<bs-datatable [data]="rows" [filterTree]="query()" [filterSchema]="orderSchema">
  <!-- columns -->
</bs-datatable>
```

`bs-datatable` reads `[filterTree]`, runs `evaluateQuery(tree, row, filterSchema)` per row, and the rest of the existing filter/sort/paginate pipeline composes normally.

### Theming

All visible color / border / focus-ring tokens come from CSS custom properties. The dark-mode toggle from #324 applies with zero per-component overrides.

---

## Timeline & Milestones

Single PR. Internal milestones map 1:1 to the phases in [`issue_312_plan.md`](./issue_312_plan.md):

- [ ] **M1**: Data model + scaffold
- [ ] **M2**: Lit WC scaffold — read-only tree rendering
- [ ] **M3**: Built-in value editors per data type
- [ ] **M4**: Custom editor extensibility (factory callback at WC)
- [ ] **M5**: Edit mode — mutations through tree
- [ ] **M6**: Operator catalog + per-type filtering
- [ ] **M7**: Nested groups + sub-queries
- [ ] **M8**: Drag-and-drop reorder (within-group + cross-group)
- [ ] **M9**: Expression preview rendering
- [ ] **M10**: `evaluateQuery` helper
- [ ] **M11**: Visitor API + 5 reference serializers
- [ ] **M12**: Saved queries — events-only API
- [ ] **M13**: Angular wrapper (CVA + TemplateRef sugar + dataset binding)
- [ ] **M14**: `bs-datatable` `[filterTree]` integration
- [ ] **M15**: Demo page
- [ ] **M16**: Testing + a11y validation

Estimate: multi-month effort. Acknowledged at planning time; the user explicitly chose this scope.

---

## Open Questions

> No outstanding escalations — all decisions resolved with the developer during planning.

---

## Technical Notes (Issue-Specific)

- WC is colocated inside `libs/mintplayer-ng-bootstrap/query-builder/` (per #332 datetime-picker precedent), not a separate top-level `mp-query-builder-wc` lib.
- Sub-queries use **recursive `<mp-query-builder>`** rather than a separate "nested builder" element.
- Drag-and-drop uses pointer events exclusively; `touch-action: none` on the handle at element-creation time; no `preventDefault()` on touch `pointerdown`.
- `evaluateQuery` is a pure function — `[data]`/`(filteredResult)` on the wrapper and `[filterTree]` on `bs-datatable` both delegate to it. Single source of truth for evaluation semantics.
- Operator catalog is a static const — operators are a closed set in v1.
- Custom editors: WC owns the factory contract; Angular wrapper provides TemplateRef sugar. The wrapper's `*bsQueryBuilderEditor` directive uses `ViewContainerRef.createEmbeddedView` to mount the template and returns the view's host element to the WC. When the WC calls dispose, the wrapper destroys the embedded view.
- Saved-query persistence is intentionally absent. The demo wires localStorage; consumers can wire any backend.
- `bs-datatable` change is **additive only**: existing datatable consumers see no behaviour change. `[filterTree]` defaults to `null`.
- All 5 serializers are pure functions over the canonical `Expression` tree. Each is exported from its own sub-path so tree-shaking can drop unused ones.

---

## Related

- Issue #312 (this PRD)
- Issue #332 (DateTime Picker — most recent WC+wrapper + CVA precedent)
- Reference UI: https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder
- See CLAUDE.md for: WC + Angular wrapper pattern, Lit 3 migration status, theme system / dark-mode toggle (#324), Bootstrap grid usage rules ([[feedback_use_bs_grid_directives]]).

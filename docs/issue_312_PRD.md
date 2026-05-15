# Product Requirements Document: Query Builder

**Issue**: #312
**Title**: Query Builder
**Status**: Draft (revised after review pass)
**Created**: 2026-05-15
**Last Updated**: 2026-05-15

---

## Overview

Add `bs-query-builder` to `libs/mintplayer-ng-bootstrap` — a visual builder for composing arbitrarily nested AND/OR boolean queries, modelled on [Infragistics Ignite UI Angular `igxQueryBuilder`](https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder).

Shipped as **Lit web component (`mp-query-builder`) + Angular wrapper (`bs-query-builder`)** colocated inside a new `libs/mintplayer-ng-bootstrap/query-builder` secondary entry point, matching the precedent set by `bs-datetime-picker` (#332).

### Architectural principle

**The frontend emits a canonical JSON expression tree as its only wire format.** Backends receive the tree, validate it against their schema (whitelisted fields/operators/values per role), and build the actual DB query in their own language (SQL, RavenDB RQL, OData, Mongo, GraphQL, etc.) server-side. The frontend never emits raw DB query strings — that would either force the backend to execute them blindly (catastrophic injection risk) or force the backend to re-parse and validate them server-side (which makes a frontend serializer redundant). See [[feedback_json_wire_format_only]].

### What ships

- Lit WC (`mp-query-builder`) + Angular wrapper (`bs-query-builder`) with nested AND/OR groups, multi-entity sub-queries, drag-and-drop reorder (within-group, cross-group, **cross-tree with field reset on schema mismatch**), eight built-in value editors, expression preview, and saved-query event API.
- **Full Infragistics-parity operator catalog** including relative date operators (today, this/last/next week|month|year, last/next-N-days, year-to-date) and array/set operators (`any-of` / `all-of` / `none-of` / `is-empty` / `is-not-empty`) on a new `FieldType: 'array'`.
- **`ControlValueAccessor`** on the Angular wrapper with re-entrancy guard for `[(ngModel)]` / `[formControl]` integration.
- **Built-in in-memory filtering** — `[data]` + `(filteredResult)` on the Angular wrapper, internally calls `evaluateQuery`.
- **`@lit/context`-based propagation** of `editorRegistry` / `disabled` / `messages` to nested sub-query WCs. `query-change` events are non-bubbling; root WC re-dispatches a consolidated event so consumers see exactly one event per user edit regardless of depth.
- **Pure-function helpers**, exported: `evaluateQuery`, `visitTree<T>` (with lazy `walkInner: () => T`), `renderExpression`.
- **Custom value editors** via:
  - WC-level factory: `editorRegistry: Record<string, (ctx: EditorContext) => EditorHandle>` where `EditorHandle = { element: HTMLElement; dispose?: () => void }`.
  - Angular `*bsQueryBuilderEditor="fieldName"` structural directive that desugars to a factory using `ViewContainerRef.createEmbeddedView`.
  - Tight disposal contract: WC calls `handle.dispose?.()` on every removal path (field change, row remove, parent group remove, DnD reparent across schemas, WC disconnect).
- **Saved-query events**: `(saveQuery)` / `(loadQuery)` / `(deleteQuery)` with `[savedQueries]` input. Events-only — consumer persists (localStorage / IndexedDB / REST).

### What ships separately (or never)

- **No backend serializers** in the frontend bundle. Backend translation is the consumer's server-side concern. A C# RavenDB walker over the JSON tree is separate, server-side work.
- **No `bs-datatable` modification.** Consumers wire the builder to a datatable externally via `(filteredResult)` or by walking the tree on their server.

Reference UI surface: Infragistics `igxQueryBuilder`. We mimic the feature set, not the visual style. Visual style is Bootstrap 5 primitives (`form-control`, `input-group`, `dropdown-menu`, BS Icons), styled via CSS custom properties so the dark-mode toggle from #324 applies automatically.

---

## Goals & Objectives

### Primary Goals

- Ship a feature-complete visual query builder: nested AND/OR groups, multi-entity sub-queries, drag-and-drop (within-group + cross-group + cross-tree), eight value editors, full Infragistics-parity operator catalog (including relative date + array ops), reactive-forms integration, in-memory filtering, custom-editor projection, saved-query events — all in one release.
- Establish a canonical JSON expression-tree wire format that other library components and backend implementations can target.
- Full ARIA + keyboard parity on day one.

### Success Metrics

- A consumer can build, edit, evaluate, persist, and post any valid Infragistics-shaped query without writing serialization code.
- The JSON wire format round-trips losslessly through `setValue` / `valueChanges` (modulo node-id regeneration on adds).
- Keyboard-only users construct, reorder, and save a complete tree without the mouse.
- axe-core: zero serious findings on the demo page.
- Memory-leak test: `ApplicationRef.viewCount` stable across 100 add/remove cycles when custom editors are projected.
- Cross-browser: Chromium + Firefox both pass the e2e suite, including drag-ghost-not-clipped behaviour.

---

## Non-Goals / Out of Scope

- **Backend serializers** (SQL / OData / Mongo / Hasura / Prisma / RQL / LINQ predicate / GraphQL). Frontend emits the canonical JSON tree only. Backend translates server-side, where it owns schema validation. See [[feedback_json_wire_format_only]].
- **`bs-datatable` modification.** External wiring documented in the demo.
- **CVA for nested sub-query trees.** The tree is one value; `[formControl]` binds the root. Sub-queries are part of the root value, not separately bindable.
- **Operator semantic customization.** Operator catalog is a closed set; per-field operator *availability* is configurable via `[operatorOverrides]`.
- **Server-side schema validation in the frontend.** Frontend never validates whether the consumer's user role can query a given field — that's a server concern.
- **Apollo GraphQL with custom resolvers / arbitrary GraphQL filter dialects.** Same answer as all backend translations: it's server-side.
- **`bs-query-builder` as an introspectable AST.** The exported `Expression` type is plain JSON, not an AST that can be transformed via algebraic rewrite rules; consumers wanting that build it themselves with `visitTree`.

---

## Functional Requirements

### Must Have (P0)

**Core component**

- [ ] **FR-1**: New secondary entry point `@mintplayer/ng-bootstrap/query-builder` builds clean; registered per the repo's existing pattern (verify mechanism in implementation M1).
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
  - `[data]: unknown[]` (optional, for in-memory filtering)
  - `(queryChange)`, `(saveQuery)`, `(loadQuery)`, `(deleteQuery)`, `(filteredResult)` outputs.
- [ ] **FR-3**: WC owns and renders the tree recursively via `mp-query-group`, `mp-query-condition`, `mp-query-subquery`.
- [ ] **FR-4**: Group node renders an AND/OR segmented toggle + "Add condition" / "Add group" / "Add sub-query" buttons + remove button (disabled on root).
- [ ] **FR-5**: Condition node renders a field selector, operator selector (filtered by `OperatorCatalog[field.type]`), value editor (chosen by `field.type` × `operator`), drag handle, remove button.
- [ ] **FR-6**: Sub-query node renders a relation-field selector + `in`/`not-in` operator + recursive `<mp-query-builder>` for the sub-tree.

**Built-in value editors**

- [ ] **FR-7**: Eight built-in editors: string, number, integer, date, datetime, boolean (tri-state via `is-true`/`is-false`/`is-null`/`is-not-null`), enum (single-select), list (multi-select for `in`/`not-in`), array (multi-select for array operators), and a date-relative N-input rendered only for `last-N-days` / `next-N-days`.
- [ ] **FR-8**: Operator catalog (filtered per `FieldType` at runtime):
  - **String**: `equals`, `not-equals`, `contains`, `does-not-contain`, `starts-with`, `ends-with`, `is-null`, `is-not-null`, `in`, `not-in`
  - **Number / Integer**: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`, `in`, `not-in`
  - **Date / Datetime**: `equals`, `not-equals`, `lt`, `lte`, `gt`, `gte`, `between`, `not-between`, `is-null`, `is-not-null`, **`today`**, **`yesterday`**, **`this-week`**, **`last-week`**, **`next-week`**, **`this-month`**, **`last-month`**, **`next-month`**, **`this-year`**, **`last-year`**, **`next-year`**, **`last-n-days`**, **`next-n-days`**, **`year-to-date`**
  - **Boolean**: `is-true`, `is-false`, `is-null`, `is-not-null`
  - **Enum**: `equals`, `not-equals`, `in`, `not-in`, `is-null`, `is-not-null`
  - **Array** (new `FieldType`): `any-of`, `all-of`, `none-of`, `is-empty`, `is-not-empty`
- [ ] **FR-9**: Value shape per operator:
  - `between` / `not-between` → tuple `[v1, v2]`, inclusive.
  - `in` / `not-in` / `any-of` / `all-of` / `none-of` → array of scalars.
  - `last-n-days` / `next-n-days` → `{ n: number }`.
  - All other parameterless ops (`today`, `yesterday`, `this-*`, `last-*`, `next-*`, `is-null`, `is-not-null`, `is-true`, `is-false`, `is-empty`, `is-not-empty`) → `null`.

**Drag-and-drop**

- [ ] **FR-10**: Drag-and-drop reorder, pointer-events-based, with `touch-action: none` on the handle. No HTML5 native dnd. Both `pointerup` and `pointercancel` clean up the ghost.
- [ ] **FR-11**: Ghost element rendered in `document.body` (not in shadow DOM), `position: fixed`, `pointer-events: none`.
- [ ] **FR-12**: **Cross-group reparenting** — drops accepted in any sibling group; node `kind` and contents preserved.
- [ ] **FR-13**: **Cross-tree DnD** — drops accepted across different `mp-query-builder` roots (outer ↔ sub-query inner). Moved node retains field/operator/value if field exists in target schema; otherwise field resets to target's first field, operator to first valid, value cleared. Group moves apply this rule per descendant condition.
- [ ] **FR-14**: Cycle prevention — dropping a group into its own descendant is rejected (precomputed descendant set on `pointerdown`, O(1) per move).

**Evaluation, visitor, preview**

- [ ] **FR-15**: `evaluateQuery(tree, record, schema, options?)` exported as a pure function. Handles every operator including relative date ops (evaluated against `options.now ?? new Date()`) and array ops. Sub-queries via optional `getRelatedRecords(record, fieldName)` callback. NULL semantics: only `is-null`/`is-not-null` match nullness. String comparisons case-insensitive by default.
- [ ] **FR-16**: `renderExpression(tree, schema, messages?)` exported as a pure function returning a human-readable string with parentheses, localized operator labels, bracketed value lists for set ops.
- [ ] **FR-17**: `visitTree<T>(tree, visitor, ctx): T` exported with lazy `walkInner: () => T` on the `subquery` callback so visitors can scope context per sub-tree.

**Angular wrapper extras**

- [ ] **FR-18**: `bs-query-builder` implements `ControlValueAccessor` **with re-entrancy guard**: `writeValue` sets a `writingFromForm` flag, writes to the `query` model signal, clears the flag in a microtask. The model→onChange propagation effect early-returns when the flag is set. Prevents `writeValue → model → effect → onChange → setValue → writeValue` infinite loop.
- [ ] **FR-19**: `setDisabledState(state)` toggles a `disabled` input on the WC; Lit context propagates `disabled` to all nested sub-query WCs.
- [ ] **FR-20**: `[data]` + `(filteredResult)` — when `[data]` is provided, the wrapper emits the filtered subset on every `[(query)]` mutation. Uses `evaluateQuery` internally. Does not emit when `[data]` is absent.

**Custom editors**

- [ ] **FR-21**: WC-level `editorRegistry: Record<string, (ctx: EditorContext) => EditorHandle>` property. Lit context provides this to nested sub-query WCs unless they override.
- [ ] **FR-22**: `EditorHandle = { element: HTMLElement; dispose?: () => void }`. WC stores per-condition handles in a `Map<conditionId, EditorHandle>`. Calls `handle.dispose?.()` then `handle.element.remove()` on every removal path: field change, operator change with value-shape mismatch, row remove, parent group remove (recursive), DnD reparent across schemas, WC disconnect.
- [ ] **FR-23**: Angular-wrapper `*bsQueryBuilderEditor="fieldName"` structural directive. Wrapper aggregates content children into the `editorRegistry`. Each entry uses `ViewContainerRef.createEmbeddedView` and returns `{ element: view.rootNodes[0], dispose: () => view.destroy() }`. No Angular view leaks.

**Recursive WC propagation + event semantics**

- [ ] **FR-24**: Lit context (`@lit/context`) propagates `editorRegistry` / `disabled` / `messages` from the outer `mp-query-builder` to all nested sub-query `mp-query-builder` instances. Inner instances inherit unless their own property is explicitly set.
- [ ] **FR-25**: `query-change`, `save-query`, `load-query`, `delete-query` CustomEvents fire from inner WCs with `bubbles: false`. The outermost root listens to internal mutations via Lit reactive controllers and re-dispatches a single consolidated `query-change` event externally per user edit. Consumer sees exactly one event per edit regardless of tree depth.

**Saved queries**

- [ ] **FR-26**: Saved-query picker renders when `[showSavedQueries]=true`. Lists `savedQueries` with per-row Load + Delete buttons; "💾 Save current as..." action opens a name input.
- [ ] **FR-27**: `(saveQuery)` fires `{ name: string; tree: Expression }`; `(loadQuery)` fires `{ name: string }`; `(deleteQuery)` fires `{ name: string }`. Component does **not** persist; consumer wires `[savedQueries]` from their store.

**General**

- [ ] **FR-28**: Every node has a stable `id` (uuid) on creation; immutable updates everywhere; never mutate the input tree.
- [ ] **FR-29**: ARIA — each group renders `role="group"` with `aria-label="AND group" | "OR group"`; native focus order through form controls.
- [ ] **FR-30**: Demo page at `/advanced/query-builder` covers all 12 test scenarios including the external `bs-datatable` wiring example. Keymap documented.
- [ ] **FR-31**: Theming — internal Lit styles use CSS custom properties; dark-mode toggle from #324 applies without component-specific changes.
- [ ] **FR-32**: Public types re-exported: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EvaluateOptions`, `EditorContext`, `EditorHandle`, `SavedQuery`, `TreeVisitor`, `VisitorContext`.

### Should Have (P1)

- [ ] **FR-33**: Keyboard alternative to DnD — `Alt+ArrowUp` / `Alt+ArrowDown` on a focused row moves it among same-group siblings.
- [ ] **FR-34**: `[operatorOverrides]` input — `Partial<Record<string, Operator[]>>` keyed by field name to restrict the operator dropdown per field.

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
  field: string;            // FieldDef.name
  operator: Operator;
  value: unknown;           // shape depends on operator (see FR-9)
}

interface SubQueryCondition {
  kind: 'subquery';
  id: string;
  field: string;            // a relation field
  operator: 'in' | 'not-in';
  subQuery: Group;          // root of the nested tree
}

type Operator =
  | 'equals' | 'not-equals'
  | 'contains' | 'does-not-contain' | 'starts-with' | 'ends-with'
  | 'lt' | 'lte' | 'gt' | 'gte'
  | 'between' | 'not-between'
  | 'in' | 'not-in'
  | 'is-null' | 'is-not-null'
  | 'is-true' | 'is-false'
  // Date relative ops:
  | 'today' | 'yesterday'
  | 'this-week' | 'last-week' | 'next-week'
  | 'this-month' | 'last-month' | 'next-month'
  | 'this-year' | 'last-year' | 'next-year'
  | 'last-n-days' | 'next-n-days'
  | 'year-to-date'
  // Array ops:
  | 'any-of' | 'all-of' | 'none-of'
  | 'is-empty' | 'is-not-empty';

type FieldType =
  | 'string' | 'number' | 'integer'
  | 'date' | 'datetime'
  | 'boolean' | 'enum' | 'relation'
  | 'array';

interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: unknown; label: string }[];   // enum or array (of enum-like values)
  targetEntity?: string;                            // relation only
  // No `relationKey` — backend resolves FKs from its own schema/ORM metadata.
}

interface EntitySchema {
  name: string;
  label: string;
  fields: FieldDef[];
}

interface EvaluateOptions {
  caseSensitive?: boolean;        // default false for string ops
  now?: Date;                     // default new Date(); used by relative date ops; pinnable for tests
  getRelatedRecords?: (record: unknown, fieldName: string) => unknown[];
}

interface EditorContext {
  field: FieldDef;
  operator: Operator;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled: boolean;
}

interface EditorHandle {
  element: HTMLElement;
  dispose?: () => void;
}

interface SavedQuery {
  name: string;
  tree: Expression;
  createdAt?: string;     // ISO 8601 — optional metadata for consumers
}

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

**Round-trip rules**:
- IDs preserved on read; new IDs generated only on `add*` ops.
- `subQuery` is always a `Group` even if it has one child.
- Empty groups: `evaluateQuery` returns `true` for AND-empty, `false` for OR-empty (vacuous truth).

---

## UX Specification

### Anatomy

```
┌─ [Saved ▽] ─ Big open orders ─ [💾 Save] ───────────────────────┐  (visible when showSavedQueries=true)
└─────────────────────────────────────────────────────────────────┘
┌─ Query Builder ─────────────────────────────────────────────────┐
│ [AND ▽] (root group)                          [+condition] [+grp]│
│                                                                  │
│  ⋮ Total              [>      ▽] [100        ]          [×]      │
│  ⋮ Status             [equals ▽] [open       ▽]         [×]      │
│  ⋮ Order date         [last-N-days ▽] [7  ]             [×]      │
│  ⋮ Tags               [any-of ▽] [urgent × blocked × +] [×]      │
│  ⋮ ┌─ (OR group) ──────────────────────────[+c] [+g] [+sq] [×]──┐│
│  ⋮ │ ⋮ Country [equals ▽] [BE    ▽]                       [×]   ││
│  ⋮ │ ⋮ Country [equals ▽] [NL    ▽]                       [×]   ││
│  ⋮ └────────────────────────────────────────────────────────────┘│
│  ⋮ Orders [in ▽] ┌─ (subquery on Orders) ─────[+c] [+g] [×]────┐ │
│              ▲   │ ⋮ Total [>      ▽] [1000       ]      [×]   │ │
│              │   └─────────────────────────────────────────────│ │
└──────────────┴─────────────────────────────────────────────────┘
                                                                ▲
   Preview (when [showPreview]=true):                           │
   ┌──────────────────────────────────────────────────────────┐ │
   │ Total > 100 AND Status = "open"                          │ │
   │   AND Order date is in the last 7 days                   │ │
   │   AND Tags any of [urgent, blocked]                      │ │
   │   AND (Country = "BE" OR Country = "NL")                 │ │
   │   AND Orders IN (Total > 1000)                           │ │
   └──────────────────────────────────────────────────────────┘ │
                                                              drag handle
```

### Interactions

- **Add condition / Add group / Add sub-query** — buttons on each group header.
- **AND/OR toggle** — segmented control on each group.
- **Field change** — auto-resets operator + value if shapes mismatch.
- **Operator change** — auto-resets value if shape differs (e.g. switching from `equals` to `between` or to a parameterless relative date op).
- **Remove** — deletes the node and its subtree.
- **Drag**:
  - Pointer down on `⋮` starts drag; ghost rendered in `document.body`.
  - Pointer up over a drop slot reorders. Slots tagged with `data-qb-root="<rootId>"`.
  - Cross-group + cross-tree drops accepted; field reset applied if schema-mismatched.
  - Cycle prevention: drops into the dragged node's own descendants rejected.
  - `pointercancel` cleans up ghost without dispatching a move.
- **Saved-query picker** (when `[showSavedQueries]=true`): Load / Delete per item; "💾 Save current as..." action.

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

The directive's `let ctx` exposes `EditorContext`. The wrapper aggregates content children into an `editorRegistry`, forwards to the WC, and Lit context propagates the registry to all nested sub-query WCs.

### Custom editor projection (vanilla JS)

```js
const qb = document.querySelector('mp-query-builder');
qb.editorRegistry = {
  orderDate: (ctx) => {
    const el = document.createElement('my-datepicker');
    el.value = ctx.value;
    el.disabled = ctx.disabled;
    el.addEventListener('valueChange', e => ctx.onChange(e.detail));
    return { element: el }; // dispose optional
  }
};
```

### External `bs-datatable` wiring

```html
<bs-query-builder [schema]="schema" [rootEntity]="'orders'"
                  [(query)]="query"
                  [data]="rows"
                  (filteredResult)="filteredRows.set($event)">
</bs-query-builder>

<bs-datatable [data]="filteredRows()">
  <!-- columns -->
</bs-datatable>
```

No `bs-datatable` modifications. The builder filters in-memory and emits the result; the datatable receives it as plain data.

### Backend posting (architectural example)

```ts
async function search() {
  const tree = this.query();
  const response = await fetch('/api/customers/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: tree, page: 1 }),
  });
  // Backend validates `tree` against its schema, builds RQL (or SQL/Mongo/etc.), executes.
  return response.json();
}
```

### Keymap (documented on demo page)

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus through controls in DOM order |
| `Enter` on Add condition / Add group / Add sub-query | Insert child + focus the new field selector |
| `Delete` or `Backspace` on a focused row (no input active) | Remove the row, with confirmation |
| `Alt+ArrowUp` / `Alt+ArrowDown` on a focused row | Move row among same-group siblings (FR-33) |
| `Esc` | Close any open dropdown |

---

## Timeline & Milestones

Single PR. Internal milestones map 1:1 to phases in [`issue_312_plan.md`](./issue_312_plan.md):

- [ ] **M1**: Data model + scaffold (incl. registration mechanism verification)
- [ ] **M2**: Lit WC scaffold — read-only tree rendering
- [ ] **M3**: Built-in value editors per data type (incl. array editor + date-relative editor)
- [ ] **M4**: Custom editor extensibility (factory + `EditorHandle`)
- [ ] **M5**: Edit mode — mutations through tree (incl. `moveNode` with field-reset support)
- [ ] **M6**: Operator catalog + per-type filtering (incl. relative date + array ops)
- [ ] **M7**: Nested groups + sub-queries + Lit Context propagation + non-bubbling events
- [ ] **M8**: Drag-and-drop reorder (within-group + cross-group + cross-tree with field reset)
- [ ] **M9**: Expression preview rendering
- [ ] **M10**: `evaluateQuery` helper
- [ ] **M11**: Visitor API (lazy `walkInner`)
- [ ] **M12**: Saved queries — events-only API
- [ ] **M13**: Angular wrapper (CVA + re-entrancy guard + dataset binding + TemplateRef sugar)
- [ ] **M14**: Demo page (incl. external `bs-datatable` wiring example)
- [ ] **M15**: Testing + a11y validation (incl. memory-leak test)

Estimate: multi-month effort.

---

## Open Questions

> No outstanding escalations. M1 must verify the secondary-entry registration mechanism (`package.ts` vs `package.json` vs `ng-package.secondary.cjs`) before proceeding — the previous review flagged this as ambiguous.

---

## Technical Notes (Issue-Specific)

- WC colocated inside `libs/mintplayer-ng-bootstrap/query-builder/` per the #332 datetime-picker precedent.
- Sub-queries use **recursive `<mp-query-builder>`** as a new Lit-context root, inheriting `editorRegistry` / `disabled` / `messages` from the outer.
- `query-change` and saved-query events are non-bubbling internally; the root WC re-dispatches a single consolidated `query-change` per user edit.
- DnD: pointer events only; ghost in `document.body`; cross-tree moves with field reset on schema mismatch; descendant set precomputed on drag start.
- `EditorHandle { element, dispose? }` is a **new disposal convention** in this repo (no prior precedent for WC-mounted custom-element disposal). Document explicitly in the README and JSDoc.
- `evaluateQuery` is the *frontend reference* for the wire format's evaluation semantics. Backends are free to diverge (e.g., case-sensitive string compare). The JSON tree is the contract; backend semantics are backend-defined.
- Operator catalog is closed in v1. Set ops on tag fields use the new `'array'` `FieldType`; consumers describe a field as `{ type: 'array', options: [...] }` for known finite-value array fields.
- `[operatorOverrides]` restricts which operators show in the dropdown per field; cannot add new operator semantics.

---

## Related

- Issue #312 (this PRD)
- Issue #332 (DateTime Picker — most recent WC+wrapper + CVA precedent)
- Reference UI: https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder
- [[feedback_json_wire_format_only]] — wire-format-only architectural principle
- See CLAUDE.md for: WC + Angular wrapper pattern, Lit 3 migration status, theme system / dark-mode toggle (#324).

# Product Requirements Document: Query Builder

**Issue**: #312
**Title**: Query Builder
**Status**: Draft (revised: server-side-only architecture + ASP.NET Core demo backend)
**Created**: 2026-05-15
**Last Updated**: 2026-05-15

---

## Overview

Add `bs-query-builder` to `libs/mintplayer-ng-bootstrap` — a visual builder for composing arbitrarily nested AND/OR boolean queries, modelled on [Infragistics Ignite UI Angular `igxQueryBuilder`](https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder).

Shipped as **Lit web component (`mp-query-builder`) + Angular wrapper (`bs-query-builder`)** colocated inside a new `libs/mintplayer-ng-bootstrap/query-builder` secondary entry point, matching the precedent set by `bs-datetime-picker` (#332).

### Architectural principle

**The frontend emits a canonical JSON expression tree as its only wire format.** Backends receive the tree, validate it against their schema (whitelisted fields/operators/values per role), and build the actual DB query in their own language (SQL, RavenDB RQL, OData, Mongo, GraphQL, etc.) server-side. The frontend never emits raw DB query strings — that would either force the backend to execute them blindly (catastrophic injection risk) or force the backend to re-parse and validate them server-side (which makes a frontend serializer redundant). See [[feedback_json_wire_format_only]].

**No client-side query evaluation either.** Pagination, filtering, and sorting are all server-side concerns. The library does not ship an in-process `evaluateQuery`, a `[data]` input, or a `(filteredResult)` output. The reasons are (a) consistency — what the user sees on screen is exactly what the backend computed, no JS-vs-DB divergence; (b) honesty — a 10k-row in-memory filter is a misleading demo when a real production filter must page a million rows; (c) simplicity — one code path (POST tree → page back) instead of two. To make this concrete and end-to-end testable, **this issue also adds a colocated ASP.NET Core 9 Web API at `apps/api/`** that the Angular demo posts to — SQLite-backed, deployed alongside the Angular app via the existing docker-compose / Traefik / GHCR pipeline.

### What ships

**Library:**
- Lit WC (`mp-query-builder`) + Angular wrapper (`bs-query-builder`) with nested AND/OR groups, multi-entity sub-queries, drag-and-drop reorder (within-group, cross-group, **cross-tree with field reset on schema mismatch**), eight built-in value editors, expression preview, and saved-query event API.
- **Full Infragistics-parity operator catalog** including relative date operators (today, this/last/next week|month|year, last/next-N-days, year-to-date) and array/set operators (`any-of` / `all-of` / `none-of` / `is-empty` / `is-not-empty`) on a new `FieldType: 'array'`.
- **`ControlValueAccessor`** on the Angular wrapper with re-entrancy guard for `[(ngModel)]` / `[formControl]` integration.
- **`@lit/context`-based propagation** of `editorRegistry` / `disabled` / `messages` to nested sub-query WCs. `query-change` events are non-bubbling; root WC re-dispatches a consolidated event so consumers see exactly one event per user edit regardless of depth.
- **Pure-function helpers**, exported: `visitTree<T>` (with lazy `walkInner: () => T`) and `renderExpression`. The visitor stays useful for consumers writing JS-side transformations (debug printers, simplifiers, pre-validators); the preview stays useful because it derives from the tree's structural shape, not from an evaluator.
- **Custom value editors** via:
  - WC-level factory: `editorRegistry: Record<string, (ctx: EditorContext) => EditorHandle>` where `EditorHandle = { element: HTMLElement; dispose?: () => void }`.
  - Angular `*bsQueryBuilderEditor="fieldName"` structural directive that desugars to a factory using `ViewContainerRef.createEmbeddedView`.
  - Tight disposal contract: WC calls `handle.dispose?.()` on every removal path (field change, row remove, parent group remove, DnD reparent across schemas, WC disconnect).
- **Saved-query events**: `(saveQuery)` / `(loadQuery)` / `(deleteQuery)` with `[savedQueries]` input. Events-only — consumer persists (localStorage / IndexedDB / REST).

**Demo backend (new `apps/api/` project):**
- ASP.NET Core 9 Web API with `POST /api/orders/search`, `POST /api/customers/search` endpoints accepting `QueryRequest { query, timezone?, page, pageSize, sort? }` and returning `PagedResult<T> { items, totalCount, page, pageSize }`.
- SQLite + EF Core persistence; seed script populates ~1000 Orders and ~200 Customers on first startup.
- C# JSON tree walker translating the expression tree to `IQueryable<T>` predicates, implementing the canonical operator semantics from Appendix A (TZ-aware relative date ops via `TimeZoneInfo`, ISO 8601 weeks, validation per Appendix D).
- Multi-stage Dockerfile (`mcr.microsoft.com/dotnet/aspnet:9.0-alpine`); compose service `api` behind Traefik on `api.bootstrap.mintplayer.com`.
- Angular `proxy.conf.json` proxies `/api/*` to `http://localhost:5000` during `ng serve` so dev works without CORS.

### What ships separately (or never)

- **No backend serializers** in the frontend bundle. Backend translation is the consumer's server-side concern. The `apps/api/` walker is the reference implementation, not a published library.
- **No `bs-datatable` modification.** The demo wires `bs-datatable` to the API's paginated response via a `(search)` handler on the demo page itself.
- **No client-side `evaluateQuery`.** Removed by design — see Architectural principle. If a consumer wants in-process evaluation (e.g. for offline mode), they own that code.
- **No client-side pagination / sorting.** The Angular wrapper does not orchestrate page/size/sort state; the demo page does.

Reference UI surface: Infragistics `igxQueryBuilder`. We mimic the feature set, not the visual style. Visual style is Bootstrap 5 primitives (`form-control`, `input-group`, `dropdown-menu`, BS Icons), styled via CSS custom properties so the dark-mode toggle from #324 applies automatically.

---

## Goals & Objectives

### Primary Goals

- Ship a feature-complete visual query builder: nested AND/OR groups, multi-entity sub-queries, drag-and-drop (within-group + cross-group + cross-tree), eight value editors, full Infragistics-parity operator catalog (including relative date + array ops), reactive-forms integration, custom-editor projection, saved-query events — all in one release.
- Establish a canonical JSON expression-tree wire format that other library components and backend implementations can target.
- Prove the wire-format contract end-to-end by shipping a colocated ASP.NET Core 9 demo API (`apps/api/`) with a reference C# walker → `IQueryable<T>` translator, plus the docker-compose + Traefik + CI changes to deploy it alongside the Angular app.
- Full ARIA + keyboard parity on day one.

### Success Metrics

- A consumer can build, edit, persist, and POST any valid Infragistics-shaped query without writing serialization code.
- The JSON wire format round-trips losslessly through `setValue` / `valueChanges` (modulo node-id regeneration on adds).
- Demo page builds a non-trivial tree, posts it to `apps/api/`, and the API returns the correct paginated result (Playwright e2e covers this end-to-end).
- The `apps/api/` walker accepts every operator from Appendix A and rejects every invalid payload from the Appendix D checklist.
- Keyboard-only users construct, reorder, and save a complete tree without the mouse.
- axe-core: zero serious findings on the demo page.
- Memory-leak test: `ApplicationRef.viewCount` stable across 100 add/remove cycles when custom editors are projected.
- Cross-browser: Chromium + Firefox both pass the e2e suite, including drag-ghost-not-clipped behaviour.
- `docker compose up` (locally) brings up both services; the Angular dev proxy resolves `/api/*` against the running API container.

---

## Non-Goals / Out of Scope

- **Backend serializers** (SQL / OData / Mongo / Hasura / Prisma / RQL / LINQ predicate / GraphQL) in the frontend bundle. Frontend emits the canonical JSON tree only. Backend translates server-side, where it owns schema validation. See [[feedback_json_wire_format_only]]. The `apps/api/` walker is a *reference* — not a publishable serializer.
- **Client-side query evaluation / in-memory filtering.** No `evaluateQuery` helper, no `[data]` input, no `(filteredResult)` output, no `EvaluateOptions`. Pagination / filtering / sorting are all server-side. The demo posts the tree to `apps/api/` and renders the paginated result.
- **`bs-datatable` modification.** The demo wires the datatable to the API's paginated response via the demo page's own search handler.
- **CVA for nested sub-query trees.** The tree is one value; `[formControl]` binds the root. Sub-queries are part of the root value, not separately bindable.
- **Operator semantic customization.** Operator catalog is a closed set; per-field operator *availability* is configurable via `[operatorOverrides]`.
- **Server-side schema validation in the frontend.** Frontend never validates whether the consumer's user role can query a given field — that's a server concern.
- **Apollo GraphQL with custom resolvers / arbitrary GraphQL filter dialects.** Same answer as all backend translations: it's server-side.
- **`bs-query-builder` as an introspectable AST.** The exported `Expression` type is plain JSON, not an AST that can be transformed via algebraic rewrite rules; consumers wanting that build it themselves with `visitTree`.
- **`apps/api/` as a production-grade service.** It's a demo backend — SQLite, single tenant, no auth, no rate limiting. Real consumers writing real backends use it as a template, not a library.

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
  - `[maxDepth]: number` (default `32` — finite to prevent stack overflow on pathological trees; consumers can raise or lower. Used by `visitTree` and the render path.)
  - `[timezone]: string` (default `Intl.DateTimeFormat().resolvedOptions().timeZone` — IANA timezone identifier the consumer posts alongside the tree so the backend resolves relative date operators identically; surfaced as a wrapper input mainly to make the demo's POST body explicit. Consumers can override e.g. to force UTC for an admin tool, or pin a tenant-specific zone.)
  - `[savedQueries]: SavedQuery[]` (default `[]`)
  - `[operatorOverrides]: Partial<Record<string, Operator[]>>`
  - `[disabled]: boolean` (default `false`)
  - `(queryChange)`, `(saveQuery)`, `(loadQuery)`, `(deleteQuery)` outputs. **No `[data]` input, no `(filteredResult)` output** — server-side only.
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

**Visitor, preview**

- [ ] **FR-15**: ~~`evaluateQuery`~~ — **REMOVED.** No client-side query evaluation; pagination/filtering/sorting are server-side only. Backend implementers refer to Appendix A for canonical semantics; the `apps/api/` C# walker is the reference implementation.
- [ ] **FR-16**: `renderExpression(tree, schema, messages?)` exported as a pure function returning a human-readable string with parentheses, localized operator labels, bracketed value lists for set ops. Derives from the tree's structural shape — no evaluator needed.
- [ ] **FR-17**: `visitTree<T>(tree, visitor, ctx): T` exported with lazy `walkInner: () => T` on the `subquery` callback so visitors can scope context per sub-tree. Useful for consumer JS-side transformations (debug printers, simplifiers, pre-validators).

**Angular wrapper extras**

- [ ] **FR-18**: `bs-query-builder` implements `ControlValueAccessor` **with re-entrancy guard**: `writeValue` sets a `writingFromForm` flag, writes to the `query` model signal, clears the flag in a microtask. The model→onChange propagation effect early-returns when the flag is set. Prevents `writeValue → model → effect → onChange → setValue → writeValue` infinite loop.
- [ ] **FR-19**: `setDisabledState(state)` toggles a `disabled` input on the WC; Lit context propagates `disabled` to all nested sub-query WCs.
- [ ] **FR-20**: ~~`[data]` + `(filteredResult)`~~ — **REMOVED.** No client-side filtering. The demo page wires its own HTTP search handler to `POST /api/{entity}/search` and feeds the response to `bs-datatable`.

**Custom editors**

- [ ] **FR-21**: WC-level `editorRegistry: Record<string, (ctx: EditorContext) => EditorHandle>` property. Lit context provides this to nested sub-query WCs unless they override.
- [ ] **FR-22**: `EditorHandle = { element: HTMLElement; dispose?: () => void }`. WC stores per-condition handles in a `Map<conditionId, EditorHandle>`. Calls `handle.dispose?.()` then `handle.element.remove()` on every removal path: field change, operator change with value-shape mismatch, row remove, parent group remove (recursive), DnD reparent across schemas, WC disconnect.
- [ ] **FR-23**: Angular-wrapper `*bsQueryBuilderEditor="fieldName"` structural directive. Wrapper aggregates content children into the `editorRegistry`. Each entry uses `ViewContainerRef.createEmbeddedView` and returns `{ element: view.rootNodes[0], dispose: () => view.destroy() }`. No Angular view leaks.

**Recursive WC propagation + event semantics**

- [ ] **FR-24**: Lit context (`@lit/context`) propagates `editorRegistry` / `disabled` / `messages` from the outer `mp-query-builder` to all nested sub-query `mp-query-builder` instances. Each `mp-query-builder` is both a `ContextConsumer` (subscribes to outer changes) and a `ContextProvider` (broadcasts to descendants). Per-token inheritance semantics: `editorRegistry` = **override** (`this.editorRegistry ?? consumed`); `disabled` = **OR** (`consumed || this.disabled`); `messages` = **merge** (`{ ...consumed, ...this.messages }`). The effective value is computed in `willUpdate` and pushed to the provider; `subscribe: true` on each consumer ensures reactive propagation when an outer changes.
- [ ] **FR-25**: `query-change`, `save-query`, `load-query`, `delete-query` CustomEvents fire from inner WCs with `bubbles: false`. The outermost root listens to internal mutations via Lit reactive controllers and re-dispatches a single consolidated `query-change` event externally per user edit. Consumer sees exactly one event per edit regardless of tree depth.

**Saved queries**

- [ ] **FR-26**: Saved-query picker renders when `[showSavedQueries]=true`. Lists `savedQueries` with per-row Load + Delete buttons; "💾 Save current as..." action opens a name input.
- [ ] **FR-27**: `(saveQuery)` fires `{ name: string; tree: Expression }`; `(loadQuery)` fires `{ name: string }`; `(deleteQuery)` fires `{ name: string }`. Component does **not** persist; consumer wires `[savedQueries]` from their store.

**General**

- [ ] **FR-28**: Every node has a stable `id` (uuid) on creation; immutable updates everywhere; never mutate the input tree.
- [ ] **FR-29**: ARIA — each group renders `role="group"` with `aria-label="AND group" | "OR group"`; native focus order through form controls.
- [ ] **FR-30**: Demo page at `/advanced/query-builder` covers all 12 test scenarios including the server-side `bs-datatable` wiring example (POSTs `QueryRequest` to `/api/orders/search`, renders `PagedResult<Order>`). Keymap documented.
- [ ] **FR-31**: Theming — internal Lit styles use CSS custom properties; dark-mode toggle from #324 applies without component-specific changes.
- [ ] **FR-32**: Public types re-exported: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EditorContext`, `EditorHandle`, `EditorRegistry`, `SavedQuery`, `TreeVisitor`, `VisitorContext`, `VisitTreeOptions`, `MaxDepthExceededError`, `validateOperatorOverrides`.

**Robustness**

- [ ] **FR-35**: `visitTree` / `renderExpression` track depth via their `VisitorContext` and throw a typed `MaxDepthExceededError` when exceeding `options.maxDepth ?? 32`. The WC renders an inline "Tree too deep" placeholder for any subtree exceeding `[maxDepth]` rather than rendering recursively.
- [ ] **FR-36**: `[operatorOverrides]` is runtime-validated by the wrapper. For each field, the override's `Operator[]` is intersected with `OperatorCatalog[field.type]`. Operators outside the catalog for that field's type are stripped, with a `console.warn` listing the field + invalid operators. `validateOperatorOverrides(schema, overrides): { warnings: string[]; sanitized: ... }` is exported so consumers can pre-validate at compile-time-ish boundaries.
- [ ] **FR-37**: ~~Debounced/memoized `(filteredResult)`~~ — **REMOVED** (no `(filteredResult)`). Demo-page search handler debounces its own HTTP fetch if it wants; the wrapper does not orchestrate that.
- [ ] **FR-38**: Shadow-DOM hit-test for DnD: prefer `document.elementsFromPoint(x, y)` (composed path); fallback recursively walks `mp-query-builder` shadow roots calling `shadowRoot.elementFromPoint(x, y)`. Bounded at `maxDepth` levels.
- [ ] **FR-39**: DnD `DragController` cancels cleanly on mid-drag tree mutation. When the WC's `query` property changes and the dragged `sourceId` is no longer present in the new tree, the controller calls `pointercancel`'s cleanup path: ghost removed from `document.body`, internal state reset, no `moveNode` dispatched.
- [ ] **FR-40**: All `document.body` access guarded by `typeof document !== 'undefined'` (SSR safety; per dock precedent).

### Should Have (P1)

- [ ] **FR-33**: Keyboard alternative to DnD — `Alt+ArrowUp` / `Alt+ArrowDown` on a focused row moves it among same-group siblings.
- [ ] **FR-34**: `[operatorOverrides]` input — `Partial<Record<string, Operator[]>>` keyed by field name to restrict the operator dropdown per field. Runtime-validated per FR-36.

### Backend & Infrastructure (P0)

- [ ] **FR-41**: New `apps/api/` ASP.NET Core 9 Web API project, integrated into the Nx workspace via a `project.json` with `nx:run-commands`-wrapped `build`/`serve`/`publish`/`test` targets. Sources tracked by `nx affected` via `inputs: ["{projectRoot}/**/*.cs", "{projectRoot}/**/*.csproj"]`.
- [ ] **FR-42**: SQLite + EF Core 9 persistence. Schema for `Order`, `Customer`, `LineItem` (relations: `Customer 1—N Order`, `Order 1—N LineItem`). Seed runs on first startup, populates ~1000 Orders + ~200 Customers + ~5000 LineItems. SQLite file lives in a Docker volume so data persists across container restarts.
- [ ] **FR-43**: C# JSON tree walker `QueryBuilderWalker` translates `Expression` JSON to `Expression<Func<T, bool>>` via `System.Linq.Expressions`, applied as `IQueryable<T>.Where(...)`. Implements every operator from Appendix A. Relative date ops resolve via `TimeZoneInfo.FindSystemTimeZoneById` on the envelope's `timezone` field, fall back to UTC if absent. Validates every payload against the Appendix D checklist before walking; emits HTTP 400 with the typed error code on any rule violation.
- [ ] **FR-44**: HTTP endpoints:
  - `POST /api/orders/search` — body `QueryRequest`, returns `PagedResult<Order>`.
  - `POST /api/customers/search` — body `QueryRequest`, returns `PagedResult<Customer>`.
  - `GET  /api/{entity}/schema` — returns `EntitySchema[]` so the Angular demo can fetch entity metadata dynamically (avoids hardcoding the schema in the Angular bundle).
  - `QueryRequest` envelope: `{ query: Expression, timezone?: string, page: number, pageSize: number, sort?: { field: string, direction: 'asc'|'desc' }[] }`. `page` is 1-based; `pageSize ≤ 100`.
  - `PagedResult<T>`: `{ items: T[], totalCount: number, page: number, pageSize: number }`.
- [ ] **FR-45**: Root `docker-compose.yml` updated. Adds `api` service using `ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master`, attached to the existing external `web` network, with Traefik labels routing `api.bootstrap.mintplayer.com` to port 8080. Adds a SQLite-volume mount. New `docker-compose.override.yml` (auto-loaded, untracked locally? — see Open Questions) exposes `5000:8080` for local-dev `ng serve` proxy use.
- [ ] **FR-46**: `apps/ng-bootstrap-demo/proxy.conf.json` proxies `/api/*` to `http://localhost:5000` for `ng serve`. Wired in `apps/ng-bootstrap-demo/project.json` under `serve.options.proxyConfig`. Production build keeps the subdomain split — Angular code fetches `/api/...` and Traefik routes the `api.bootstrap.mintplayer.com` host to the API container.
- [ ] **FR-47**: `.github/workflows/publish-master.yml` updated: adds `actions/setup-dotnet@v4` with `dotnet-version: 9.0.x` before the existing Docker build steps; adds a second `docker/build-push-action@v6` step targeting `apps/api/Dockerfile`, pushing `ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master`. The remote SSH deploy step is unchanged (`docker compose pull && docker compose up -d` handles N services). PR workflow runs `dotnet test apps/api/` alongside the existing Vitest + Playwright suites.

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

interface VisitTreeOptions {
  maxDepth?: number;              // default 32; throws MaxDepthExceededError on overflow
}

// Wire-format envelope the demo (and any consumer) POSTs to the backend.
interface QueryRequest {
  query: Expression;              // the canonical JSON tree (see Appendix B)
  timezone?: string;              // IANA zone identifier; backend resolves relative date ops in this zone
  page: number;                   // 1-based
  pageSize: number;               // capped at 100 server-side
  sort?: SortDescriptor[];
}

interface SortDescriptor {
  field: string;                  // FieldDef.name
  direction: 'asc' | 'desc';
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
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
- Empty groups: the backend walker (and Appendix A) treats AND-empty as `true` and OR-empty as `false` (vacuous truth).

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

### Server-side `bs-datatable` wiring (demo pattern)

```html
<bs-query-builder [schema]="schema" [rootEntity]="'orders'" [(query)]="query"/>

<button class="btn btn-primary" (click)="search()">Search</button>

<bs-datatable
  [data]="result().items"
  [totalCount]="result().totalCount"
  [page]="page()"
  [pageSize]="pageSize()"
  (pageChange)="onPage($event)">
  <!-- columns -->
</bs-datatable>
```

```ts
private http = inject(HttpClient);
query = model<Expression>(emptyGroup());
page = signal(1);
pageSize = signal(20);
result = signal<PagedResult<Order>>({ items: [], totalCount: 0, page: 1, pageSize: 20 });

search() {
  const req: QueryRequest = {
    query: this.query(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    page: this.page(),
    pageSize: this.pageSize(),
  };
  this.http.post<PagedResult<Order>>('/api/orders/search', req).subscribe(r => this.result.set(r));
}

onPage(p: { page: number; pageSize: number }) {
  this.page.set(p.page);
  this.pageSize.set(p.pageSize);
  this.search();
}
```

No `bs-datatable` modifications, no `[data]` input on the query builder. The demo owns the HTTP fetch and feeds the response to the datatable. In `ng serve`, `/api/orders/search` is proxied to `http://localhost:5000` (the `apps/api/` container). In production, Traefik routes the `api.bootstrap.mintplayer.com` subdomain to the API container.

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

- [ ] **M1**: Data model + scaffold (secondary entry point, model types, visitor types, context tokens, errors)
- [ ] **M2**: Lit WC scaffold — read-only tree rendering
- [ ] **M3**: Built-in value editors per data type (incl. array editor + date-relative editor)
- [ ] **M4**: Custom editor extensibility (factory + `EditorHandle`)
- [ ] **M5**: Edit mode — mutations through tree (incl. `moveNode` with field-reset support)
- [ ] **M6**: Operator catalog + per-type filtering (incl. relative date + array ops)
- [ ] **M7**: Nested groups + sub-queries + Lit Context propagation + non-bubbling events
- [ ] **M8**: Drag-and-drop reorder (within-group + cross-group + cross-tree with field reset)
- [ ] **M9**: Expression preview rendering
- [ ] **M10**: Visitor API (`visitTree<T>` with lazy `walkInner`)
- [ ] **M11**: Saved queries — events-only API
- [ ] **M12**: Angular wrapper (CVA + re-entrancy guard + `*bsQueryBuilderEditor`)
- [ ] **M13**: ASP.NET Core 9 API (`apps/api/`) — EF Core + SQLite seed + C# walker + endpoints
- [ ] **M14**: Docker + `docker-compose.yml` + `proxy.conf.json` + CI workflow updates
- [ ] **M15**: Demo page wired to the API (server-side search + pagination)
- [ ] **M16**: Testing + a11y validation (Vitest + xUnit + Playwright e2e + axe-core + memory-leak)

Estimate: multi-month effort.

---

## Open Questions

> Resolved during M1 (2026-05-15): secondary-entry registration is auto-discovered by ng-packagr via the `**/ng-package.js` glob; no changes to parent `package.ts`, `package.json` `exports`, or `ng-package.secondary.cjs` needed.
>
> **One soft open question**: should `docker-compose.override.yml` be committed (for contributor convenience) or gitignored (so production-shaped configs don't leak to prod)? The team's recommendation is to commit it as a *dev-only* compose overlay with a header comment stating "do not deploy". *Assumption*: we commit it with that header.

---

## Technical Notes (Issue-Specific)

- WC colocated inside `libs/mintplayer-ng-bootstrap/query-builder/` per the #332 datetime-picker precedent.
- Sub-queries use **recursive `<mp-query-builder>`** as a new Lit-context root, inheriting `editorRegistry` / `disabled` / `messages` from the outer.
- `query-change` and saved-query events are non-bubbling internally; the root WC re-dispatches a single consolidated `query-change` per user edit.
- DnD: pointer events only; ghost in `document.body`; cross-tree moves with field reset on schema mismatch; descendant set precomputed on drag start.
- `EditorHandle { element, dispose? }` is a **new disposal convention** in this repo (no prior precedent for WC-mounted custom-element disposal). Document explicitly in the README and JSDoc.
- **No client-side evaluator.** `apps/api/`'s C# walker is the reference implementation of Appendix A semantics; backend implementers can read it as a guide but are not bound by its EF-Core-flavoured idioms. The JSON tree is the contract.
- Operator catalog is closed in v1. Set ops on tag fields use the new `'array'` `FieldType`; consumers describe a field as `{ type: 'array', options: [...] }` for known finite-value array fields.
- `[operatorOverrides]` restricts which operators show in the dropdown per field; cannot add new operator semantics.
- **`apps/api/` is a demo app, not a library**. It's not published to NuGet or npm. Real consumers writing real backends use it as a reference, not a dependency.
- **Nx integration** uses plain `nx:run-commands` because Nx 21 doesn't have `@nx/dotnet` (Nx 22+) and the community `@nx-dotnet/core` plugin is archived/deprecated. `inputs: ["{projectRoot}/**/*.cs", "{projectRoot}/**/*.csproj"]` keeps `nx affected` working.
- **EF Core + SQLite** was chosen over RavenDB.Embedded (205 MB NuGet package) for the demo. Real RavenDB consumers reuse the operator-catalog + Appendix-A semantics from the walker but emit RQL instead of LINQ expressions.

---

## Related

- Issue #312 (this PRD)
- Issue #332 (DateTime Picker — most recent WC+wrapper + CVA precedent)
- Reference UI: https://www.infragistics.com/products/ignite-ui-angular/angular/components/query-builder
- [[feedback_json_wire_format_only]] — wire-format-only architectural principle
- See CLAUDE.md for: WC + Angular wrapper pattern, Lit 3 migration status, theme system / dark-mode toggle (#324).

---

## Appendix A — Operator Semantics Reference

This appendix defines the **canonical semantics** of every operator. `evaluateQuery` (the frontend in-process evaluator) implements these rules exactly. Backend implementations SHOULD match these rules so that what the user builds visually returns the same rows the live preview shows. Backends that intentionally diverge MUST document the divergence per Appendix F.

**Global rules**:
- Relative date operators are resolved in the **effective timezone** (`options.timezone`, an IANA zone identifier like `"America/Sao_Paulo"`). The wrapper's default is `Intl.DateTimeFormat().resolvedOptions().timeZone` (the user's browser-local zone). The consumer SHOULD post this same timezone alongside the tree to the backend so the backend can resolve identically. If `options.timezone` is absent, fall back to UTC — but this is a fallback, not the recommended default.
- The reference instant is `options.now` (default `new Date()`). All "today / this-week / last-N-days" boundaries are computed from `now` projected into the effective timezone.
- All week boundaries follow **ISO 8601** (Monday is day 1; weeks span Monday 00:00:00.000 local to Sunday 23:59:59.999 local in the effective timezone).
- String comparisons are **case-insensitive by default** (`options.caseSensitive = false`). Set `options.caseSensitive = true` to opt into case-sensitive comparisons.
- NULL handling: `field === null || field === undefined` is treated as null. Only `is-null` / `is-not-null` (and array-`is-empty` / `is-not-empty`) match nullness; all other operators return `false` against null.
- Sub-query operators short-circuit: `in` returns `true` as soon as one related record matches; `not-in` returns `true` if zero related records match.

### Comparison operators

| Operator | Algorithm |
|---|---|
| `equals` | `field === value` (after JS coercion within compatible types; strings honor `caseSensitive`). Null short-circuits to `false`. |
| `not-equals` | `!(field === value)`; null short-circuits to `false`. |
| `lt` | `field < value`. Null short-circuits to `false`. |
| `lte` | `field <= value`. |
| `gt` | `field > value`. |
| `gte` | `field >= value`. |
| `between` | `field >= value[0] && field <= value[1]` (inclusive both ends). `value` MUST satisfy `value[0] <= value[1]`; otherwise backend rejects with 400. |
| `not-between` | `!(between)`. |

### String operators

| Operator | Algorithm |
|---|---|
| `contains` | `toLower(field).includes(toLower(value))` (case-insensitive default). |
| `does-not-contain` | `!contains`. |
| `starts-with` | `toLower(field).startsWith(toLower(value))`. |
| `ends-with` | `toLower(field).endsWith(toLower(value))`. |

### Set operators

| Operator | Algorithm |
|---|---|
| `in` | `value.includes(field)` (with string case-insensitivity per default). All elements of `value` MUST share the field's scalar type. |
| `not-in` | `!in`. |

### Null operators

| Operator | Algorithm |
|---|---|
| `is-null` | `field === null \|\| field === undefined`. |
| `is-not-null` | `!is-null`. |

### Boolean operators

| Operator | Algorithm |
|---|---|
| `is-true` | `field === true`. |
| `is-false` | `field === false`. |

### Relative date operators (timezone-aware, ISO 8601 weeks)

Let `N = options.now`, `TZ = options.timezone` (IANA). All boundaries below are computed in `TZ`, then converted to UTC for the comparison against the field (which is assumed to be a UTC instant on the wire). `startOfDay(N, TZ)` = the most recent local midnight in `TZ` ≤ `N`. `mondayOfISOWeek(N, TZ)` = the most recent local Monday 00:00 in `TZ` ≤ `N`. `firstOfMonth(N, TZ)` = the local 1st of N's local month at 00:00 in `TZ`. `jan1(year, TZ)` = local Jan 1 00:00 of `year` in `TZ`.

| Operator | Algorithm |
|---|---|
| `today` | `startOfDay(N, TZ) <= field < startOfDay(N, TZ) + 1 local day` |
| `yesterday` | `startOfDay(N, TZ) - 1 local day <= field < startOfDay(N, TZ)` |
| `this-week` | `mondayOfISOWeek(N, TZ) <= field < mondayOfISOWeek(N, TZ) + 7 local days` |
| `last-week` | `mondayOfISOWeek(N, TZ) - 7 local days <= field < mondayOfISOWeek(N, TZ)` |
| `next-week` | `mondayOfISOWeek(N, TZ) + 7 local days <= field < mondayOfISOWeek(N, TZ) + 14 local days` |
| `this-month` | `firstOfMonth(N, TZ) <= field < firstOfMonth(N, TZ) + 1 local month` |
| `last-month` | `firstOfMonth(N, TZ) - 1 local month <= field < firstOfMonth(N, TZ)` |
| `next-month` | `firstOfMonth(N, TZ) + 1 local month <= field < firstOfMonth(N, TZ) + 2 local months` |
| `this-year` | `jan1(N.localYear, TZ) <= field < jan1(N.localYear + 1, TZ)` |
| `last-year` | `jan1(N.localYear - 1, TZ) <= field < jan1(N.localYear, TZ)` |
| `next-year` | `jan1(N.localYear + 1, TZ) <= field < jan1(N.localYear + 2, TZ)` |
| `last-n-days` | `startOfDay(N - (value.n - 1) local days, TZ) <= field <= N`. `value.n` MUST be a positive integer ≥ 1. **Inclusive of today.** |
| `next-n-days` | `N <= field < startOfDay(N + value.n local days, TZ)`. `value.n` MUST be a positive integer ≥ 1. **Inclusive of today.** |
| `year-to-date` | `jan1(N.localYear, TZ) <= field <= N` |

**DST note**: "1 local day" is a calendar day in `TZ` — typically 24 hours, but 23 hours on spring-forward DST transition days and 25 hours on fall-back days. Use a calendar-aware date library (`Temporal` in modern JS, `NodaTime` / `TimeZoneInfo` in .NET, `pytz` in Python) rather than millisecond arithmetic.

### Array operators

For array-typed field `A` and array value `V`:

| Operator | Algorithm |
|---|---|
| `any-of` | `V.some(v => A.includes(v))`. Null `A` → `false`. |
| `all-of` | `V.every(v => A.includes(v))`. Null `A` → `false`. |
| `none-of` | `!V.some(v => A.includes(v))`. Null `A` → `true` (vacuous). |
| `is-empty` | `A.length === 0 \|\| A === null`. Null `A` is treated as empty. |
| `is-not-empty` | `!is-empty`. |

---

## Appendix B — Canonical JSON Example

The recommended request envelope wraps the tree alongside the client's IANA timezone (used by relative-date operators):

```json
{
  "query": { /* expression tree, see below */ },
  "timezone": "America/Sao_Paulo"
}
```

The `timezone` field is optional — backends fall back to UTC if absent — but consumers should send it whenever the tree contains any relative-date operator. The wrapper's `[timezone]` input defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone` so a vanilla wiring matches the user's browser-local resolution.

The tree itself, a non-trivial query exercising nested groups, multi-entity sub-query, relative date op, array op, `between`, and `is-null`:

```json
{
  "kind": "group",
  "id": "00000000-0000-4000-8000-000000000001",
  "logic": "and",
  "children": [
    {
      "kind": "condition",
      "id": "00000000-0000-4000-8000-000000000002",
      "field": "total",
      "operator": "gt",
      "value": 100
    },
    {
      "kind": "condition",
      "id": "00000000-0000-4000-8000-000000000003",
      "field": "orderDate",
      "operator": "last-n-days",
      "value": { "n": 30 }
    },
    {
      "kind": "condition",
      "id": "00000000-0000-4000-8000-000000000004",
      "field": "tags",
      "operator": "any-of",
      "value": ["urgent", "blocked"]
    },
    {
      "kind": "group",
      "id": "00000000-0000-4000-8000-000000000005",
      "logic": "or",
      "children": [
        {
          "kind": "condition",
          "id": "00000000-0000-4000-8000-000000000006",
          "field": "status",
          "operator": "equals",
          "value": "open"
        },
        {
          "kind": "condition",
          "id": "00000000-0000-4000-8000-000000000007",
          "field": "status",
          "operator": "is-null",
          "value": null
        }
      ]
    },
    {
      "kind": "subquery",
      "id": "00000000-0000-4000-8000-000000000008",
      "field": "lineItems",
      "operator": "in",
      "subQuery": {
        "kind": "group",
        "id": "00000000-0000-4000-8000-000000000009",
        "logic": "and",
        "children": [
          {
            "kind": "condition",
            "id": "00000000-0000-4000-8000-000000000010",
            "field": "amount",
            "operator": "between",
            "value": [10, 500]
          }
        ]
      }
    }
  ]
}
```

`renderExpression` of this tree (with default English messages):

```
(Total > 100
  AND Order date is in the last 30 days
  AND Tags any-of [urgent, blocked]
  AND (Status = "open" OR Status is null)
  AND Line items IN (Amount between [10, 500]))
```

---

## Appendix C — Wire-Format Value Type Reference

Per-operator JSON value shape. Backends MUST reject values whose JSON type doesn't match this table.

| Operator | JSON value type | TypeScript signature |
|---|---|---|
| `equals`, `not-equals` (string field) | `string` | `string` |
| `equals`, `not-equals` (number / integer field) | `number` | `number` |
| `equals`, `not-equals` (date / datetime field) | `string` (ISO 8601 with TZ) | `string` |
| `equals`, `not-equals` (boolean field) | `boolean` | `boolean` |
| `equals`, `not-equals` (enum field) | matches `FieldDef.options[i].value` type | `unknown` |
| `lt`, `lte`, `gt`, `gte` | scalar matching field type | `unknown` |
| `between`, `not-between` | array of length 2, `[v1, v2]`, `v1 <= v2`, both same type | `[unknown, unknown]` |
| `contains`, `does-not-contain`, `starts-with`, `ends-with` | `string` | `string` |
| `in`, `not-in` | homogeneous array, all elements match field type | `unknown[]` |
| `any-of`, `all-of`, `none-of` (array field) | homogeneous array, element type matches `FieldDef.options[i].value` if defined | `unknown[]` |
| `is-null`, `is-not-null`, `is-true`, `is-false`, `is-empty`, `is-not-empty` | `null` literal (NOT undefined or absent) | `null` |
| `today`, `yesterday`, `this-*`, `last-*`, `next-*`, `year-to-date` (parameterless date) | `null` literal | `null` |
| `last-n-days`, `next-n-days` | `{ "n": number }` where `n` is a positive integer ≥ 1 | `{ n: number }` |

**Encoding constraints**:
- **Date values**: ISO 8601 with explicit timezone, e.g. `"2026-05-15T00:00:00.000Z"`. Unix-epoch numbers MUST be rejected; backends parse via their canonical date library.
- **Number values**: must fit in `Number.MAX_SAFE_INTEGER` (±2^53 − 1). Larger IDs MUST be encoded as `string` with the `FieldDef` declared `type: 'string'`.
- **`between` ordering**: `v1 ≤ v2` REQUIRED. Backend rejects reversed tuples rather than swapping silently.
- **Array homogeneity**: all elements of `in` / `not-in` / `any-of` / `all-of` / `none-of` arrays MUST share the scalar type matching the field.
- **`null` literal**: parameterless operators MUST serialize `value: null` explicitly. Omitting the key or sending `undefined` is rejected.

**Request envelope** (recommended; not part of the tree itself):

```ts
interface QueryRequest {
  query: Expression;       // the tree (this Appendix)
  timezone?: string;       // IANA timezone identifier, e.g. "America/Sao_Paulo".
                           // Used to resolve relative date operators (see Appendix A).
                           // Backends fall back to UTC if absent.
}
```

The wrapper's `[timezone]` input defaults to the browser's local TZ via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Consumers send this string alongside the tree.

---

## Appendix D — Backend Validation Checklist

Ordered list of MUST-reject rules the backend executes before translating to its query language. Each violation responds **HTTP 400** with a typed error code.

1. **Strict JSON parse**: no `$ref` / `$id` reference resolution (.NET: use `ReferenceHandler.Default`, not `Preserve`). Unknown top-level fields on any node → reject (`UNKNOWN_FIELD`).
2. **Tree depth cap**: reject if depth > configured maximum (recommended `32`) (`TREE_TOO_DEEP`).
3. **Node count cap**: reject if total nodes > configured maximum (recommended `1024`) (`TREE_TOO_LARGE`).
4. **ID format**: every `id` is UUID v4 syntactically (`INVALID_NODE_ID`).
5. **ID uniqueness**: no duplicate `id` across the entire tree (incl. sub-queries) (`DUPLICATE_NODE_ID`).
6. **`kind` validity**: exactly one of `'group' | 'condition' | 'subquery'` (`UNKNOWN_KIND`).
7. **`kind: 'group'`** validations: `logic ∈ {'and', 'or'}` (`INVALID_LOGIC`); `children` is array (`INVALID_CHILDREN`).
8. **`kind: 'condition'`** validations:
   - `field` references a real, non-relation field in the current entity's schema (`UNKNOWN_FIELD`).
   - `operator` ∈ `OperatorCatalog[field.type]` (`INVALID_OPERATOR_FOR_TYPE`).
   - `value` matches Appendix C shape for `(field.type, operator)` (`INVALID_VALUE_SHAPE`).
9. **`kind: 'subquery'`** validations:
   - `operator` ∈ `{'in', 'not-in'}` (`INVALID_SUBQUERY_OPERATOR`).
   - `field` references a `type: 'relation'` field in the current entity's schema (`SUBQUERY_FIELD_NOT_RELATION`).
   - `subQuery` is itself a `kind: 'group'` node (`SUBQUERY_BODY_NOT_GROUP`).
10. **Role-based field whitelist**: current user is permitted to query each referenced field (per the consumer's auth model) (`FIELD_NOT_PERMITTED`).
11. **Role-based operator whitelist**: current user is permitted to use each operator on each field (`OPERATOR_NOT_PERMITTED`).
12. **Value length caps**: string ≤ 1024 chars; array element count ≤ 256 (`VALUE_TOO_LARGE`).
13. **Numeric range**: `number` values within field's declared range; integer fields receive integers (no decimals) (`NUMBER_OUT_OF_RANGE`).
14. **Date format**: date / datetime strings parse cleanly via the backend's canonical date library; reject malformed (`INVALID_DATE_FORMAT`).
15. **Sub-query field returns to the parent's foreign-key column**: the backend resolves the relation (e.g., `orders` → `order.customer_id`) from its own ORM/schema; reject if the relation is not configured (`SUBQUERY_RELATION_NOT_CONFIGURED`).
16. **Timezone**: if the request envelope includes `timezone`, it MUST be a valid IANA zone identifier resolvable by the backend's date library (e.g., `TimeZoneInfo.FindSystemTimeZoneById` in .NET — note this requires the IANA-style ID, not the Windows name, on .NET 6+ with the ICU library). Reject malformed or unknown TZ with `INVALID_TIMEZONE`. Absent `timezone` falls back to UTC resolution for all relative date operators.

---

## Appendix E — Reference C# Walker Skeleton (RavenDB RQL target)

Skeleton showing how a backend visitor over the JSON tree produces RavenDB RQL. The user is the primary consumer; this template is the integration starting point. Fill in `EmitConditionRql` per Appendix A.

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

public record VisitorContext(string CurrentEntity, int Depth, TimeZoneInfo Timezone);

public class QueryBuilderToRql
{
    private readonly Dictionary<string, EntitySchema> _schemas;
    private readonly int _maxDepth;

    public QueryBuilderToRql(IEnumerable<EntitySchema> schemas, int maxDepth = 32)
    {
        _schemas = schemas.ToDictionary(s => s.Name);
        _maxDepth = maxDepth;
    }

    /// Accepts the full request envelope: { query, timezone? }.
    /// Resolves the IANA timezone via TimeZoneInfo (requires .NET 6+ with ICU).
    public string Build(JsonElement envelope, string rootEntity)
    {
        var tree = envelope.GetProperty("query");
        var tz = envelope.TryGetProperty("timezone", out var tzProp) && tzProp.ValueKind == JsonValueKind.String
            ? ResolveTimezone(tzProp.GetString()!)
            : TimeZoneInfo.Utc;

        ValidateRootShape(tree);
        var ctx = new VisitorContext(rootEntity, 0, tz);
        return Visit(tree, ctx);
    }

    private static TimeZoneInfo ResolveTimezone(string iana)
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById(iana); }
        catch (TimeZoneNotFoundException) { throw new BadHttpRequestException("INVALID_TIMEZONE"); }
        catch (InvalidTimeZoneException) { throw new BadHttpRequestException("INVALID_TIMEZONE"); }
    }

    private string Visit(JsonElement node, VisitorContext ctx)
    {
        if (ctx.Depth > _maxDepth)
            throw new BadHttpRequestException("TREE_TOO_DEEP");

        return node.GetProperty("kind").GetString() switch
        {
            "group" => VisitGroup(node, ctx),
            "condition" => VisitCondition(node, ctx),
            "subquery" => VisitSubquery(node, ctx),
            _ => throw new BadHttpRequestException("UNKNOWN_KIND")
        };
    }

    private string VisitGroup(JsonElement node, VisitorContext ctx)
    {
        var logic = node.GetProperty("logic").GetString();
        if (logic != "and" && logic != "or")
            throw new BadHttpRequestException("INVALID_LOGIC");
        var combinator = logic == "and" ? " AND " : " OR ";
        var children = node.GetProperty("children").EnumerateArray().ToList();
        if (children.Count == 0)
            return logic == "and" ? "true" : "false"; // vacuous (Appendix A)
        var inner = ctx with { Depth = ctx.Depth + 1 };
        var parts = children.Select(c => Visit(c, inner));
        return "(" + string.Join(combinator, parts) + ")";
    }

    private string VisitCondition(JsonElement node, VisitorContext ctx)
    {
        var field = node.GetProperty("field").GetString()!;
        var op = node.GetProperty("operator").GetString()!;
        var value = node.GetProperty("value");
        var fieldDef = ResolveField(ctx.CurrentEntity, field)
            ?? throw new BadHttpRequestException("UNKNOWN_FIELD");
        if (fieldDef.Type == "relation")
            throw new BadHttpRequestException("FIELD_IS_RELATION");
        if (!IsOperatorValidForType(op, fieldDef.Type))
            throw new BadHttpRequestException("INVALID_OPERATOR_FOR_TYPE");

        // EmitConditionRql implements every operator from Appendix A in RQL syntax.
        return EmitConditionRql(field, op, value, fieldDef);
    }

    private string VisitSubquery(JsonElement node, VisitorContext ctx)
    {
        var field = node.GetProperty("field").GetString()!;
        var op = node.GetProperty("operator").GetString()!;
        if (op != "in" && op != "not-in")
            throw new BadHttpRequestException("INVALID_SUBQUERY_OPERATOR");

        var fieldDef = ResolveField(ctx.CurrentEntity, field)
            ?? throw new BadHttpRequestException("UNKNOWN_FIELD");
        if (fieldDef.Type != "relation")
            throw new BadHttpRequestException("SUBQUERY_FIELD_NOT_RELATION");

        var subQuery = node.GetProperty("subQuery");
        var inner = ctx with { CurrentEntity = fieldDef.TargetEntity!, Depth = ctx.Depth + 1 };
        var subRql = Visit(subQuery, inner);

        // RQL sub-query pattern; adjust for your data model.
        var operatorKw = op == "in" ? "in" : "not in";
        return $"id() {operatorKw} (from {fieldDef.TargetEntity} where {subRql} select id())";
    }

    // ... implement: ValidateRootShape (depth/count/id-uniqueness caps),
    //               ResolveField (schema lookup),
    //               IsOperatorValidForType (Appendix A operator catalog),
    //               EmitConditionRql (per-operator RQL emission with parameterised values).
}
```

Fill out `EmitConditionRql` per Appendix A. Note relative date operators take `ctx.Timezone` and resolve boundaries in that zone, then convert to UTC for the comparison:

```csharp
private string EmitConditionRql(string field, string op, JsonElement value, FieldDef def, VisitorContext ctx)
{
    return op switch
    {
        "equals"      => $"{field} = {EmitValue(value, def)}",
        "not-equals"  => $"{field} != {EmitValue(value, def)}",
        "gt"          => $"{field} > {EmitValue(value, def)}",
        "between"     => EmitBetween(field, value, def),
        "contains"    => $"search({field}, {EmitValue(value, def)})",
        "in"          => $"{field} in ({EmitArray(value, def)})",
        "is-null"     => $"{field} = null",
        "today"       => EmitDateRange(field, StartOfToday(ctx.Timezone), StartOfTomorrow(ctx.Timezone)),
        "last-n-days" => EmitLastNDays(field, value.GetProperty("n").GetInt32(), ctx.Timezone),
        "any-of"      => EmitAnyOf(field, value, def),
        // ... etc
        _ => throw new BadHttpRequestException("UNSUPPORTED_OPERATOR")
    };
}

private static (DateTime startUtc, DateTime endUtc) DayBoundsInTz(DateTime nowUtc, TimeZoneInfo tz)
{
    var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);
    var localMidnight = localNow.Date;          // 00:00 in the local zone
    var startUtc = TimeZoneInfo.ConvertTimeToUtc(localMidnight, tz);
    var endUtc   = TimeZoneInfo.ConvertTimeToUtc(localMidnight.AddDays(1), tz);
    return (startUtc, endUtc);
}

private DateTime StartOfToday(TimeZoneInfo tz)     => DayBoundsInTz(DateTime.UtcNow, tz).startUtc;
private DateTime StartOfTomorrow(TimeZoneInfo tz)  => DayBoundsInTz(DateTime.UtcNow, tz).endUtc;
```

---

## Appendix F — Divergence Disclosure Template

Each backend implementing this contract ships its own copy of this document in its README, declaring how it conforms to the canonical spec and where it intentionally diverges.

```markdown
# Query Builder Backend — <Your Backend Name>

## Implementation
- Query language: <RavenDB RQL / PostgreSQL SQL / OData / ...>
- Schema source: <ORM / hand-written / introspection>
- Validation library: <FluentValidation / DataAnnotations / custom>

## Conformance with PRD Appendix A (operator semantics)

| Topic | Conformance | Notes |
|---|---|---|
| Date timezone | ✓ resolves in request's `timezone` field; UTC fallback | matches spec |
| Week start | ✓ ISO 8601 (Monday) | matches spec |
| DST handling | ✓ via TimeZoneInfo / library | local-day = 23/24/25 hours per calendar |
| String case-sensitivity (default) | ⚠ DIVERGES | Postgres default collation is case-sensitive. Frontend live preview will differ from API results for queries containing mixed-case substrings. |
| `between` inclusivity | ✓ inclusive | matches spec |
| Null handling for comparisons | ✓ false-against-null | matches spec |
| Array `is-empty` against missing field | ✓ true | matches spec |

## Conformance with PRD Appendix C (value shapes)

- [ ] All value shapes accepted per Appendix C
- [ ] Date encoded as ISO 8601 with TZ
- [ ] Big integers as strings
- [ ] `between` ordering validated

## Conformance with PRD Appendix D (validation checklist)

- [ ] Strict JSON parse (no `$ref`)
- [ ] Depth cap = 32
- [ ] Node count cap = 1024
- [ ] ID uniqueness
- [ ] Per-kind schema validation
- [ ] Per-field role whitelist
- [ ] Per-operator field-type validation
- [ ] Value type/length/range caps
- [ ] Sub-query field-is-relation check
- [ ] Date format strict parse
```

---

## Appendix G — Demo Backend (`apps/api/`)

The demo backend is a single ASP.NET Core 9 Web API that the Angular demo POSTs to. It is *not* a published library; it's a reference implementation of the Appendix A operator catalog + Appendix D validation checklist, written against EF Core 9 + SQLite.

### Project layout

```
apps/api/
├── Api.csproj                       # ASP.NET Core 9; refs Microsoft.EntityFrameworkCore.Sqlite
├── Program.cs                       # WebApplication builder; AddControllers; UseRouting; MapControllers
├── appsettings.json                 # ConnectionStrings:Default → "Data Source=/data/demo.db"
├── appsettings.Development.json     # ConnectionStrings:Default → "Data Source=demo.db"
├── Dockerfile                       # multi-stage; sdk:9.0-alpine → aspnet:9.0-alpine; exposes 8080
├── project.json                     # Nx targets (build/serve/publish/test) via nx:run-commands
├── Models/
│   ├── Order.cs                     # Id, CustomerId (FK), Total, Status, OrderDate, Tags (JSON string)
│   ├── Customer.cs                  # Id, Name, Country, Email, CreatedAt
│   └── LineItem.cs                  # Id, OrderId (FK), ProductName, UnitPrice, Quantity
├── Data/
│   ├── DemoDbContext.cs             # EF Core context with the three DbSets + FK navs
│   └── DemoSeed.cs                  # Idempotent seed on EnsureCreated; ~200 customers + ~1000 orders + ~5000 line items
├── QueryBuilder/
│   ├── Expression.cs                # C# DTO mirror of the JSON tree
│   ├── QueryBuilderWalker.cs        # Builds Expression<Func<T, bool>> from the tree; per-operator switch
│   ├── Validator.cs                 # Appendix D checklist; throws QueryBuilderException(string code) on violation
│   ├── EntitySchemaService.cs       # Returns EntitySchema[] for /schema endpoints
│   └── TzDateMath.cs                # TimeZoneInfo + ISO 8601 week math; DST-safe
├── Controllers/
│   ├── OrdersController.cs          # POST /api/orders/search, GET /api/orders/schema
│   └── CustomersController.cs       # POST /api/customers/search, GET /api/customers/schema
└── Tests/
    └── Api.Tests.csproj             # xUnit; coverage = operator catalog × validation rules
```

### Endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/orders/search` | `QueryRequest` | `PagedResult<OrderDto>` |
| POST | `/api/customers/search` | `QueryRequest` | `PagedResult<CustomerDto>` |
| GET | `/api/orders/schema` | — | `EntitySchema[]` |
| GET | `/api/customers/schema` | — | `EntitySchema[]` |

### Walker entry point

```csharp
public sealed class QueryBuilderWalker<T> where T : class
{
    public IQueryable<T> Apply(IQueryable<T> source, Expression tree, VisitorContext ctx)
    {
        Validator.Validate(tree, ctx);          // Appendix D rules; throws on violation
        var predicate = Build(tree, ctx);       // Expression<Func<T,bool>>
        return source.Where(predicate);
    }
    private Expression<Func<T, bool>> Build(Expression tree, VisitorContext ctx) { /* ... */ }
}
```

Per-operator branches inside `Build` produce `BinaryExpression`/`MethodCallExpression`-shaped predicates. The relative-date ops use `TzDateMath.DayBoundsInTz(DateTime.UtcNow, ctx.Timezone)` (etc.) to compute UTC range tuples, which become `field >= start && field < end` predicates that EF Core translates to parameterised SQL.

### Error contract

The walker throws `QueryBuilderException(string code, string? detail = null)`. An exception filter (`QueryBuilderExceptionFilter : IExceptionFilter`) catches it and emits:

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{ "code": "INVALID_OPERATOR_FOR_TYPE", "detail": "field=total operator=contains" }
```

The `code` values are the strings from Appendix D.

### Docker shape

`apps/api/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src
COPY apps/api/Api.csproj apps/api/
RUN dotnet restore apps/api/Api.csproj
COPY apps/api/ apps/api/
RUN dotnet publish apps/api/Api.csproj -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
VOLUME ["/data"]
ENTRYPOINT ["dotnet", "Api.dll"]
```

### docker-compose service

Added to root `docker-compose.yml` alongside the existing `ng-bootstrap` service:

```yaml
services:
  ng-bootstrap:
    # ... existing config ...

  api:
    image: ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ng-bootstrap-api.rule=Host(`api.bootstrap.mintplayer.com`)"
      - "traefik.http.routers.ng-bootstrap-api.entrypoints=websecure"
      - "traefik.http.routers.ng-bootstrap-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.ng-bootstrap-api.loadbalancer.server.port=8080"
    volumes:
      - api-data:/data
    networks: [web]
    restart: unless-stopped

volumes:
  api-data:

networks:
  web:
    external: true
```

`docker-compose.override.yml` (committed, dev-only — header comment `# DEV-ONLY — do not deploy to prod`):

```yaml
services:
  api:
    ports:
      - "5000:8080"
```

### Angular dev proxy

`apps/ng-bootstrap-demo/proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:5000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Wired in `apps/ng-bootstrap-demo/project.json` under `serve.options.proxyConfig`.

### CI workflow updates

`.github/workflows/publish-master.yml`:
1. Add `actions/setup-dotnet@v4` with `dotnet-version: 9.0.x` before the existing Docker build step.
2. Add a second `docker/build-push-action@v6` step pushing `ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master` from `apps/api/Dockerfile`.
3. SSH deploy step unchanged — `docker compose pull && docker compose up -d` handles N services.

`.github/workflows/pull-request.yml`:
1. Add `actions/setup-dotnet@v4`.
2. Add `dotnet test apps/api/Tests/Api.Tests.csproj` after the existing Vitest run.

### Why not RavenDB for the demo?

The user's primary backend target is RavenDB RQL. We don't ship a RavenDB demo because (a) `RavenDB.Embedded` is a 205 MB NuGet package vs SQLite's ~1 MB footprint; (b) RavenDB's document-store semantics fight a SQL-shaped query-builder UI; (c) a RavenDB consumer reads Appendix A + the SQLite walker as references, then emits RQL with the same operator catalog. The walker's architecture (validator + per-operator translator) is identical regardless of target DB; only the leaf "how to emit a `between` predicate" differs.

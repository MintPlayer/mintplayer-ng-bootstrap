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
- Exported pure-function helpers: `visitTree<T>` (with lazy `walkInner: () => T`) and `renderExpression`. **No `evaluateQuery`** — pagination / filtering / sorting are server-side only.
- Custom value editors via WC-level factory callback (`EditorHandle { element, dispose? }`) and Angular `*bsQueryBuilderEditor` structural directive that desugars to factory callbacks.
- Saved-query events (`saveQuery` / `loadQuery` / `deleteQuery`) with `[savedQueries]` input — events-only, consumer persists.
- `@lit/context`-based propagation of `editorRegistry` / `disabled` / `messages` to nested sub-query WCs; `query-change` events fire `bubbles: false` and the root WC re-dispatches consolidated events.
- **New `apps/api/` ASP.NET Core 9 Web API** — SQLite + EF Core, C# walker translating the JSON tree to `IQueryable<T>`, `POST /api/{entity}/search` endpoints returning `PagedResult<T>`. Drives the Angular demo end-to-end.
- **Docker + compose + CI updates** — new `apps/api/Dockerfile`, root `docker-compose.yml` extended with an `api` service behind Traefik on `api.bootstrap.mintplayer.com`, `apps/ng-bootstrap-demo/proxy.conf.json` for `ng serve`, `actions/setup-dotnet@v4` + second `docker/build-push-action` in the GH Actions workflow.

**Explicitly NOT in scope** (and not future-deferred work on this component either — these belong to other tools):

- No backend serializers in the frontend bundle (`toSql` / `toODataFilter` / `toMongoFilter` / `toHasuraWhere` / `toPrismaWhere` / `toLinqPredicate` — all dropped). Backend translation is the consumer's server-side responsibility. `apps/api/`'s walker is a *reference*, not a library.
- No client-side `evaluateQuery`. Removed by design. The demo posts the tree to `apps/api/` and renders the paginated result.
- No `[data]` input / `(filteredResult)` output on the Angular wrapper. The demo's search handler owns the HTTP call and feeds `bs-datatable` directly.
- No `bs-datatable` modification.

This is a multi-month effort, phased internally as 16 milestones inside one branch.

---

## Problem Statement

### Current Behavior

`@mintplayer/ng-bootstrap` has no query builder. Consumers wanting a visual filter UI must compose `bs-datatable` filter inputs ad-hoc (no AND/OR grouping, no nesting), or roll their own component. There is no canonical JSON shape for "a boolean expression tree" in the library, so consumers can't agree on a wire format between frontends and backends.

### Expected Behavior

A new secondary entry point `@mintplayer/ng-bootstrap/query-builder` exports `bs-query-builder` (Angular) backed by `mp-query-builder` (Lit). The component renders a Bootstrap-styled tree of groups, conditions, and sub-queries; emits a canonical JSON `Expression` tree via two-way `[(query)]`; integrates with Angular reactive forms via `ControlValueAccessor`; supports custom value editors per field via the `*bsQueryBuilderEditor` directive.

The canonical JSON tree is the **only wire format**. Consumers post it to their backend; the backend validates it against its schema and builds the DB query. Pagination, filtering, and sorting are server-side.

To prove the wire-format contract end-to-end, this PR also adds **`apps/api/`** — an ASP.NET Core 9 Web API with SQLite + EF Core persistence and a C# walker that translates the JSON tree into `IQueryable<T>` predicates. The Angular demo POSTs `QueryRequest { query, timezone?, page, pageSize, sort? }` to `POST /api/{entity}/search` and renders the resulting `PagedResult<T>` in a `bs-datatable`. The API ships behind Traefik on `api.bootstrap.mintplayer.com` via the existing GHCR + `appleboy/ssh-action` deploy pipeline.

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
│       │   ├── expression.ts                             # Expression discriminated union + Operator union
│       │   ├── field-def.ts                              # FieldDef, EntitySchema types (minimal — no relationKey)
│       │   ├── operators.ts                              # OperatorCatalog per FieldType (incl. relative date + array ops)
│       │   ├── tree-ops.ts                               # immutable add/remove/update/move helpers
│       │   ├── default-tree.ts                           # emptyGroup() / emptyCondition() / cloneTree() / newId()
│       │   ├── errors.ts                                 # MaxDepthExceededError
│       │   ├── editor.ts                                 # EditorContext / EditorHandle / EditorRegistry
│       │   ├── messages.ts                               # QueryBuilderMessages + DEFAULT_MESSAGES (EN)
│       │   └── saved-query.ts                            # SavedQuery interface
│       ├── visitor/
│       │   ├── visit-tree.ts                             # lazy walker — `visitTree(tree, visitor)` with walkInner
│       │   └── visitor-types.ts                          # TreeVisitor<T> contract
│       ├── dnd/
│       │   ├── drag-controller.ts                        # pointer-events controller, ghost in document.body
│       │   └── drop-zone.ts                              # drop-slot rendering + hit-test
│       └── preview/
│           └── render-expression.ts                      # tree → human-readable string
└── README.md

apps/ng-bootstrap-demo/src/app/pages/advanced/query-builder/           NEW
├── query-builder.component.ts                            # demo page; wires bs-query-builder + HttpClient + bs-datatable
├── query-builder.component.html
└── query-builder.component.scss

apps/ng-bootstrap-demo/proxy.conf.json                                 NEW (proxies /api/* → :5000)

apps/ng-bootstrap-demo-e2e/src/query-builder.spec.ts                   NEW

apps/api/                                                              NEW PROJECT (ASP.NET Core 9)
├── Api.csproj
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
├── Dockerfile                                            # multi-stage; sdk:9.0-alpine → aspnet:9.0-alpine
├── project.json                                          # Nx targets via nx:run-commands
├── Models/
│   ├── Order.cs
│   ├── Customer.cs
│   └── LineItem.cs
├── Data/
│   ├── DemoDbContext.cs                                  # EF Core + SQLite
│   └── DemoSeed.cs                                       # ~1000 orders + ~200 customers + ~5000 line items
├── QueryBuilder/
│   ├── Expression.cs                                     # C# DTO mirror of the JSON tree
│   ├── QueryBuilderWalker.cs                             # Expression → Expression<Func<T,bool>>
│   ├── Validator.cs                                      # Appendix D checklist
│   ├── EntitySchemaService.cs                            # returns EntitySchema[] for /schema endpoints
│   └── TzDateMath.cs                                     # TimeZoneInfo + ISO 8601 week math
└── Controllers/
    ├── OrdersController.cs
    └── CustomersController.cs

apps/api/Tests/                                                        NEW
├── Api.Tests.csproj                                      # xUnit
├── WalkerTests.cs                                        # every operator from Appendix A
└── ValidatorTests.cs                                     # every rule from Appendix D

docker-compose.override.yml                                            NEW (dev-only port exposure)
```

### Files to modify

- `libs/mintplayer-ng-bootstrap/package.json` — add `@lit/context` to `peerDependencies` alongside `lit`. **DONE in M1.**
- **No changes to `libs/mintplayer-ng-bootstrap/package.ts`, `libs/mintplayer-ng-bootstrap/package.json` exports field, or `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs`.** Secondary-entry registration is auto-discovered by ng-packagr via the `**/ng-package.js` glob (verified against the datetime-picker precedent). The new entry only needs its own `ng-package.js` + `index.ts` + `src/index.ts` — ng-packagr picks them up automatically on build.
- `apps/ng-bootstrap-demo/src/app/app.routes.ts` (or equivalent) — add `/advanced/query-builder` route.
- `apps/ng-bootstrap-demo/project.json` — wire `serve.options.proxyConfig` to the new `proxy.conf.json`.
- Demo sidebar / navigation — link the demo page.
- **`docker-compose.yml`** (root) — add `api` service with Traefik labels for `api.bootstrap.mintplayer.com`, attach to the existing external `web` network, mount `api-data` volume.
- **`.github/workflows/publish-master.yml`** — insert `actions/setup-dotnet@v4` step + a second `docker/build-push-action@v6` block pushing `ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master` from `apps/api/Dockerfile`.
- **`.github/workflows/pull-request.yml`** — insert `actions/setup-dotnet@v4` + `dotnet test apps/api/Tests/Api.Tests.csproj`.

**No changes to `bs-datatable`.** Demo wires the builder to a datatable externally by POSTing to `apps/api/` and feeding the response back.

### Dependencies

- `lit` (already a workspace dep).
- **NEW: `@lit/context`** (~3 kB tree-shakeable) — for propagating `editorRegistry` / `disabled` / `messages` to nested sub-query WCs.
- No other runtime dependencies for the library. Drag-and-drop uses native pointer events.
- **`apps/api/` NuGet refs**:
  - `Microsoft.AspNetCore.App` (framework reference, .NET 9)
  - `Microsoft.EntityFrameworkCore.Sqlite` 9.x
  - `Microsoft.EntityFrameworkCore.Design` 9.x (dev-only)
  - `xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`, `Microsoft.AspNetCore.Mvc.Testing` (test project)

### Architecture Considerations

- **Wire format**: canonical JSON `Expression` tree only. Frontend never emits SQL/RQL/OData/Mongo/GraphQL. Backend validates the tree against its schema and builds the DB query. See [[feedback_json_wire_format_only]].
- **No client-side evaluation.** `evaluateQuery` is not shipped. Pagination / filtering / sorting are server-side. The demo POSTs `QueryRequest` to `apps/api/` and renders the resulting `PagedResult<T>`. Single code path; no JS↔DB semantics divergence to debug.
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
- **Operator catalog**: closed but expanded per Infragistics. New entries: relative date operators, array operators on the new `'array'` `FieldType`.
- **`apps/api/` backend project (NEW)**: ASP.NET Core 9 Web API, SQLite + EF Core. The C# walker (`QueryBuilderWalker<T>`) takes the JSON tree + the entity's `IQueryable<T>` and builds an `Expression<Func<T,bool>>` via `System.Linq.Expressions`, then applies `.Where(...)`. Per-operator branches:
  - Equality / comparison ops → `BinaryExpression` (`Expression.Equal`, `Expression.LessThan`, …).
  - String ops → `MethodCallExpression` on `string.Contains` / `StartsWith` / `EndsWith` (EF Core translates to SQL `LIKE`).
  - Relative date ops → resolve `(startUtc, endUtc)` via `TzDateMath` using the request's `timezone` field, emit a `>=`/`<` predicate pair.
  - Sub-queries → `Expression.Call(typeof(Queryable), "Any", …)` over the related entity's `DbSet<>` with the recursively-walked predicate. Requires EF navigation properties.
  - Array ops on `Tags` (stored as JSON string column) → `EF.Functions.JsonContains` or manual deserialise + `Any`/`All` (SQLite-specific; abstracted behind a `JsonArrayColumn<T>` helper).
- **`apps/api/` validation layer** runs the Appendix D checklist before the walker. Throws `QueryBuilderException(string code, string? detail = null)`; an `IExceptionFilter` translates it to HTTP 400 `{ code, detail }`.
- **`apps/api/` seed**: idempotent. On first `DbContext.Database.EnsureCreated()`, populates ~200 customers (Faker-style: name, country ∈ {BE, NL, FR, DE, IT}, email), ~1000 orders (customerId, total, status ∈ {open, paid, shipped, cancelled}, orderDate spanning the last 365 days, tags as a JSON array column with 0–3 of {urgent, blocked, vip, low-priority}), ~5000 line items.
- **`apps/api/` Nx integration**: plain `nx:run-commands` executor. `inputs: ["{projectRoot}/**/*.cs", "{projectRoot}/**/*.csproj"]` keeps `nx affected` participation working. Decision rationale: Nx 21 doesn't have `@nx/dotnet` (Nx 22+ only); the community `@nx-dotnet/core` plugin is archived/deprecated. Plain `run-commands` is ~30 lines, zero new plugin maintenance.
- **`apps/api/` Docker**: multi-stage; `mcr.microsoft.com/dotnet/sdk:9.0-alpine` for build, `mcr.microsoft.com/dotnet/aspnet:9.0-alpine` for runtime (~85 MB final image). `VOLUME ["/data"]` for the SQLite file.
- **`docker-compose.yml`**: keep existing `ng-bootstrap` service untouched; append `api` service behind Traefik on subdomain `api.bootstrap.mintplayer.com` (new DNS A record + Let's Encrypt cert via Traefik resolver). New `api-data` volume for SQLite persistence. New `docker-compose.override.yml` (committed; dev-only) exposes `5000:8080` for local `ng serve` proxy.
- **Angular dev proxy**: `apps/ng-bootstrap-demo/proxy.conf.json` proxies `/api/*` → `http://localhost:5000`. Wired in `apps/ng-bootstrap-demo/project.json` under `serve.options.proxyConfig`.
- **CI**: `actions/setup-dotnet@v4` with `dotnet-version: 9.0.x` inserted in both `publish-master.yml` and `pull-request.yml`. Second `docker/build-push-action@v6` step in publish workflow pushes `ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master`. SSH deploy step unchanged.
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
6. Implemented as a `visitTree` consumer (eager) once M10 lands; before then, a direct recursive walker is fine.

### Phase 10: Visitor API (lazy `walkInner`)

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
5. Used in-tree by `renderExpression` (eager — calls `walkInner()` immediately). Refactor M9's direct walker to use `visitTree` here.
6. Exported for consumers who want to write their own JS-side transformations (debug printers, simplifiers, pre-validators).

### Phase 11: Saved queries — events-only API

1. WC inputs: `savedQueries: SavedQuery[]` (default `[]`), `showSavedQueries: boolean` (default `false`).
2. WC outputs: `save-query`, `load-query`, `delete-query` CustomEvents (non-bubbling; re-dispatched by root).
3. Picker dropdown renders at top of host: list of saved queries with per-row Load + Delete buttons; "💾 Save current as..." action opens an inline name input.
4. WC does not persist; consumer wires `[savedQueries]` and the three event handlers to their own store (localStorage / IndexedDB / REST).

### Phase 12: Angular wrapper

1. Implement `bs-query-builder` mirroring `bs-datetime-picker`'s pattern.
2. Inputs: `[schema]`, `[rootEntity]`, `[messages]`, `[showPreview]`, `[showSavedQueries]`, `[maxDepth]`, `[timezone]`, `[savedQueries]`, `[operatorOverrides]`, `[disabled]`.
   - **`[timezone]`** defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser-local IANA zone). Consumers post this same string alongside the tree to the backend so the backend resolves relative-date operators identically. Override e.g. for an admin tool that wants UTC pinning.
   - **No `[data]` input.**
3. Models: `[(query)]`.
4. Outputs: `(queryChange)`, `(saveQuery)`, `(loadQuery)`, `(deleteQuery)`. **No `(filteredResult)`.**
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
8. Re-export public types: `Expression`, `Group`, `Condition`, `SubQueryCondition`, `FieldDef`, `EntitySchema`, `Operator`, `FieldType`, `OperatorCatalog`, `QueryBuilderMessages`, `EditorContext`, `EditorHandle`, `EditorRegistry`, `SavedQuery`, `TreeVisitor`, `VisitorContext`, `VisitTreeOptions`, `MaxDepthExceededError`, `validateOperatorOverrides`.

### Phase 13: ASP.NET Core 9 API (`apps/api/`)

1. **Scaffold** `apps/api/` with `dotnet new web -o apps/api -n Api -f net9.0`. Add NuGet refs: `Microsoft.EntityFrameworkCore.Sqlite` 9.x, `Microsoft.EntityFrameworkCore.Design` 9.x.
2. **`project.json`** with Nx targets:
   - `build` → `dotnet build apps/api/Api.csproj -c Release` (inputs: `**/*.cs`, `**/*.csproj`).
   - `serve` → `dotnet watch --project apps/api/Api.csproj run --urls http://localhost:5000`.
   - `publish` → `dotnet publish apps/api/Api.csproj -c Release -o dist/apps/api`.
   - `test` → `dotnet test apps/api/Tests/Api.Tests.csproj`.
3. **Model classes** (`Models/`): `Order { Id, CustomerId (FK), Total, Status, OrderDate, Tags (string JSON column) }`, `Customer { Id, Name, Country, Email, CreatedAt }`, `LineItem { Id, OrderId (FK), ProductName, UnitPrice, Quantity }`. EF Core navigation properties wired: `Customer.Orders`, `Order.Customer`, `Order.LineItems`, `LineItem.Order`.
4. **`DemoDbContext`** (`Data/DemoDbContext.cs`): three `DbSet<>`s, `OnModelCreating` wires FKs + indexes on `Order.OrderDate` and `Order.CustomerId`.
5. **`DemoSeed`** (`Data/DemoSeed.cs`): idempotent — `if (await db.Customers.AnyAsync()) return;`. Seeds:
   - 200 customers via deterministic LCG-style RNG (seeded with `42`) so tests can pin expected counts.
   - 1000 orders, each tied to a random customer; `OrderDate` distributed across the past 365 days; `Status` ∈ {open, paid, shipped, cancelled}; `Tags` JSON-encoded subset of {urgent, blocked, vip, low-priority}.
   - ~5000 line items distributed across orders.
6. **`QueryBuilderWalker<T>`** (`QueryBuilder/QueryBuilderWalker.cs`):
   - Public `IQueryable<T> Apply(IQueryable<T> source, Expression tree, VisitorContext ctx)`.
   - Internal `Expression<Func<T, bool>> Build(Expression node, VisitorContext ctx)`.
   - Per-`Group`: combine children's predicates with `Expression.AndAlso` / `Expression.OrElse`; empty AND = `true` / empty OR = `false`.
   - Per-`Condition`: switch on `Operator`, build the appropriate `BinaryExpression` / `MethodCallExpression`. String ops use `string.Contains`/`StartsWith`/`EndsWith` (EF translates to LIKE). `between` → `AndAlso(Ge(field, v1), Le(field, v2))`. Relative date ops → `TzDateMath` resolves UTC range tuple → `AndAlso(Ge(field, startUtc), Lt(field, endUtc))`.
   - Per-`SubQueryCondition`: `Expression.Call(typeof(Queryable), "Any", new[]{ typeof(TRelated) }, ...)` over the relation's `DbSet<>`, with the inner predicate built recursively against `TRelated`.
   - Array ops on `Tags` JSON: deserialise to `string[]` via `JsonSerializer`, apply `Any`/`All`/`Contains` / length checks. Hidden behind a `JsonArrayColumn<T>` extension helper (SQLite limitation; in PostgreSQL it'd map to `jsonb` operators).
7. **`Validator`** (`QueryBuilder/Validator.cs`): runs Appendix D checklist top-to-bottom; throws `QueryBuilderException(string code, string? detail = null)` on first failure. Implements: strict JSON parse, depth cap 32, node cap 1024, ID format (UUID v4), ID uniqueness, kind validity, group/condition/subquery shape, field exists, operator valid for type, value shape per Appendix C, value length caps (string ≤ 1024, array ≤ 256), numeric range, date format, sub-query relation check, timezone IANA parse.
8. **`EntitySchemaService`** (`QueryBuilder/EntitySchemaService.cs`): returns the hardcoded `EntitySchema[]` for the demo (Orders + Customers + LineItems with their fields), so `GET /api/{entity}/schema` is the single source of truth — Angular demo fetches schemas at startup rather than hardcoding them in the bundle.
9. **`TzDateMath`** (`QueryBuilder/TzDateMath.cs`): `DayBoundsInTz`, `WeekBoundsInTz` (ISO 8601 Monday), `MonthBoundsInTz`, `YearBoundsInTz` — all via `TimeZoneInfo.ConvertTime*`. Computes local-zone midnight boundaries then converts to UTC for the predicate.
10. **`Program.cs`**: `WebApplication.CreateBuilder`, `AddDbContext<DemoDbContext>` with SQLite connection string from config, `AddControllers().AddJsonOptions(...)`, `AddCors(...)` (origin `http://localhost:4200` in Development; production relies on Traefik subdomain split so no cross-origin needed), `await db.Database.EnsureCreatedAsync(); await DemoSeed.Run(db);`.
11. **Controllers**: `OrdersController.Search(QueryRequest req)` → resolve IANA timezone via `TimeZoneInfo.FindSystemTimeZoneById` (UTC fallback), validate, walk, `OrderBy(sort) ?? OrderBy(o => o.Id)`, `Skip/Take`, materialise, return `PagedResult<OrderDto>`. `CustomersController.Search` mirrors.
12. **`QueryBuilderExceptionFilter`** (added in `Program.cs`): catches `QueryBuilderException`, returns `BadRequest(new { code, detail })`.
13. **`appsettings.json`**: `"ConnectionStrings": { "Default": "Data Source=/data/demo.db" }`. `appsettings.Development.json` overrides to `"Data Source=demo.db"`.

### Phase 14: Docker + docker-compose + CI

1. **`apps/api/Dockerfile`**: multi-stage per the recommendation memo (sdk:9.0-alpine → aspnet:9.0-alpine; copy csproj first, `dotnet restore`, copy rest, `dotnet publish -p:UseAppHost=false`; runtime image exposes 8080 + `VOLUME ["/data"]`).
2. **`docker-compose.yml`** (root): keep existing `ng-bootstrap` service untouched; append `api` service with:
   - `image: ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master`
   - Traefik labels routing `api.bootstrap.mintplayer.com` → port 8080, with `letsencrypt` cert resolver.
   - `volumes: ["api-data:/data"]` for SQLite persistence.
   - `networks: [web]`, `restart: unless-stopped`.
   - Top-level `volumes: { api-data: {} }`.
3. **`docker-compose.override.yml`** (NEW, committed; header `# DEV-ONLY — do not deploy to prod`): exposes `5000:8080` on the `api` service so `ng serve`'s proxy can reach it locally without going through Traefik.
4. **`apps/ng-bootstrap-demo/proxy.conf.json`** (NEW): `{ "/api": { "target": "http://localhost:5000", "secure": false, "changeOrigin": true, "logLevel": "debug" } }`.
5. **`apps/ng-bootstrap-demo/project.json`**: under `serve.options`, add `"proxyConfig": "apps/ng-bootstrap-demo/proxy.conf.json"`.
6. **`.github/workflows/publish-master.yml`**:
   - Before the existing Docker build step, insert `- uses: actions/setup-dotnet@v4` with `dotnet-version: 9.0.x`.
   - Insert `- run: dotnet build apps/api/Api.csproj -c Release` after setup-dotnet (so build failures fail fast outside Docker layer caching).
   - Add a second `docker/build-push-action@v6` step with `context: .`, `file: apps/api/Dockerfile`, `push: true`, `tags: ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master`.
   - SSH deploy step unchanged — `docker compose pull && docker compose up -d --remove-orphans` already handles N services.
7. **`.github/workflows/pull-request.yml`**: insert `actions/setup-dotnet@v4` + `dotnet test apps/api/Tests/Api.Tests.csproj` after the existing Vitest run.
8. **DNS / Traefik prerequisite**: user creates A record `api.bootstrap.mintplayer.com → VPS IP` ahead of first deploy. Traefik's `letsencrypt` resolver provisions the cert automatically on first request.

### Phase 15: Demo page (server-side wiring)

1. New demo page at `apps/ng-bootstrap-demo/src/app/pages/advanced/query-builder/`.
2. On mount, the page fetches `GET /api/orders/schema` (and `/api/customers/schema`) to populate the `bs-query-builder`'s `[schema]` + `[rootEntity]` inputs dynamically.
3. Examples / sections:
   - **Single-entity basics** (Orders schema with `tags: 'array'` field for set-op demo).
   - **Pre-loaded tree** with nested AND/OR.
   - **Multi-entity sub-query** (Customers + Orders).
   - **Relative date ops** ("orders in the last 7 days").
   - **Array set-ops** ("tags any-of [urgent, blocked]").
   - **Server-side search**: a "Search" button fires `POST /api/orders/search` with the `QueryRequest` envelope; the `PagedResult<Order>.items` feed `<bs-datatable [data]="result().items">`.
   - **Pagination** on the `bs-datatable`: page change → re-POSTs with updated `page`/`pageSize` fields in `QueryRequest`.
   - **Custom editor** — `*bsQueryBuilderEditor="orderDate"` projecting `bs-datepicker`.
   - **Custom editor for an array field** — multi-select with custom rendering.
   - **Reactive forms** — same builder bound via `[formControl]`, showing lossless round-trip.
   - **Saved queries** — wired to `localStorage` in the demo.
   - **JSON tree view** — live JSON next to the builder, illustrating the exact wire format.
   - **Live POST inspector** — show the actual `QueryRequest` body that will be POSTed (good for "see, this is the JSON contract").
4. Document the keymap.
5. Document the architectural principle: "frontend posts JSON; backend translates" — with a link to `apps/api/QueryBuilder/QueryBuilderWalker.cs` as the reference implementation.

### Phase 16: Testing + a11y validation

1. **Unit tests** (Vitest):
   - Tree ops including `moveNode` with cross-tree field reset (descendant cycle blocking, schema-mismatch reset).
   - `renderExpression` snapshots (covers operator labels for every catalog entry).
   - `visitTree` eager vs lazy `walkInner` consumers; depth tracking + `MaxDepthExceededError`.
   - Operator catalog: every type has a non-empty operator list; value-shape rules per operator.
2. **WC unit tests**: field/op/value round-trips through `query-change`; cross-group + cross-tree DnD; Lit context propagation across sub-query WCs (changing outer `editorRegistry` reflects in inner conditions); event bubbling assertion (consumer sees exactly one `query-change` per edit regardless of depth).
3. **Angular wrapper unit tests**:
   - `[(query)]` two-way binding.
   - `[formControl]` round-trip + `setDisabledState` + re-entrancy: editing the tree fires `onChange` exactly once per user edit; `setValue → onChange` does NOT re-enter.
   - `*bsQueryBuilderEditor` projection; disposal: `ApplicationRef.viewCount` stable across add/remove cycles.
   - `(saveQuery)` payload correctness.
4. **`apps/api/` xUnit tests** (`apps/api/Tests/`):
   - `WalkerTests`: every operator from Appendix A × every applicable `FieldType`. Pin `now` via a `IClock` abstraction so relative-date tests are deterministic; pin `timezone = "Europe/Brussels"` to catch DST edge cases (spring-forward day, fall-back day).
   - `ValidatorTests`: every rule from Appendix D — one assertion per error code, asserting the correct `code` string is thrown.
   - `IntegrationTests` (uses `Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory`): a few end-to-end happy-path POSTs against an in-memory SQLite DB, asserting response shape + result row counts.
5. **Playwright e2e** (`apps/ng-bootstrap-demo-e2e/src/query-builder.spec.ts`):
   - Spin up the API alongside the demo via the Playwright `webServer` config — start `dotnet run --project apps/api` before tests, on `http://localhost:5000`. Tests hit the live API.
   - Build a flat AND query → click Search → assert rendered datatable rows.
   - Build a nested OR group → search → assert row count via the backend.
   - Sub-query across entities → search → assert matching count.
   - Cross-group DnD → search → assert search succeeds with the moved condition.
   - Cross-tree DnD with field reset → assert moved condition's field changed → search.
   - Relative date op ("orders in the last 7 days") → search → assert row count.
   - Array op (`any-of`) → search → assert row count.
   - Pagination: page through results, assert correct `page`/`pageSize` in the requests (Playwright network interceptor).
   - `[formControl]` round-trip.
   - Save / refresh / load via localStorage.
   - Drag ghost cleanup on `pointercancel` (synthesized cancel event leaves no orphan in `document.body`).
   - Use `await page.waitForLoadState('networkidle')` per [[project_e2e_destructive_bootstrap]].
6. **axe-core** — zero serious findings on the demo page.
7. **Firefox smoke test** — drag handles don't shrink in flex containers ([[feedback_firefox_flex_shrink]]); ghost not clipped during cross-group drags.
8. **Memory-leak test** — Angular `ApplicationRef.viewCount` stable across 100 add/remove condition cycles when custom editors are projected.

---

## Test Scenarios

### Scenario 1: Build a flat AND query
- **Given**: Empty tree, Orders schema fetched from `GET /api/orders/schema`, demo page.
- **When**: User clicks "Add condition" twice, picks `total > 100` and `status = "open"`. Clicks "Search".
- **Then**: Preview reads `Total > 100 AND Status = "open"`. The POST body to `/api/orders/search` matches `{ query: { kind: 'group', logic: 'and', children: [...] }, page: 1, pageSize: 20, timezone: '<browser TZ>' }`. The response's `items` populate `bs-datatable`.

### Scenario 2: Nested group with OR
- **Given**: Existing condition `total > 100`.
- **When**: User adds a nested group with two `status` conditions, toggles OR.
- **Then**: Preview reads `Total > 100 AND (Status = "open" OR Status = "pending")`. POST returns rows matching the backend's evaluation of the same tree.

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
- **When**: User adds a condition with operator `last-N-days`, sets N=7. Clicks Search.
- **Then**: Preview reads `Order date is in the last 7 days`. The C# walker (per pinned `IClock` in tests) translates this to `OrderDate >= startUtc && OrderDate <= now` where `startUtc` is the start-of-day 7 days ago in the user's IANA zone, converted to UTC.

### Scenario 6: Array operator
- **Given**: Orders schema with `tags: 'array'` of string.
- **When**: User adds `tags any-of ["urgent", "blocked"]`. Clicks Search.
- **Then**: Backend deserialises `Tags` JSON column to `string[]`, applies `Any` predicate. Result includes orders tagged "urgent" or "blocked"; excludes orders with disjoint tags.

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

### Scenario 12: Server-side `bs-datatable` wiring
- **Given**: Demo wires `<bs-datatable [data]="result().items" [totalCount]="result().totalCount">` where `result` is a signal fed by `http.post('/api/orders/search', ...)`.
- **When**: User builds a query and clicks "Search". Then changes the page.
- **Then**: Datatable reflects the server's paginated response. Pagination clicks fire fresh POSTs with updated `page`/`pageSize` in the `QueryRequest`. **No `bs-datatable` source modifications.**

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
- [ ] `renderExpression` exported.
- [ ] `visitTree<T>` exported with lazy `walkInner`; depth tracked; throws `MaxDepthExceededError` past the bound.
- [ ] `bs-query-builder` implements `ControlValueAccessor` with re-entrancy guard.
- [ ] **No client-side `evaluateQuery` shipped; no `[data]`/`(filteredResult)` on the wrapper.**
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
- [ ] Shadow-DOM hit-test algorithm spec'd and tested across Chromium / Firefox / WebKit.
- [ ] DnD cancellation on tree mutation: programmatic `[(query)]` reset mid-drag cleans up ghost and dispatches no `moveNode`.
- [ ] `document.body` access guarded by `typeof document !== 'undefined'` (per dock precedent).
- [ ] `[timezone]` input defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`. The C# walker honours the request's `timezone` envelope field; DST transitions covered by xUnit test (spring-forward + fall-back in `Europe/Brussels`).
- [ ] **`apps/api/` builds clean** via `nx build api` (wrapping `dotnet build`).
- [ ] **`apps/api/` xUnit tests pass** — every operator from Appendix A, every validation rule from Appendix D, integration happy-path POSTs.
- [ ] **`docker compose up` (locally) brings up both services**; the Angular dev proxy resolves `/api/*` against the running API container; e2e tests pass against the live API.
- [ ] **GH Actions builds and pushes both images** (`mintplayer-ng-bootstrap` and `mintplayer-ng-bootstrap-api`) on master.
- [ ] **VPS deploys both services** via the existing `appleboy/ssh-action` step; Traefik routes the new `api.bootstrap.mintplayer.com` subdomain to the API container; Let's Encrypt cert provisions automatically.

---

## Risks & Open Considerations

- **Scope is large.** 16 internal milestones (including a new ASP.NET Core backend, EF Core seed, walker, docker-compose + CI updates). Multi-month effort. Acknowledged.
- **Lit Context recursive provider/consumer requires explicit plumbing.** The default `@lit/context` behaviour is "the nearest provider wins, even if its value is undefined." Our spec requires "inner overrides outer; otherwise inherit". The fix is a per-token `ContextConsumer` + `ContextProvider` pair on every `mp-query-builder`, with the provider's value computed from `this.<prop> ?? consumer.value` (or merge / OR for `messages` / `disabled`). Spec'd in Phase 7.3; Phase 15.2 test asserts (a) inner inherits when its own prop is unset, (b) inner overrides when its own prop is set, (c) clearing the inner's prop reverts to inherited. **Status: VERIFIED by spike on 2026-05-15** — `libs/mintplayer-ng-bootstrap/_spike-lit-context/spike.spec.ts` covers 8 scenarios (single-level, two-level inheritance, override, reactive propagation, clear-reverts-to-inherited, OR semantics, merge semantics, 3-deep nesting) — all pass against `@lit/context@1.1.6` in jsdom. The spike file is the reference shape for M7 implementation.
- **Cross-browser `elementFromPoint` across shadow DOM**: modern Chromium/Firefox/WebKit support `document.elementsFromPoint()` (plural — returns composed path). Older WebKit (pre-2024) only returns the host. Fallback algorithm spec'd in Architecture §Drag-and-drop.
- **Cross-tree DnD with field reset silently destroys values**: moving a 10-condition group across schemas resets 10 field/value assignments with no consent UI. Acceptable as v1; if user feedback complains, add a `(moveRequiresFieldReset)` event consumers can intercept.
- **Custom-editor disposal is a NEW convention.** No precedent in this repo for disposing WC-mounted custom elements. Document the `EditorHandle` contract in the README + JSDoc so future contributors don't reinvent.
- **`apps/api/` is a new .NET stack in a JS-first workspace.** Maintenance burden ~1 day/year if we stay on LTS (.NET 10 LTS lands Nov 2025; .NET 9 is a current release with 18-month support window ending May 2026 — we'd need to upgrade to 10 before that). CI runner now installs the .NET SDK (`setup-dotnet@v4`); contributors need .NET 9 SDK locally or run via `docker compose`. Accepted because the demo backend proves the wire-format contract end-to-end and is the cleanest answer to "show me this works with a real backend".
- **Subdomain DNS + Let's Encrypt cert** for `api.bootstrap.mintplayer.com` is a manual prerequisite (one A record). Traefik provisions the cert automatically on first request once the record resolves.
- **SQLite + EF Core is a demo-grade store.** Single-writer concurrency, no replication, no full-text search beyond LIKE. Real RavenDB / Postgres consumers reuse the walker's architecture (validator + per-operator translator) but emit their own DB language. The walker file is documented as a reference, not a library.
- **`@lit/context` is NOT yet a workspace dep.** M1 must add it to `libs/mintplayer-ng-bootstrap/package.json` `peerDependencies` before any WC code references it. ✅ Done in M1 commit.
- **Saved-query name collision**: component does not dedupe. `(saveQuery)` fires regardless of whether the name exists; consumer's store decides overwrite / prompt / reject. Demo's localStorage example demonstrates overwrite-with-confirm as the reference pattern.

---

## Build & Test Commands

```bash
# Build the library subproject
npx nx build mintplayer-ng-bootstrap

# Unit tests for the query-builder entry
npx nx test mintplayer-ng-bootstrap --testPathPattern=query-builder

# Build the ASP.NET API
npx nx build api
# or directly:
dotnet build apps/api/Api.csproj -c Release

# Run the API (with hot reload)
npx nx serve api

# API xUnit tests
npx nx test api
# or directly:
dotnet test apps/api/Tests/Api.Tests.csproj

# Demo app (proxies /api/* to http://localhost:5000)
npm start

# Both services via docker-compose (uses the override file for port exposure)
docker compose up

# Playwright e2e (needs the API running)
npx nx e2e ng-bootstrap-demo-e2e --testPathPattern=query-builder
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/datetime-picker/` — primary precedent for WC + wrapper layout + CVA pattern. Study the `effect()`-driven WC-property push + `writeValue` interplay before designing the `[(query)]`/CVA re-entrancy guard.
- `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts` — second wrapper precedent.
- `Dockerfile` + `docker-compose.yml` at repo root — existing single-service shape extending to two services in M14.
- `.github/workflows/publish-master.yml` + `.github/workflows/pull-request.yml` — existing CI extending to include .NET in M14.
- [[feedback_json_wire_format_only]] — architectural principle: frontend ships JSON tree only, no backend serializers.
- [[feedback_pointer_over_html5_dnd]], [[feedback_pointerdown_preventdefault]], [[feedback_touch_action_immutable]] — DnD ground rules.
- [[project_wc_aria_decisions]] — ARIA pattern + demo keymap requirement.
- [[feedback_wc_plus_angular_wrapper]] — packaging rationale.
- [[feedback_prd_unified_scope]] — multi-part feature shipping policy.
- [[feedback_computed_signals_in_template]] — derive transformations in `computed()`, not inline.
- [[feedback_no_imperative_iteration]] — use map/filter/flatMap; no forEach + accumulator.

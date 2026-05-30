# Product Requirements Document: TreeSelect — unified hierarchical select component

**Issue**: #342
**Title**: TreeSelect
**Status**: Complete
**Created**: 2026-05-30
**Last Updated**: 2026-05-30

---

## Summary (as built)

Shipped a new framework-agnostic Lit web component **`mp-tree-select`** (`libs/mintplayer-web-components/tree-select`) that unifies and replaces the three legacy Angular-only controls — `select2`, `searchbox`, `multiselect` — all now **deleted** (source, demos, routes, nav, VS Code snippets), with no back-compat shims. The WC composes the existing `mp-treeview` + `OverlayController`; data is **async-only** via a typed `TreeSelectProvider` port (`loadRoots`/`search`/`loadChildren`, each abortable + paged via `NodePage{nodes,hasMore}`); selection is held as full `TreeNode` objects (scalar in `single`, array in `multiple`/`checkbox`); `cascadeSelect` is best-effort over *loaded* descendants with indeterminate roll-up and never fetches unloaded children. Two trigger variants (`textbox`/`button`), `showClear`, server-search with debounce, "load more" paging, and seven optional render-callbacks. Hand-written **Angular** (`bs-tree-select` — `ControlValueAccessor`, requires `<bs-form>`, 7 `ng-template` bridges), **React** (`@lit/react`), and **Vue** (`v-model` + scoped-slot bridges) wrappers. Backend: one new `GET /api/treeItems/search` action reusing the existing `TreeItem` entity/seed (no EF migration). Demos + Playwright e2e in all three apps; the `select2-drag-drop` sample was **reworked** (not dropped) into `tree-select-drag-drop`. A new repo `CLAUDE.md` documents the WC + wrapper architecture and the scss/codegen flow.

**Load-bearing decisions (chosen / rejected / why):** 3-method explicit provider over a single muxed callback (named ops, maps 1:1 onto `mp-treeview.loadChildren`); built-in selection modes + one `cascadeSelect` boolean over a pluggable strategy (closed problem, can't break invariants); one `DataProvider` port, no `Scheduler` clock port (over-porting — tests use `searchDebounceMs=0`); fixed render-callbacks over an open slot registry. **Traps a reviewer should keep in mind:** the index (`_byId`/`_parentById`) must track the *displayed* tree — search returns fresh shallow copies, so it re-indexes the active set and restores the browse index on clear (else cascade/lazy-expand break post-search); the Angular `EmbeddedViewRef` node cache is LRU-bounded (400) to avoid a leak on large server trees; `mp-treeview`'s chevron handler was extended to honor lazy nodes (mouse lazy-expand).

---

## Summary (planning, retained)

Issue #342 asked for a PrimeNG-style TreeSelect. Rather than add a fourth overlapping control, we **merge four into one**: the (not-yet-built) TreeSelect plus the three existing Angular-only controls — `BsSelect2` (chips), `BsSearchbox` (single-select typeahead), and `BsMultiselect` (checkbox dropdown) — into a single framework-agnostic Lit web component **`mp-tree-select`**, shipped with hand-written Angular / React / Vue wrappers like every other WC (dock, scheduler, timeline, treeview). The three legacy components are **deleted permanently** — source, demos, tests, and public-API exports — with **no back-compat shims** (BC is not a constraint in this repo). The native flat `mp-select` / `BsSelect` is unrelated and stays.

The load-bearing decisions: **async-only data sourcing** through a single typed **DataProvider port** (`loadRoots` / `search` / `loadChildren`, each abortable, each paged); **selected items retained as full node objects** (an id can't be resolved back to a label when data is remote); three **selection modes** (`single` / `multiple` / `checkbox`) plus a **`cascadeSelect`** input whose propagation is best-effort over *available* (loaded) nodes — it never fetches unloaded children; and a fixed set of **optional render-callbacks** bridged to each framework's native templating. The chosen interface is a hybrid of the "common-case" and "ports-&-adapters" design explorations (see Chosen Design).

---

## Overview

`mp-tree-select` is a dropdown/overlay control whose panel hosts a hierarchical tree of selectable nodes, with a search box and optional header/footer. It composes existing primitives — `mp-treeview` for the tree body, `OverlayController` for the panel — so it is mostly *assembly + selection/search plumbing*, not new low-level UI.

It subsumes the four use cases:
- **TreeSelect** (new): hierarchical single/multi/checkbox selection.
- **Select2 / chips**: `multiple` mode, `textbox` trigger variant, removable chips in the trigger.
- **Searchbox**: `single` mode, server-side typeahead with debounce.
- **Multiselect**: `checkbox` mode with header/footer templates (now hierarchical, where the old one was flat).

---

## Goals & Objectives

### Primary Goals
- One component, one mental model, replacing four overlapping controls.
- Full framework parity (Angular + React + Vue) via the established WC + wrapper architecture.
- Feature parity with the union of the four legacy controls **and** PrimeNG TreeSelect (modes, filtering, templating, chips, clear, paging).
- A clean, testable async contract (single DataProvider port + in-memory adapter).

### Success Metrics
- `BsSelect2`, `BsSearchbox`, `BsMultiselect` removed from the codebase with zero remaining references.
- `mp-tree-select` + 3 wrappers published; demo pages live in all three demo apps; Playwright e2e green.
- The common case (single-select, server-searched, in an Angular reactive form) is expressible in ~2 lines beyond the tag, with zero templates.

---

## Chosen Design

**Design fan-out ran** (4 agents: minimize / maximize-flexibility / optimize-common-case / ports-&-adapters). Chosen design is a **hybrid of C (common case) + D (ports & adapters)**.

### Web component public interface (`libs/mintplayer-web-components/tree-select/`)

```ts
import type { TreeNode } from '@mintplayer/web-components/treeview';

export type TreeSelectMode    = 'single' | 'multiple' | 'checkbox';
export type TreeSelectVariant = 'textbox' | 'button';

/** A page of nodes. hasMore drives the "load more" affordance. */
export interface NodePage { nodes: TreeNode[]; hasMore?: boolean; }

/** Per-call request metadata. offset = cursor for paging; signal aborts stale calls. */
export interface NodeRequest { offset?: number; signal: AbortSignal; }

/** THE single external port. Explicit, named operations — not a muxed callback. */
export interface TreeSelectProvider {
  loadRoots(req: NodeRequest): Promise<NodePage>;
  search(query: string, req: NodeRequest): Promise<NodePage>;
  loadChildren(parentId: string, req: NodeRequest): Promise<NodePage>;
}

export class MpTreeSelect extends LitElement {
  provider: TreeSelectProvider | undefined;        // the one required input
  value: TreeNode | TreeNode[] | null;             // scalar (single) | array (multiple/checkbox)

  mode: TreeSelectMode = 'single';                 // attribute 'mode'
  variant: TreeSelectVariant = 'textbox';          // attribute 'variant'
  cascadeSelect = false;                           // attribute 'cascade-select' (checkbox mode only)
  placeholder = '';
  showClear = false;
  searchDebounceMs = 200;                          // legacy parity; tests set 0
  scrollHeight = '400px';
  disabled = false;

  // Optional render-callbacks — defaults render label+icon, so common case needs none.
  itemTemplate?:           (n: TreeNode) => Node;                 // selected chip in trigger
  suggestionTemplate?:     (n: TreeNode, query: string) => Node;  // dropdown / tree row
  buttonTemplate?:         (value: TreeNode | TreeNode[] | null) => Node; // full trigger override
  headerTemplate?:         () => Node;
  footerTemplate?:         () => Node;
  noResultsTemplate?:      (query: string) => Node;
  enterSearchTermTemplate?: () => Node;

  // events (CustomEvent, composed): 'value-change' {value}, 'open', 'close',
  //   'clear', 'node-expand' {node}, 'search' {query}, 'load-error' {error}
}
```

### Usage (Angular happy path)

```html
<bs-form>
  <bs-tree-select formControlName="dept" [provider]="deptProvider"
                  placeholder="Pick a department" />
</bs-form>
```
```ts
deptProvider = this.api.deptTreeProvider; // implements TreeSelectProvider
```

Reaching an advanced case is one attribute: `mode="checkbox" [cascadeSelect]="true"`.

### What it hides internally
- Overlay open/position/scroll/Esc/outside-click/focus-return via `OverlayController` (`panelWidth:'anchor'`).
- Composing `<mp-treeview>` in the panel; wiring `treeview.loadChildren → provider.loadChildren`; mapping `mode → selectionMode`.
- Search debounce + `AbortSignal` cancellation of superseded requests; switching tree-view vs search-results view.
- Paging: appending `NodePage.nodes`, tracking `offset`, showing "load more" while `hasMore`.
- Selection retained as full node objects across re-fetches; scalar⇄array marshalling for `single`.
- `checkbox` cascade (down/up + indeterminate) **best-effort over available (loaded) nodes** — never fetches unloaded children (see Technical Notes).
- Loading / empty / "enter a search term" / "no results" state machine.

### Cross-framework bridging
- **Angular `bs-tree-select`**: `ControlValueAccessor`, requires `<bs-form>` ancestor (throws otherwise — searchbox parity). `[provider]` as `@Input`; render-callbacks bridged from `<ng-template>` structural directives via `EmbeddedViewRef` (same mechanism `mp-treeview.nodeRenderer` already uses). `writeValue`/`onChange` do the scalar⇄array bridge.
- **React `BsTreeSelect`**: `@lit/react` `createComponent`; controlled `value` + `onChange`; `provider` + render-props assigned to the element ref via `useEffect`.
- **Vue `BsTreeSelect`**: `v-model` over `value`; `provider` prop; named scoped slots (`#item`, `#suggestion`, `#header`, …) bridged to the render-callbacks.

### Designs considered (and rejected)
- **A — single muxed `provider(req)` callback.** Rejected: one overloaded request shape muxes root/search/children with no type guarantee; the 3-method interface is self-documenting and maps 1:1 onto `mp-treeview.loadChildren`.
- **B — pluggable `SelectionStrategy` + `registerSlot()` registry + `filterPredicate`.** Rejected: open-ended extensibility for a *closed* problem (3 modes, 7 slots); huge surface, and a third-party strategy could violate cascade/indeterminate invariants the component can no longer enforce. We adopt B's `cascadeSelect` idea but as a single boolean, not a strategy port.
- **D's `Scheduler` port.** Rejected via the Port Budget Heuristic — over-porting for a UI control. Tests set `searchDebounceMs = 0`; the one real port is the DataProvider. (D's `NodePage`/`hasMore` paging and `InMemoryTreeSelectProvider` helper *are* adopted.)

---

## Out of Scope

- **Back-compat shims / re-export aliases for the deleted components** — *Rationale: BC is not a default constraint here; deletion is permanent and clean. Breaking change is documented, not bridged.*
- **The native flat `mp-select` / `BsSelect`** — *Rationale: unrelated `<select>` wrapper; not part of the merge, left untouched.*
- **Virtual scrolling of the tree panel** — *Rationale: paging (`hasMore` + "load more") covers large sets for v1; virtualization is a later optimization and non-breaking to add.*
- **Static (non-async) `items` input** — *Rationale: data sourcing is async-only by decision; static data is served by `InMemoryTreeSelectProvider`.*
- **Drag-to-reorder / editing nodes inside the panel** — *Rationale: this is a selection control, not a tree editor.*
- **A `display: 'comma' | 'count'` enum** — *Rationale: superseded by the template model; comma/count rendering is achievable via `itemTemplate`/`buttonTemplate`.*

---

## Functional Requirements

### Must Have (P0)
- [x] **FR-1**: New WC `mp-tree-select` under `libs/mintplayer-web-components/tree-select/`, following the `.element.ts` / `.element.scss` / generated `.element.template.ts` convention; registered via `customElements.define`; `observedAttributes` as a static getter.
- [x] **FR-2**: Async data via `TreeSelectProvider` (`loadRoots`/`search`/`loadChildren`), each abortable (`AbortSignal`) and paged (`NodePage { nodes, hasMore }` + `offset`).
- [x] **FR-3**: Selection modes `single` | `multiple` | `checkbox`. `value` = full `TreeNode` object(s); scalar in `single`, array otherwise. Emits `value-change`.
- [x] **FR-4**: `cascadeSelect` boolean (checkbox mode, default `false`). When `true`, selecting a node selects it **plus all currently-available (loaded) descendants** — best-effort; it does **not** eagerly fetch unloaded lazy children, and never selects unseen nodes. A parent with only some loaded children selected renders **indeterminate**. When `false`, selecting a node selects only that node. Up-propagation/indeterminate reflect loaded nodes only.
- [x] **FR-5**: Two trigger variants — `textbox` (inline search opens panel) and `button` (button opens panel containing search). `showClear` clears selection and emits `clear`.
- [x] **FR-6**: Server-side search with `searchDebounceMs` debounce; stale-request cancellation; tree-view vs search-results view switching; loading / no-results / enter-search-term / empty states.
- [x] **FR-7**: Optional render-callbacks: `itemTemplate`, `suggestionTemplate`, `buttonTemplate`, `headerTemplate`, `footerTemplate`, `noResultsTemplate`, `enterSearchTermTemplate`; sensible label+icon defaults.
- [x] **FR-8**: Angular wrapper `bs-tree-select` — `ControlValueAccessor` (`ngModel`/`formControlName`), requires `<bs-form>` ancestor, two-way `[(value)]`, ng-template directives bridged to render-callbacks.
- [x] **FR-9**: React wrapper `BsTreeSelect` (`@lit/react`, controlled value + onChange, render-callback props) and Vue wrapper `BsTreeSelect` (`v-model`, scoped slots bridged to the render-callbacks via `render()`), under new `tree-select` secondary entries of `@mintplayer/react-bootstrap` and `@mintplayer/vue-bootstrap`.
- [x] **FR-10**: Ship `InMemoryTreeSelectProvider` as a public helper (test/demo/e2e backing, no network).
- [x] **FR-11**: **Delete** `libs/mintplayer-ng-bootstrap/select2`, `.../searchbox`, `.../multiselect` — source, directives, demos, tests, public-api/secondary-entry exports — with no remaining references anywhere (apps, docs, routes, READMEs).
- [x] **FR-12**: Demo pages in `ng-bootstrap-demo`, `react-bootstrap-demo`, `vue-bootstrap-demo`, each with live demo before the `<bs-code-snippet>`, covering single / multiple-chips / checkbox+cascade / server-search.
- [x] **FR-13**: Playwright e2e in all three demo apps (open panel, search, lazy-expand, select across modes, clear). Note WC SCSS edits require a `codegen-wc` re-run before reload.
- [x] **FR-17 (Backend)**: Add a **search endpoint** to the existing `TreeItemsController` — `GET /api/treeItems/search?q=&page=&perPage=` — returning paged flat `TreeItemDto` matches (case-insensitive `Name`/`Code` contains), in the same `PagedResult<TreeItemDto>` shape as roots/children. **Reuse** the existing `GET /api/treeItems` (roots) and `GET /api/treeItems/{parentId}/children` endpoints; the `TreeItem` entity and its seed already exist, so **no new entity and no EF migration are required**. The server-search demos consume the real API; unit tests + e2e determinism use `InMemoryTreeSelectProvider`.

### Should Have (P1)
- [ ] **FR-14** (partial): Accessibility — combobox+tree ARIA wiring (delegating tree roving-tabindex/keyboard to `mp-treeview`), keyboard open/close/select are in place. *Live-announcer for result counts (searchbox parity) is NOT yet implemented — deferred follow-up.*
- [x] **FR-15**: "Load more" affordance (or auto-load on scroll-to-end) driven by `NodePage.hasMore`.
- [x] **FR-16**: Unit tests for selection math (single/multiple/checkbox + cascade + indeterminate + lazy-suppression) driven by `InMemoryTreeSelectProvider` with `searchDebounceMs = 0`.

---

## Timeline & Milestones

### Milestone 1: WC core ✓
- [x] Scaffold `tree-select` WC lib + `codegen-wc` wiring.
- [x] DataProvider port + paging + abort; compose `OverlayController` + `mp-treeview`.
- [x] Selection modes, `cascadeSelect` (best-effort over loaded nodes), `value-change`.
- [x] Trigger variants, search/debounce, state machine, render-callback defaults.
- [x] `InMemoryTreeSelectProvider` + WC unit tests (7 specs, green).
- [x] Fix `mp-treeview` chevron-click to honor lazy nodes (mouse lazy-expand).

### Milestone 2: Framework wrappers ✓
- [x] Angular `bs-tree-select` (CVA + `<bs-form>` + 7 ng-template directive bridges via EmbeddedViewRef).
- [x] React `BsTreeSelect` (`@lit/react` createComponent).
- [x] Vue `BsTreeSelect` (`v-model` + property sync).
- [x] Secondary-entry exports + package wiring for all three (resolve via `@mintplayer/*-bootstrap/*` wildcards).

### Milestone 3: Backend + Demos + e2e ✓
- [x] `GET /api/treeItems/search?q=` endpoint (reuses TreeItem entity/seed; no migration).
- [x] Demo pages in all three apps (single+server-search / chips / checkbox+cascade / button+clear); build green.
- [x] Playwright e2e specs in all three apps (backend-independent assertions against the in-memory demos).

### Milestone 4: Deletion ✓
- [x] Removed `select2` / `searchbox` / `multiselect` libs + their demo pages + routes + nav + VS Code snippets.
- [x] Edited incidental consumers (`autofocus`, `modal` demos) to drop `bs-select2` for a plain input.
- [x] **Reworked** (not deleted) the `select2-drag-drop` sample → `tree-select-drag-drop`: `bs-tree-select` (multiple) for picking + a separate CDK `cdkDropList` to reorder the selection (order flows back via `[value]`).
- [x] Updated stale doc comments in dropdown/combobox libs that named the removed components.
- [x] Grep sweep clean (zero dangling references in app code); `ng-bootstrap-demo` builds green.

---

## Open Questions

- [ ] **Indeterminate roll-up across unloaded boundaries** — *Assumption: a parent's indeterminate state is computed from its loaded children only; an unexpanded lazy parent with unknown descendant selection shows unchecked (not indeterminate) until expanded. Resolved direction; confirm on review.*
- [ ] **Search-results shape** — *Assumption: `search()` may return a flat match list or a shallow subtree; the panel renders whatever nodes come back (lenient/strict filtering is the server's concern, since search is server-side).*

---

## Technical Notes (Issue-Specific)

- **Lazy + cascade rule (the crux).** Because data is async, a parent's descendants may not be loaded when it is toggled. Eagerly fetching the whole subtree on click would be a network surprise; pretending to select unseen nodes would be a lie. Rule: `cascadeSelect=true` is **best-effort over available (loaded) nodes** — selecting a parent selects it + all currently-loaded descendants, but never triggers a fetch of unloaded lazy children. Unloaded children are simply left unselected; the parent renders **indeterminate** when only some loaded children are selected. `cascadeSelect=false` selects only the clicked node. (A fully-materialized, non-lazy tree therefore gets full cascade as a natural consequence — all nodes are "available".)
- **Selected = objects, not ids.** With remote data there is no static set to resolve `id → label`; the component retains selected `TreeNode` objects so the trigger can always render them (this also removes the legacy select2 "suggestions writeback" dance).
- **Reuse, don't reinvent.** `mp-treeview` (tree body, keyboard nav, lazy `loadChildren`, `nodeRenderer`), `OverlayController` (panel), and the cascading/indeterminate logic from `mp-datatable` (`collectDescendantKeys`, `getIndeterminateKeys`) — extract the datatable logic into a shared helper if cleanly separable, else copy.
- **Backend already exists.** `apps/api` has a `TreeItem` entity + a seeded ~26k-row 4-level tree (`DemoSeed.SeedTreeItemsAsync`) and `TreeItemsController` with paged roots (`GET /api/treeItems`) and children (`GET /api/treeItems/{parentId}/children`). Only a **search** action is new. The demo `TreeSelectProvider` adapter maps `TreeItemDto → TreeNode` (`id`=`Id`, `label`=`Name`, `lazy`=`ChildCount > 0`, optional `meta`=`Code`/`Headcount`) and `PagedResult → NodePage` (`hasMore` = `Page*PageSize < TotalCount`, `offset` ⇄ `page`). No new entity, no EF migration.
- **Render-callbacks are not slots-per-node.** Per-node templating over a dynamic tree must be a callback (as `mp-treeview.nodeRenderer` already is); wrappers materialize their native template to DOM and manage that node's lifecycle.

---

## Related
- Issue #342
- Backend: `apps/api/Controllers/TreeItemsController.cs`, `apps/api/Models/TreeItem.cs`, `apps/api/Data/DemoSeed.cs` (existing — add search action only)
- See CLAUDE.md / memory for: WC + 3-wrapper architecture (dock/scheduler/timeline/treeview precedent), `codegen-wc` rerun on `.element.scss` edits, no Angular imports in WC code, hand-written wrappers (no CEM codegen), Bootstrap utilities don't cross the shadow boundary, demo-before-snippet ordering, BC-not-a-constraint, PRs squash-merge.

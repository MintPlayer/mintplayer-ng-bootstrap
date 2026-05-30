# Development Plan: Issue #342

**Issue**: #342
**Title**: TreeSelect
**Type**: Feature (new component) + Refactor (consolidation/deletion)
**Priority**: Medium

## Executive Summary

Build a single framework-agnostic Lit web component **`mp-tree-select`** (a hierarchical, async, searchable select with single/multiple/checkbox modes) plus hand-written Angular/React/Vue wrappers, and **permanently delete** the three overlapping Angular-only controls it replaces — `BsSelect2`, `BsSearchbox`, `BsMultiselect` — along with the standalone TreeSelect that #342 originally requested (this *is* the TreeSelect). No back-compat shims. The native flat `mp-select` is unrelated and stays.

---

## Problem Statement

### Current Behavior
Four overlapping select-style controls exist or are requested: `BsSelect2` (multi chips), `BsSearchbox` (single typeahead), `BsMultiselect` (checkbox dropdown) — all Angular-only, no WC, none hierarchical — plus a missing TreeSelect. Each duplicates trigger/dropdown/search/selection logic with slightly different APIs.

### Expected Behavior
One WC (`mp-tree-select`) covers all four via `mode` (`single`/`multiple`/`checkbox`), `variant` (`textbox`/`button`), `cascadeSelect`, async data, and a shared template surface — with Angular/React/Vue wrappers matching the dock/scheduler/timeline/treeview pattern.

### Impact
Removes ~3 components' worth of duplicated surface; gives all three frameworks a hierarchical select for the first time; single mental model for consumers.

---

## Technical Analysis

### Files to Create
- `libs/mintplayer-web-components/tree-select/` — WC (`mp-tree-select.element.ts/.scss/.html` + generated `.element.template.ts`, types, `InMemoryTreeSelectProvider`, specs).
- `libs/mintplayer-ng-bootstrap/tree-select/` — Angular wrapper (`bs-tree-select`, CVA, `<bs-form>`-required, ng-template directives).
- `libs/mintplayer-react-bootstrap/tree-select/` — React wrapper (`BsTreeSelect.tsx`, `@lit/react`).
- `libs/mintplayer-vue-bootstrap/tree-select/` — Vue wrapper (`BsTreeSelect.vue`, v-model + slots).
- Demo pages in `apps/ng-bootstrap-demo`, `apps/react-bootstrap-demo`, `apps/vue-bootstrap-demo` + their `-e2e` specs.

### Files to Modify
- Secondary-entry / package exports for all four libs; demo routes in each app.
- `apps/api/Controllers/TreeItemsController.cs` — add a `GET /api/treeItems/search?q=&page=&perPage=` action (case-insensitive `Name`/`Code` contains, paged `PagedResult<TreeItemDto>`). The roots (`GET /api/treeItems`) and children (`GET /api/treeItems/{parentId}/children`) endpoints already exist and are reused as-is. `TreeItem` + seed already exist → **no new entity, no EF migration**.

### Files to Delete
- `libs/mintplayer-ng-bootstrap/select2/` (component, `BsItemTemplateDirective`, `BsSuggestionTemplateDirective`, specs).
- `libs/mintplayer-ng-bootstrap/searchbox/` (component, suggestion/enter-search-term/no-results directives, specs).
- `libs/mintplayer-ng-bootstrap/multiselect/` (component, button/header/footer/item directives, specs).
- Their demo pages + routes: `advanced/select2`, `advanced/searchbox`, `overlay/multiselect-dropdown` (+ e2e/specs).
- Their public-api / secondary-entry exports.

### Dependencies
- Reuse: `mp-treeview` (`libs/mintplayer-web-components/treeview`), `OverlayController` (`libs/mintplayer-web-components/overlay`), cascading/indeterminate logic in `mp-datatable`.
- Reuse the existing `apps/api` `TreeItem` entity + seed (~26k-row 4-level tree) and the roots/children endpoints; only a search action is added.
- `@lit/react` for the React wrapper.
- `tools/scripts/build-web-components.mjs` (`codegen-wc`) — rerun on `.element.scss`/`.element.html` edits.

### Architecture Considerations
See PRD **Chosen Design** (hybrid C+D): one `TreeSelectProvider` port (`loadRoots`/`search`/`loadChildren`, abortable + paged), value as full node objects, built-in modes, `cascadeSelect` (best-effort over loaded nodes, no eager fetch), fixed optional render-callbacks bridged per framework. WC stays framework-agnostic (no Angular imports). Wrappers hand-written (no CEM codegen). Bootstrap utility classes don't cross the shadow boundary — inline needed rules into the WC SCSS.

---

## Implementation Plan

### Phase 1: WC core (`mp-tree-select`)
1. Scaffold the lib + `codegen-wc` wiring; `customElements.define`; `observedAttributes` static getter.
2. DataProvider port + paging (`NodePage`/`offset`) + `AbortSignal` cancellation.
3. Compose `OverlayController` + embedded `mp-treeview`; wire `loadChildren`; map `mode → selectionMode`.
4. Selection (`value` scalar/array as objects), `cascadeSelect` (best-effort over loaded descendants, no eager fetch) + indeterminate, `value-change`.
5. Trigger variants (`textbox`/`button`), `showClear`, search + debounce, state machine (loading/no-results/enter-term/empty).
6. Render-callback surface + label+icon defaults.
7. `InMemoryTreeSelectProvider` + WC unit tests (`searchDebounceMs = 0`).

### Phase 2: Framework wrappers
8. Angular `bs-tree-select` (CVA, `<bs-form>`-required, two-way `[(value)]`, ng-template→callback bridging).
9. React `BsTreeSelect` (`@lit/react`, controlled, render-props).
10. Vue `BsTreeSelect` (`v-model`, scoped slots).
11. Secondary-entry exports + package wiring for all three.

### Phase 3: Backend + Demos + e2e
12. Add the `GET /api/treeItems/search?q=` action to `TreeItemsController` (paged `Name`/`Code` contains); roots/children endpoints reused as-is. No migration.
13. A `TreeSelectProvider` HTTP adapter in each demo app mapping `TreeItemDto`→`TreeNode` (`id`=Id, `label`=Name, `lazy`=ChildCount>0) and `PagedResult`→`NodePage` (`hasMore`=Page*PageSize<TotalCount), wired to the three endpoints.
14. Demo pages (single / chips / checkbox+cascade / server-search against the real API) in all three apps; live demo before `<bs-code-snippet>`.
15. Playwright e2e in all three apps (API running per the dcg:playwright backend helper).

### Phase 4: Deletion + sweep
16. Delete select2/searchbox/multiselect libs, demos, routes, exports.
17. Grep sweep for dangling references; build all libs + all demos; e2e green.

---

## Test Scenarios

### Scenario 1: Single-select server search (Angular reactive form)
- **Given**: `bs-tree-select` with a provider, in a `<bs-form>`, bound via `formControlName`.
- **When**: user types, picks a node.
- **Then**: control value = the selected `TreeNode`; `value-change` fired; form control updated.

### Scenario 2: Checkbox + cascade over a fully-loaded subtree
- **Given**: `mode="checkbox"`, `cascadeSelect`, a non-lazy subtree.
- **When**: a parent checkbox is toggled.
- **Then**: all loaded descendants toggle; ancestor shows indeterminate when partially selected.

### Scenario 3: Cascade is best-effort across a lazy boundary
- **Given**: `mode="checkbox"`, `cascadeSelect=true`, a parent with some loaded and some unloaded (`lazy`) children.
- **When**: that parent is toggled on.
- **Then**: the parent + all currently-loaded descendants are selected; no network fetch is triggered for unloaded children; the parent renders indeterminate while only some loaded children are selected.

### Scenario 4: Multiple-chips (select2 parity)
- **Given**: `mode="multiple"`, `variant="textbox"`.
- **When**: several nodes selected, then a chip's remove is clicked.
- **Then**: chips render selected objects; remove deselects just that node.

### Scenario 5: Paging
- **Given**: a provider returning `hasMore: true`.
- **When**: the user reaches the end / clicks "load more".
- **Then**: next page appended via `offset`; affordance hides when `hasMore` is false.

---

## Acceptance Criteria

- [ ] `mp-tree-select` + Angular/React/Vue wrappers built and exported.
- [ ] All PRD P0 FRs (FR-1…FR-13, FR-17) satisfied.
- [ ] select2/searchbox/multiselect fully removed; zero remaining references; all builds + e2e green.
- [ ] `GET /api/treeItems/search?q=` added and returning paged matches; roots/children reused.
- [ ] Demo pages + Playwright e2e in all three apps.

---

## Build & Test Commands

```bash
# Regenerate WC templates after .element.scss/.element.html edits
nx run mintplayer-web-components:codegen-wc

# Build the libs
nx build mintplayer-web-components
nx build mintplayer-ng-bootstrap
nx build mintplayer-react-bootstrap
nx build mintplayer-vue-bootstrap

# Unit tests
nx test mintplayer-web-components

# API (search endpoint) — no migration needed
dotnet build apps/api/Api.csproj -c Debug
dotnet test apps/api/Tests/Api.Tests.csproj -c Debug

# Demos / e2e (per app)
nx e2e ng-bootstrap-demo-e2e
nx e2e react-bootstrap-demo-e2e
nx e2e vue-bootstrap-demo-e2e
```

---

## Related Files
- `libs/mintplayer-web-components/treeview/src/components/mp-treeview.ts` + `src/types/tree-node.ts`
- `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`
- `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts` (cascade/indeterminate)
- `libs/mintplayer-ng-bootstrap/dock/` , `libs/mintplayer-react-bootstrap/dock/` , `libs/mintplayer-vue-bootstrap/dock/` (wrapper precedents)
- `tools/scripts/build-web-components.mjs`
- `apps/api/Controllers/TreeItemsController.cs` + `apps/api/Models/TreeItem.cs` + `apps/api/Data/DemoSeed.cs` (existing tree backend — add search action)
- To delete: `libs/mintplayer-ng-bootstrap/{select2,searchbox,multiselect}/`

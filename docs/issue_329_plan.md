# Development Plan: Issue #329

**Issue**: #329
**Title**: File Manager (bs-file-manager + Lit WC stack)
**Type**: Feature (new component) + refactor (port two existing components to Lit)
**Priority**: Medium
**PRD**: [`docs/issue_329_PRD.md`](./issue_329_PRD.md)

## Executive Summary

Add `bs-file-manager` to `libs/mintplayer-ng-bootstrap` — a Syncfusion-style file browser composing a tree (left pane) + a tabular file list (right pane) inside a splitter, plus breadcrumb / toolbar / context-menu / drag-drop upload overlay. Ship as a Lit web component (`mp-file-manager`) with a thin Angular wrapper, matching the precedent set by `dock`, `mp-scheduler`, and `mp-datetime-picker`.

**Same release also ports `bs-treeview` and `bs-datatable` to Lit** (data-driven `mp-treeview` and property-driven `mp-datatable`). The Angular components are refactored into thin wrappers around the new WCs. Both ports are breaking changes — no compatibility shims.

The two foundation ports (Phase 1, Phase 2) must land before the file-manager component (Phase 3), which composes them directly. Each phase is committed and pushed independently inside one shared feature branch and one shared pull request.

---

## Branch & PR strategy

- **Branch**: `feat/329-file-manager`
- **Single PR** against `master` opened at the end of Phase 0 with the PRD + plan as the first commit.
- **Each phase is one commit** on the branch. The PR description is updated after each phase so reviewers can follow progress.
- Commit messages follow conventional-commits with the issue number:
  - `feat(#329): PRD + development plan`
  - `feat(#329): Phase 1 — mp-treeview Lit WC + bs-treeview refactor`
  - `feat(#329): Phase 2 — mp-datatable Lit WC + bs-datatable refactor`
  - `feat(#329): Phase 3 — mp-file-manager + bs-file-manager`
  - `feat(#329): Phase 4 — demo page + Playwright + polish`

---

## Phase 0 — Branch + PRD/plan + initial PR

**Deliverable**: This file and `docs/issue_329_PRD.md`, plus the initial PR against `master`.

1. Create branch `feat/329-file-manager` from `master`.
2. Author `docs/issue_329_PRD.md` and `docs/issue_329_plan.md`.
3. Commit `feat(#329): PRD + development plan`.
4. Push the branch.
5. Open PR against `master` titled `feat(#329): file manager + Lit WC ports of treeview & datatable`.

---

## Phase 1 — `mp-treeview` Lit WC + `bs-treeview` refactor

### New files

```
libs/mintplayer-ng-bootstrap/web-components/treeview/
├── index.ts
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── mp-treeview.ts                       NEW
│   │   └── mp-treeview.element.spec.ts          NEW
│   ├── state/
│   │   └── treeview-state.ts                    NEW (selection + expansion + roving-focus)
│   ├── styles/
│   │   └── treeview.styles.ts                   NEW (codegen-wc output from .scss)
│   └── types/
│       └── tree-node.ts                         NEW (TreeNode interface)
└── ng-package.js
```

### Modified files

```
libs/mintplayer-ng-bootstrap/treeview/src/
├── treeview/
│   ├── treeview.component.ts                    REWRITTEN (thin wrapper)
│   ├── treeview.component.html                  REWRITTEN
│   └── treeview.component.scss                  TRIMMED
├── treeview-item/
│   ├── treeview-item.component.ts               REMOVED (subsumed by WC)
│   └── treeview-item.component.html             REMOVED
└── index.ts                                     UPDATED (re-exports)
```

### Implementation steps

1. **Define `TreeNode` interface** (`web-components/treeview/src/types/tree-node.ts`).
2. **Build `mp-treeview` Lit WC** (`web-components/treeview/src/components/mp-treeview.ts`):
   - Reactive properties: `items`, `expandedIds`, `selectedIds`, `selectionMode`, `hideBorders`.
   - Recursive render: `renderNode(node, level)` returns a `<li role="treeitem">` with children rendered into a nested `<ul role="group">` when expanded.
   - Roving tabindex: focus state in `treeview-state.ts`; arrow keys move focus, do not change selection.
   - Selection: Space toggles, Enter activates, Shift+arrow range-select when `selectionMode === 'multiple'`.
   - ARIA: `tree` / `treeitem` / `group`; `aria-expanded` on items with children; `aria-level` / `aria-setsize` / `aria-posinset`.
   - `hide-borders` attribute toggles a CSS class that suppresses `border-top` / `border-bottom` on `list-group-item` children.
   - Events: `tree-node-select`, `tree-node-expand`, `tree-node-collapse` — each carries `{ node, expandedIds, selectedIds }`.
3. **Codegen the styles**: write `mp-treeview.element.scss` (Bootstrap `list-group` overrides + `:host([hide-borders])` rules); run the `codegen-wc` Nx target to produce `treeview.styles.ts`.
4. **Refactor `bs-treeview`** to a thin Angular standalone component:
   - `@Component({ schemas: [CUSTOM_ELEMENTS_SCHEMA] })`.
   - Template is `<mp-treeview ... (tree-node-select)="…"></mp-treeview>`.
   - Inputs forwarded as signals to the element via `effect()`.
   - `@Output()`s re-emit from the Lit CustomEvents.
   - Side-effect import: `import '@mintplayer/ng-bootstrap/web-components/treeview'`.
   - Remove `BsTreeviewItemComponent` entirely (subsumed by WC's recursive render).
5. **Migrate the treeview demo page** to data-driven `[items]` input; document the breaking change in the demo's intro paragraph and in `CHANGELOG.md`.
6. **Tests**:
   - Unit (`mp-treeview.element.spec.ts`): rendering, expand/collapse, selection, roving tabindex, `hide-borders` CSS effect.
   - ARIA spec (`mp-treeview.aria.spec.ts`): roles, `aria-expanded`, `aria-level`, keyboard nav.
   - Existing Playwright smoke for the demo page (extended to assert data-driven rendering).
7. **Verify build**: `nx build mintplayer-ng-bootstrap`; library passes; demo serves; treeview page renders.
8. **Commit**: `feat(#329): Phase 1 — mp-treeview Lit WC + bs-treeview refactor`.

---

## Phase 2 — `mp-datatable` Lit WC + `bs-datatable` refactor

### New files

```
libs/mintplayer-ng-bootstrap/web-components/datatable/
├── index.ts
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── mp-datatable.ts                      NEW
│   │   └── mp-datatable.element.spec.ts         NEW
│   ├── sort/
│   │   ├── compute-next-sort.ts                 NEW (pure helper, extracted)
│   │   └── compute-next-sort.spec.ts            NEW
│   ├── virtual/
│   │   └── viewport-controller.ts               NEW (CDK-free virtual scroll)
│   ├── selection/
│   │   └── selection-state.ts                   NEW
│   ├── styles/
│   │   └── datatable.styles.ts                  NEW (codegen-wc output)
│   └── types/
│       ├── column-def.ts                        NEW (DatatableColumnDef)
│       └── pagination.ts                        NEW (re-exported PaginationRequest/Response)
└── ng-package.js
```

### Modified files

```
libs/mintplayer-ng-bootstrap/datatable/src/
├── datatable/
│   ├── datatable.component.ts                   REWRITTEN (wrapper)
│   ├── datatable.component.html                 REWRITTEN
│   └── datatable.component.scss                 TRIMMED
├── datatable-sort-base.ts                       SLIMMED (delegates to compute-next-sort)
├── datatable-column/
│   └── datatable-column.directive.ts            KEPT for now (consumer's content directive; reads into column-def array via `@ContentChildren` in the wrapper)
├── row-template/
│   └── row-template.directive.ts                KEPT for now (same)
└── index.ts                                     UPDATED
```

> Phase 2 keeps the `*bsDatatableColumn` and `*bsRowTemplate` directives at the **wrapper layer** because we can map them into the WC's property-driven column definitions inside `bs-datatable`'s template. This keeps the existing demo page working with minor adjustments rather than rewriting every column declaration. The underlying WC, however, exposes only the property API.

### Implementation steps

1. **Extract `computeNextSort`** from `datatable-sort-base.ts` into `web-components/datatable/src/sort/compute-next-sort.ts` — pure function `(current: SortColumn[], columnName: string, shiftKey: boolean) => SortColumn[]`. Cover with unit tests.
2. **Define `DatatableColumnDef`**:
   ```ts
   export interface DatatableColumnDef<TRow = unknown> {
     name: string;
     label?: string;
     sortable?: boolean;
     width?: number;
     cellRenderer?: (row: TRow | undefined, column: DatatableColumnDef<TRow>) => unknown;
     headerRenderer?: (column: DatatableColumnDef<TRow>) => unknown;
   }
   ```
3. **Build `mp-datatable` Lit WC**:
   - Properties: `columns`, `fetch` (callback returning `Promise<PaginationResponse>`), `settings`, `selection`, `selectionMode`, `virtualScroll`, `itemSize`, `resizableColumns`, `minColumnWidth`, `isResponsive`, `compareWith`.
   - Internal state: page, perPage, sort columns, virtual viewport range, drag-resize handle.
   - Render: a `<table>` with header (sortable on click; shift-click multi-sort via `computeNextSort`), `<tbody>` rendered via `repeat()` from the current page.
   - Virtual scroll: bare-bones implementation using `ResizeObserver` + scroll position; no CDK dep.
   - Resizable columns: pointer-event drag on a 6px handle at column right edge.
   - Selection: `selectionMode` `'single' | 'multiple' | 'none'`; checkboxes when multi; emits `mp-datatable-selection-change`.
   - Row events: `mp-datatable-row-click`, `mp-datatable-row-dblclick`, `mp-datatable-row-contextmenu` (passes `MouseEvent` so consumer can call `preventDefault`).
   - ARIA: `role="grid"` + `row` + `gridcell` + `aria-rowindex` / `aria-colindex` + roving tabindex.
4. **Codegen the styles**: `mp-datatable.element.scss` extends Bootstrap `table` / `table-hover` and adds resize-handle / sort-indicator pseudo-elements.
5. **Refactor `bs-datatable`**:
   - Standalone component, `CUSTOM_ELEMENTS_SCHEMA`.
   - Reads `@ContentChildren(BsDatatableColumnDirective)` and maps each directive instance to a `DatatableColumnDef` whose `cellRenderer` resolves the `*bsRowTemplate` via `createEmbeddedView`. (One `EmbeddedView` per row, like the current implementation.)
   - Two-way `settings` and `selection` models forward to the WC.
   - Re-emits row events as Angular `@Output`s.
6. **Migrate the datatable demo page**: minimal changes — the directives still work; only the *internal* column-def shape changes.
7. **Tests**:
   - Unit on `computeNextSort` (single-click, shift-click multi, toggle, remove).
   - Unit on `mp-datatable`: column rendering, sort, selection, virtual scroll viewport math.
   - ARIA spec: roles, `aria-rowindex`, keyboard nav.
   - Smoke for `bs-datatable` wrapper against existing artist demo data.
8. **Verify build**: `nx build mintplayer-ng-bootstrap`; demo's datatables page renders identically; sort still works; selection survives pagination; resize handle drags.
9. **Commit**: `feat(#329): Phase 2 — mp-datatable Lit WC + bs-datatable refactor`.

---

## Phase 3 — `mp-file-manager` + `bs-file-manager`

### New files

```
libs/mintplayer-ng-bootstrap/web-components/file-manager/
├── index.ts
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── mp-file-manager.ts                   NEW
│   │   ├── mp-breadcrumb-bar.ts                 NEW (internal, registered as <mp-fm-breadcrumb>)
│   │   ├── mp-toolbar.ts                        NEW (internal, registered as <mp-fm-toolbar>)
│   │   └── mp-file-manager.element.spec.ts      NEW
│   ├── state/
│   │   ├── file-manager-state.ts                NEW (selection, clipboard, current folder)
│   │   └── operations.ts                        NEW (rename/delete/new-folder/cut/copy/paste handlers)
│   ├── context/
│   │   └── file-manager-context.ts              NEW (@lit/context tokens)
│   ├── selection/
│   │   └── range-select.ts                      NEW (Shift+click range computation)
│   ├── icons/
│   │   └── resolve-icon.ts                      NEW (mime → bootstrap-icons key)
│   ├── styles/
│   │   └── file-manager.styles.ts               NEW (codegen-wc output)
│   └── types/
│       ├── file-system-node.ts                  NEW
│       └── operation.ts                         NEW (kind + payload)
└── ng-package.js

libs/mintplayer-ng-bootstrap/file-manager/
├── index.ts                                     NEW (re-exports)
├── ng-package.js                                NEW
└── src/
    ├── index.ts                                 NEW
    └── file-manager/
        ├── file-manager.component.ts            NEW (Angular wrapper)
        ├── file-manager.component.html          NEW
        └── file-manager.component.scss          NEW
```

### Implementation steps

1. **Define types**: `FileSystemNode`, `OperationKind`, `OperationFlags`.
2. **State + context**: `file-manager-state.ts` exposes a `Store` with signals (`currentFolderId`, `selection`, `clipboard`, `searchQuery`, `viewMode`, `sort`); `file-manager-context.ts` defines the `@lit/context` token.
3. **Build `mp-file-manager` Lit WC**:
   - Slot layout: `<mp-splitter orientation="horizontal">` → `<mp-treeview slot="panel-0" hide-borders>` + a `<div slot="panel-1">` containing the breadcrumb + toolbar + datatable / icon-grid + drop-zone overlay.
   - Provide the state via `@lit/context` so descendants read from it.
   - Wire DOM listeners to map tree/datatable events into state mutations + emit external events.
   - Selection state machine with Shift / Ctrl handling; range-select helper.
   - Clipboard: cut applies `opacity: 0.6` via CSS class; copy doesn't.
   - Inline rename: replaces row's name cell with an `<input>` on F2 / context-menu; Enter commits → emits `mp-operation` `'rename'`; Esc cancels.
   - Drop overlay: a sibling absolute-positioned `<div>` revealed on `dragenter` of files; on `drop` emits `mp-upload-request`.
4. **Build internal `mp-fm-breadcrumb`**: derives the path from `currentFolderId` + `nodes`; renders an ordered list of links; clicking emits `mp-navigate`.
5. **Build internal `mp-fm-toolbar`**: search input (debounced 200ms), view-mode toggle, new-folder button, action buttons (disabled when selection empty or when corresponding flag in `allowOperations` is false), slot for extra buttons.
6. **Context menu**: Phase 3 Step 6 resolves Q1. First check whether `bs-dropdown` exposes enough to mount as a portal; if yes, render it via slot; if not, build a minimal `mp-context-menu` (positioned-portal, arrow-key nav, escape, focus-restore).
7. **Icon-grid view**: when `view-mode === 'icons'`, swap the datatable for a CSS-grid view that uses the same selection / context-menu / dbl-click handlers but renders large icons + filename.
8. **Build `bs-file-manager` Angular wrapper**:
   - Side-effect import the WC.
   - Forward all inputs to attributes/properties via `effect()`.
   - Two-way models for `currentFolderId` and `viewMode`.
   - Re-emit all CustomEvents as `@Output()`.
   - Expose `@ContentChild` template inputs for `node-icon`, `empty-state`, `toolbar-extra` slots.
9. **Tests**:
   - Unit on `range-select`, `operations` (state-machine transitions), `resolve-icon`.
   - Unit on `mp-file-manager`: navigation, selection, search filter, clipboard, view-mode toggle.
   - ARIA spec: tree + grid + toolbar + menu + region roles.
10. **Verify build**: `nx build mintplayer-ng-bootstrap`; library compiles; new entry points reachable.
11. **Commit**: `feat(#329): Phase 3 — mp-file-manager + bs-file-manager`.

---

## Phase 4 — Demo page + Playwright + polish

### New files

```
apps/ng-bootstrap-demo/src/app/pages/enterprise/file-manager/
├── file-manager.component.ts                    NEW
├── file-manager.component.html                  NEW
├── file-manager.component.scss                  NEW
└── mock-data.ts                                 NEW (10–20 folders, 30–50 files, varied mime types)

apps/ng-bootstrap-demo-e2e/e2e/
└── file-manager.spec.ts                         NEW
```

### Modified files

```
apps/ng-bootstrap-demo/src/app/pages/enterprise/enterprise.routes.ts   UPDATED
apps/ng-bootstrap-demo/src/app/app.component.html                       UPDATED (nav item)
CHANGELOG.md                                                            UPDATED
```

### Implementation steps

1. **Add route**: `{ path: 'file-manager', loadComponent: () => import('./file-manager/file-manager.component').then(m => m.FileManagerComponent) }`.
2. **Add menu item** in `app.component.html` under Enterprise, between "Datatables" and "Query Builder".
3. **Build demo page**:
   - Header + intro paragraph.
   - Interactive controls (toggles for `allowUpload`, `selectionMode`, `viewMode`, `allowOperations`) rendered with `bs-grid` + `bsRow` + `[md]` / `[lg]` inputs ([[feedback_use_bs_grid_directives]]).
   - Live `<bs-file-manager>` instance bound to `mockData` signal.
   - Operations handler updates `mockData` in response to `mp-operation` events (rename / delete / new-folder / paste).
   - Drag-drop handler simulates upload: appends mock entries, animates `progress` from 0 to 100 over 2 s via `setInterval` (wrapped in `inject(NgZone).runOutsideAngular`).
   - `<details><summary>Keyboard shortcuts</summary>` with the table from the PRD.
   - Code snippet of usage in a `<pre>` block.
4. **Playwright e2e** (`file-manager.spec.ts`):
   - Use `waitForLoadState('networkidle')` after every `goto` ([[project_e2e_destructive_bootstrap]]).
   - Cover: navigate into folder, breadcrumb click, multi-select via Shift+click, rename via F2, delete via Del + confirm, paste via Ctrl+V, search filters rows, view-mode toggle, simulated drop event (`page.dispatchEvent('drop', ...)`).
5. **Firefox smoke**: open the demo in Firefox, drag the splitter, drag-drop a file, verify no flex-shrink collapse ([[feedback_firefox_flex_shrink]]).
6. **CHANGELOG**: three entries — BREAKING for treeview, BREAKING for datatable, new file-manager.
7. **Update PR description** with screenshots (left blank in the initial PR; backfilled here).
8. **Commit**: `feat(#329): Phase 4 — demo page + Playwright + polish`.

---

## Testing strategy

| Layer                | Coverage                                                                                       |
|----------------------|------------------------------------------------------------------------------------------------|
| Pure helpers         | `computeNextSort`, `range-select`, `resolve-icon`, `operations` reducer — exhaustive unit tests. |
| Lit WC unit          | Per-component spec files (e.g. `mp-treeview.element.spec.ts`) using `@open-wc/testing` or the existing Jest+JSDOM setup. |
| Lit WC ARIA          | Per-component `*.aria.spec.ts` mirroring the pattern in `mp-splitter.aria.spec.ts`.            |
| Angular wrapper unit | TestBed + `HarnessLoader` smoke; one spec per wrapper.                                         |
| Demo Playwright      | One spec per Lit WC's demo page + the file-manager spec. All specs use `waitForLoadState('networkidle')`. |

---

## Rollback plan

Each phase is one commit on the branch. If a phase regresses something we missed in unit tests, we can `git revert <sha>` the offending phase commit without touching earlier ones; subsequent phases that depended on the reverted one are reverted too. The PR is rebased / force-pushed only if a Phase 0 / Phase 1 PRD adjustment is needed.

---

## Definition of Done

- [ ] Branch `feat/329-file-manager` is pushed; PR is open against `master`.
- [ ] Each phase committed with the exact message from the Branch & PR strategy table.
- [ ] `nx build mintplayer-ng-bootstrap` is clean.
- [ ] `nx test mintplayer-ng-bootstrap` is clean (or the deltas are documented and accepted).
- [ ] `nx lint mintplayer-ng-bootstrap` is clean.
- [ ] Demo's file-manager page renders, drag-drop simulation works, all keyboard shortcuts behave as documented.
- [ ] Playwright e2e for the file-manager passes on Chromium + Firefox.
- [ ] CHANGELOG entries written for both breaking changes + the new component.
- [ ] PR description summarises the four phases and links to the PRD.

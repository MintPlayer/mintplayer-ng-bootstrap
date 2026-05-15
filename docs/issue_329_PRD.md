# Product Requirements Document: File Manager

**Issue**: #329
**Title**: File Manager (bs-file-manager + Lit WC stack)
**Status**: Planning — Phase 0
**Created**: 2026-05-15
**Last Updated**: 2026-05-15

Reference UI surface: https://www.syncfusion.com/angular-components/angular-file-manager — we mimic the feature menu, not the visual style. Visual style is pure Bootstrap 5 primitives.

---

## Overview

Add an enterprise file-manager component to `@mintplayer/ng-bootstrap`: tree on the left, file list on the right, breadcrumb above the list, toolbar with search and view-mode toggles, drag-drop upload overlay, and the usual file operations (rename / delete / new folder / cut / copy / paste).

Per the workspace standard for new components ([[feedback_wc_plus_angular_wrapper]]), the new file-manager ships as **Lit web component + Angular wrapper** (`mp-file-manager` + `bs-file-manager`). Because the file-manager composes a tree on the left and a tabular file list on the right, **both `bs-treeview` and `bs-datatable` are ported to Lit web components in the same release**, then refactored to thin Angular wrappers around the new WCs.

After this issue lands, the relevant component stack looks like:

| Lit element        | Angular wrapper   | Purpose                                                 |
|--------------------|-------------------|---------------------------------------------------------|
| `mp-splitter`      | *(internal use)*  | Existing — hosts tree + file list panes                 |
| `mp-treeview`      | `bs-treeview`     | NEW — data-driven recursive tree with `hide-borders`    |
| `mp-datatable`     | `bs-datatable`    | NEW — virtual-scrollable table with row events          |
| `mp-file-manager`  | `bs-file-manager` | NEW — composes the three primitives above + breadcrumb / toolbar / context-menu |

**Breaking changes are allowed** for the ports — no compatibility shims. The treeview moves from content-projected children to a data-driven `items` property; the datatable moves from `*bsDatatableColumn` template directives to property-driven column definitions. Consumers re-author their templates; the new APIs are simpler and shareable across frameworks.

---

## Goals & Objectives

### Primary Goals
- Ship `bs-file-manager` with the v1 feature menu the user explicitly approved: navigation (tree + grid + breadcrumb + dbl-click), drag-drop upload (simulated in demo), file operations (rename / delete / new / cut / copy / paste), search, sort, view modes (list/icons), selection (single/multi with Shift/Ctrl).
- Port `bs-treeview` and `bs-datatable` to Lit web components in the same release so the new file-manager composes shared primitives rather than duplicating tree or grid logic.
- Establish the data-driven model for the treeview so it can be slotted into any future composite component (not just the file-manager).
- WCAG 2.1 AA on day one: ARIA roles for `tree` / `grid` / `toolbar` / `menu` / `region`, roving tabindex on tree and grid, full keyboard navigation, visible keymap on the demo page.

### Success Metrics
- Mouse, keyboard, and touch interaction round-trip through `[(selection)]` / `[(viewMode)]` / `[(currentFolderId)]` without losing fidelity.
- All three new Lit WCs pass axe-core with zero serious findings.
- Keyboard-only users can: navigate the tree, navigate the file list, open a folder, multi-select, rename, delete, paste, and trigger the drop-zone announcement — without touching the mouse.
- New component adds < 20 kB gzipped to the umbrella library's tree-shakeable footprint.
- Smoke-tested on Chromium + Firefox; Firefox flex-shrink quirks ([[feedback_firefox_flex_shrink]]) addressed up-front.

---

## Non-Goals / Out of Scope

- **Real upload backend** — `mp-upload-request` emits the `File[]`; the demo simulates with a fake progress bar. Production consumers wire their own upload pipeline.
- **File preview pane** — image thumbnails / PDF previews / hex viewer deferred to v2.
- **Lazy-loaded tree data** — v1 takes a fully-materialised `nodes` array. Lazy children on expand is v2 (the data shape leaves room for it).
- **Drag between panes** — dragging a file row onto a tree folder to move it is a Syncfusion staple but deferred to v2. (HTML5 dnd quirks make this non-trivial and the user did not list it in v1.)
- **Internationalisation beyond externalisable English strings** — `search-placeholder` and the toolbar labels are configurable; locale-aware date/size formatting is v2.
- **Backwards-compat shims on the ported components** — `[[feedback_breaking_changes_ok]]`. Consumers re-author templates. CHANGELOG documents the migration.
- **Custom row template injection on `mp-datatable` from outside the file-manager** — the new datatable column API uses property-driven `cellRenderer` callbacks; if a consumer wants the old `*bsRowTemplate` they wire it through the Angular wrapper's `@ContentChild`.

---

## UX Specification

### Anatomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📁 New folder    ↑ Up   🔍 Search…           [List ▸ Icons]   ⋮         │ ← toolbar
├──────────────┬──────────────────────────────────────────────────────────┤
│  ▼ Inbox     │  Documents › Photos › 2025                              │ ← breadcrumb
│    ▼ Office │ ┌────────────────────────────────────────────────────────┤
│      Cust.. │ │ ☐ Name           │ Size    │ Modified  │ Type          │
│      Co-W…  │ │ ☐ 📁 Q1          │  —      │ 12 May    │ Folder        │
│  ▶ Drafts   │ │ ☐ 📄 invoice.pdf │ 234 kB  │ 11 May    │ PDF           │
│  ▶ Sent     │ │ ☑ 🖼 photo.jpg   │ 1.2 MB  │ 09 May    │ JPEG          │
│             │ │ ☐ 📦 archive.zip │ 4.0 MB  │ 04 May    │ ZIP           │
│             │ └────────────────────────────────────────────────────────┘
└─────────────┴──────────────────────────────────────────────────────────┘
   mp-treeview     mp-splitter      mp-datatable
   (hide-borders)                   (or icon-grid view)
```

Drag-drop overlay (when `allow-upload` and the OS is dragging files):

```
┌─────────────────────────────────────────────────┐
│                                                 │
│            ↓ Drop files to upload ↓             │  ← dashed border
│                                                 │     translucent BS primary
│                                                 │
└─────────────────────────────────────────────────┘
```

### Interaction

| Action                                | Trigger                                    | Behaviour                                                                                  |
|---------------------------------------|--------------------------------------------|--------------------------------------------------------------------------------------------|
| Navigate into folder                  | dbl-click row, Enter on selection, breadcrumb click | Emits `mp-navigate`; `currentFolderId` updates                                       |
| Open file                             | dbl-click row, Enter on selection          | Emits `mp-node-open` with the node                                                          |
| Single-select                         | single-click row                           | Replaces selection                                                                          |
| Add to selection                      | Ctrl-click / Cmd-click                     | Toggles row in selection                                                                    |
| Range-select                          | Shift-click                                | Extends selection to clicked row using anchor row                                          |
| Open context menu                     | right-click row, ContextMenu key, Shift+F10 | Sets selection to the row if it wasn't selected; opens menu                               |
| Rename                                | F2 on selection, context menu              | Inline edit on the row; Esc cancels; Enter emits `mp-operation` kind `'rename'`            |
| Delete                                | Del key, context menu                      | Confirmation dialog; emits `mp-operation` kind `'delete'`                                   |
| New folder                            | Toolbar button, Ctrl+Shift+N               | Prompts for name; emits `mp-operation` kind `'new-folder'`                                  |
| Cut / Copy / Paste                    | Ctrl+X / Ctrl+C / Ctrl+V                   | Updates internal clipboard state; cut rows fade; paste emits `mp-operation` kind `'paste'` |
| Search                                | Toolbar search input                       | Filters visible datatable on `name` (case-insensitive substring, scoped to current folder) |
| Toggle view mode                      | Toolbar toggle button                      | Switches between list (datatable) and icons (CSS grid)                                      |
| Drag OS files onto right pane         | OS file drag                               | Shows drop overlay; on drop emits `mp-upload-request` with `File[]` + `targetFolderId`     |

### Keyboard map

| Key                       | Context                | Action                                                |
|---------------------------|------------------------|-------------------------------------------------------|
| `↑` / `↓`                 | Tree, file list        | Move focus up / down within the pane (roving tabindex) |
| `→` / `←`                 | Tree                   | Expand / collapse focused folder; cross to parent      |
| `Home` / `End`            | Tree, file list        | First / last visible row                              |
| `Enter`                   | Tree, file list        | Activate row (navigate into folder, open file)        |
| `Space`                   | File list              | Toggle selection on focused row                        |
| `Ctrl+A`                  | File list              | Select all in current folder                          |
| `Ctrl+X` / `Ctrl+C` / `Ctrl+V` | File list          | Clipboard operations                                  |
| `Del`                     | File list              | Delete selection                                       |
| `F2`                      | File list              | Rename focused row                                     |
| `Ctrl+Shift+N`            | File-manager           | New folder                                             |
| `Ctrl+F`                  | File-manager           | Focus search input                                     |
| `Escape`                  | Inline edit, menu, dialog | Cancel / close                                      |
| `ContextMenu` / `Shift+F10` | File list            | Open context menu on focused row                       |

---

## Data Model

```ts
export type FileSystemNodeType = 'folder' | 'file';

export interface FileSystemNode {
  id: string;
  parentId: string | null;
  name: string;
  type: FileSystemNodeType;
  size?: number;             // bytes; folders compute on demand
  modifiedAt?: string;       // ISO-8601
  mimeType?: string;         // for icon resolution
  iconKey?: string;          // override bootstrap-icons lookup
  meta?: Record<string, unknown>;
}

export interface FileManagerState {
  currentFolderId: string | null;
  selection: ReadonlySet<string>;
  clipboard: { mode: 'cut' | 'copy'; ids: ReadonlySet<string> } | null;
  searchQuery: string;
  viewMode: 'list' | 'icons';
  sort: { column: 'name' | 'size' | 'modifiedAt' | 'type'; direction: 'asc' | 'desc' };
}
```

State is provided to descendants via `@lit/context` ([[reference_lit_context_recursive]]) so the breadcrumb, toolbar, tree, and file-list can read & dispatch without prop drilling.

---

## Public API

### `<mp-file-manager>` / `<bs-file-manager>`

**Properties / attributes** (Lit naming on the left, Angular naming on the right):

| Lit attribute / property | Angular input          | Type                                            | Default      | Description |
|--------------------------|------------------------|-------------------------------------------------|--------------|-------------|
| `nodes` (property only)  | `[nodes]`              | `FileSystemNode[]`                              | `[]`         | Flat list of all nodes (folders + files). |
| `root-folder-id`         | `[rootFolderId]`       | `string \| null`                                | `null`       | Starting folder (null = virtual root containing all parentless nodes). |
| `current-folder-id`      | `[(currentFolderId)]`  | `string \| null`                                | `null`       | Two-way bound: reflects the folder the user has navigated into. |
| `allow-upload`           | `[allowUpload]`        | `boolean`                                       | `false`      | Enable OS file drop overlay. |
| `allow-operations`       | `[allowOperations]`    | `boolean \| OperationFlags`                     | `true`       | Toggle rename / delete / new-folder / cut / copy / paste individually. |
| `view-mode`              | `[(viewMode)]`         | `'list' \| 'icons'`                             | `'list'`     | Two-way bound display mode. |
| `selection-mode`         | `[selectionMode]`      | `'single' \| 'multiple' \| 'none'`              | `'multiple'` | |
| `search-placeholder`     | `[searchPlaceholder]`  | `string`                                        | `'Search…'`  | |
| *(property only)*        | `[iconResolver]`       | `(node: FileSystemNode) => string`              | bootstrap-icons default | Customise the icon-key lookup. |

**Events** (Lit CustomEvent on the left, re-emitted Angular `@Output` on the right):

| Lit event              | Angular output          | Detail                                                      | When                                                            |
|------------------------|-------------------------|-------------------------------------------------------------|-----------------------------------------------------------------|
| `mp-navigate`          | `navigate`              | `{ folderId: string \| null }`                              | User dbl-clicks folder, breadcrumb segment, or `Enter` on folder. |
| `mp-selection-change`  | `selectionChange`       | `{ selectedIds: string[] }`                                 | Selection mutated by any input modality.                         |
| `mp-node-open`         | `nodeOpen`              | `{ node: FileSystemNode }`                                  | User dbl-clicks file row or `Enter` on file.                     |
| `mp-upload-request`    | `uploadRequest`         | `{ files: File[]; targetFolderId: string \| null }`         | OS files dropped onto the right pane.                            |
| `mp-operation`         | `operation`             | `{ kind: 'rename' \| 'delete' \| 'new-folder' \| 'paste'; payload: unknown }` | Consumer mutates `nodes` and pushes back. |
| `mp-error`             | `error`                 | `{ kind: string; message: string }`                         | Internal validation failure (e.g. duplicate name on rename).     |

Consumer is responsible for mutating `nodes` and pushing back via the property — `mp-file-manager` does not self-mutate. This matches `mp-scheduler`'s API contract ([[feedback_wc_no_imposed_behavior]]).

**Slots** (Lit WC only; Angular wrapper exposes equivalent `@ContentChild` template inputs):

- `node-icon` — override icon rendering per node (receives the node via Lit context).
- `empty-state` — replace the default empty-folder message.
- `toolbar-extra` — append custom toolbar buttons after the built-in ones.

**CSS custom properties** (Bootstrap-aligned):

- `--bs-file-manager-border`
- `--bs-file-manager-pane-bg`
- `--bs-file-manager-row-hover-bg`
- `--bs-file-manager-drop-zone-bg`
- `--bs-file-manager-drop-zone-border`
- `--bs-file-manager-icon-color`

### `<mp-treeview>` / `<bs-treeview>` — new

**Properties** new for the port:

| Attribute / property | Type                                            | Default | Description                                                                                                                                  |
|----------------------|-------------------------------------------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `items` (property)   | `TreeNode[]`                                    | `[]`    | Data-driven children. **Replaces content projection.**                                                                                       |
| `hide-borders`       | `boolean`                                       | `false` | Suppress the `list-group` borders. File-manager's left pane uses this to sit flush against the splitter divider with no doubled border line. |
| `selection-mode`     | `'single' \| 'multiple' \| 'none'`              | `'single'` | Roving-tabindex aware selection.                                                                                                          |
| `expanded-ids`       | `string[]` (property; attribute mirrors as JSON) | `[]`   | Currently-expanded node IDs.                                                                                                                  |
| `selected-ids`       | `string[]` (property; attribute mirrors as JSON) | `[]`   | Currently-selected node IDs.                                                                                                                  |

**TreeNode shape**:

```ts
export interface TreeNode {
  id: string;
  parentId: string | null;
  label: string;
  iconKey?: string;            // resolves to a bootstrap-icons SVG; consumer can override via icon-resolver
  meta?: Record<string, unknown>;
}
```

**Events**: `tree-node-select`, `tree-node-expand`, `tree-node-collapse` — detail `{ node: TreeNode; expandedIds?: string[]; selectedIds?: string[] }`.

### `<mp-datatable>` / `<bs-datatable>` — new

Parity with the existing Angular component plus the gaps the file-manager needs:

| Change                                                  | Reason                                                                                  |
|---------------------------------------------------------|-----------------------------------------------------------------------------------------|
| Property-driven `columns: DatatableColumnDef[]`         | Replaces `*bsDatatableColumn` template directive (Angular-specific).                    |
| Optional per-row `cellRenderer(row, column)` callback   | Replaces `*bsRowTemplate` for the WC API; Angular wrapper still accepts `@ContentChild` template via slot. |
| Row-level events: `mp-datatable-row-click` / `mp-datatable-row-dblclick` / `mp-datatable-row-contextmenu` | File-manager needs dbl-click to navigate; right-click to open context menu. |
| `DatatableSettings` shape and sort behaviour            | Unchanged. The sort algorithm extracts cleanly from `datatable-sort-base.ts` into a pure helper used by both old and new code paths. |

---

## Accessibility

| Surface                 | Role                                    | Notes                                                                                |
|-------------------------|-----------------------------------------|--------------------------------------------------------------------------------------|
| Tree                    | `tree` + `treeitem` + `group`           | `aria-expanded` on items with children. Roving tabindex.                              |
| File list (list view)   | `grid` + `row` + `gridcell`             | `aria-rowindex` / `aria-colindex`. Roving tabindex for arrow-key navigation.         |
| File list (icons view)  | `grid` + `gridcell`                     | Two-dimensional roving with `↑↓←→`.                                                  |
| Toolbar                 | `toolbar`                               | Labelled buttons. Arrow-key navigation within.                                       |
| Breadcrumb              | `navigation aria-label="Breadcrumb"`    | Ordered list of links; current = `aria-current="page"`.                              |
| Context menu            | `menu` + `menuitem`                     | Arrow-key navigable; Esc closes; focus returns to the trigger row.                   |
| Drop zone               | `region aria-label="File drop zone"`    | `aria-live="polite"` announces drag-enter / drop / simulated progress.                |
| Demo page               | Visible keymap                          | `<details><summary>Keyboard shortcuts</summary>` per [[project_wc_aria_decisions]].   |

---

## Open Questions

| #  | Question                                                                                              | Default if unresolved                                              |
|----|-------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| Q1 | Reuse `bs-dropdown` for the context menu, or introduce a new `mp-context-menu` primitive?             | Investigate during Phase 3. Reuse if `bs-dropdown` exposes enough. |
| Q2 | Lazy-loaded tree data — v1 or v2?                                                                     | v2. Data shape leaves room (no children list inlined).             |
| Q3 | Icon-grid view — extract a reusable `mp-card-grid` primitive, or keep file-manager-specific?          | File-manager-specific in v1; extract if a second consumer appears. |
| Q4 | Drag between tree and datatable (move file to a different folder via drag) — v1 or v2?               | v2. Not in user's v1 list.                                          |
| Q5 | Backwards-compat shim for `bs-treeview` content-projected children (one release deprecation window)?  | None — breaking change. CHANGELOG documents migration.              |
| Q6 | Backwards-compat shim for `bs-datatable` `*bsDatatableColumn` directive?                              | None — breaking change. CHANGELOG documents migration.              |

---

## Risks & Mitigations

| Risk                                                              | Mitigation                                                                                                  |
|-------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Datatable port is the largest piece (665 lines of complex logic). | Keep Phase 2 as an independent commit; can ship alongside Phase 1 without blocking Phase 3.                |
| Recursive Lit rendering without `ng-template`.                    | Use Lit `repeat` directive with a recursive render-helper function (verified pattern in Lit docs).         |
| OS file-drop DataTransfer differences across browsers.            | Smoke-test Firefox + Chrome + WebKit; Playwright covers Firefox per existing convention.                    |
| Selection + clipboard interactions are subtle.                    | Encode as a state machine; exhaustive unit tests of transitions.                                            |
| Touch + drag conflicts with scroll ([[feedback_touch_action_immutable]]). | `touch-action: none` only on the drop overlay, not on the entire datatable.                          |
| Breaking changes on treeview + datatable APIs in the same release. | CHANGELOG entry per component, migration snippets, demo pages updated in the same commit as the port.      |

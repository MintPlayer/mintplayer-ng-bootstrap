# Product Requirements Document: File Manager

**Issue**: #329
**Title**: File Manager (bs-file-manager + Lit WC stack)
**Status**: B2B-readiness expansion (PR #341)
**Created**: 2026-05-15
**Last Updated**: 2026-05-16

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

- **File preview pane** — image thumbnails / PDF previews / hex viewer deferred to v2.
- **Drag between panes** — dragging a file row onto a tree folder to move it is a Syncfusion staple but deferred to v2. (HTML5 dnd quirks make this non-trivial and the user did not list it in v1.)
- **Locale-aware date/size formatting** — string labels are externalisable (see B2B-readiness § i18n) but Intl-aware formatters for sizes and dates are v2; today the WC uses `toLocaleDateString()` for dates and base-2 size units.

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
  /** Per-node operation overrides (B2B); see B2B-readiness § Per-node permissions. */
  allowOperations?: Partial<OperationFlags>;
  /** Free-form metadata. The WC reads only `meta.loading` (set during lazy expansion). */
  meta?: Record<string, unknown>;
}

/** Discriminator for the kinds of mutating operations the WC emits. */
export type OperationKind = 'rename' | 'delete' | 'new-folder' | 'paste';

/**
 * Toggle individual operations on / off, both globally on `<bs-file-manager>`
 * (`[allowOperations]`) and per-node on `FileSystemNode.allowOperations`.
 * Each missing key inherits from the parent scope (per-node falls back to
 * global; global defaults to `true`).
 */
export interface OperationFlags {
  rename?: boolean;
  delete?: boolean;
  newFolder?: boolean;
  cut?: boolean;
  copy?: boolean;
  paste?: boolean;
}

/** Discriminated-union payload for the `(operation)` event. */
export type OperationEventDetail =
  | { kind: 'rename'; nodeId: string; previousName: string; newName: string }
  | { kind: 'delete'; nodeIds: string[] }
  | { kind: 'new-folder'; parentId: string | null; name: string }
  | {
      kind: 'paste';
      mode: 'cut' | 'copy';
      sourceIds: string[];
      targetFolderId: string | null;
      conflicts?: Record<string, { action: 'replace' | 'skip' | 'rename'; newName?: string }>;
    };

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
| `mp-operation`         | `operation`             | `OperationEventDetail` (discriminated union — see Data Model) | Consumer mutates `nodes` and pushes back. |
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

## B2B-readiness expansion

The v1 component is a working file-browser UI; this section captures the surface area required to drop it into a typical B2B admin portal (CMS asset library, document management, SaaS file vault) without forcing every consumer to re-implement the same plumbing.

### B2B gap audit

| Gap | Status |
|---|---|
| 1. Upload progress / cancel / retry feedback | API added — `(uploadRequest)` carries a Promise-resolvable handle + per-file progress channel |
| 2. Async operation pending state (rows show "saving…" while the backend works) | API added — `pendingOpIds` set on the WC, exposed via `markPending()` / `clearPending()` |
| 3. Operation success/failure UI feedback | API added — `(operationResult)` event consumers fire after handling, surfacing failure messages to the user via the `(error)` event |
| 4. Conflict resolution (paste/upload into a folder containing a same-name file) | API added — `(conflict)` request event with consumer-provided `resolveConflict()` answer |
| 5. Confirmation/prompt styling (replacing `window.confirm` / `window.prompt`) | API added — `dialogResolver` callback property; default falls back to `window.*` so basic consumers don't have to wire anything |
| 6. Lazy-loaded tree data | API added — `loadChildren` callback on `mp-treeview` + `bs-file-manager`; loading state surfaced via `node.meta.loading` |
| 7. Virtual scroll inside the file list (large folders) | Enabled by default — the file-manager's internal `<mp-datatable>` now ships `virtualScroll` + `itemSize` |
| 8. i18n / externalised strings | API added — `FileManagerMessages` interface + `[messages]` input; Lit-context provider follows the query-builder precedent |
| 9. Per-node access control | API added — `FileSystemNode.allowOperations?: Partial<OperationFlags>` overrides the global flags per node |
| 10. Touch interaction (long-press context menu, upload button instead of OS file-drop) | API added — 600 ms long-press matching `mp-scheduler`'s `InputHandler`; OS file-drop overlay hides on coarse pointers and the toolbar grows an explicit upload button instead |

### API additions

```ts
// libs/.../file-manager/src/types/file-system-node.ts
export interface FileSystemNode {
  // … existing
  /** Per-node operation overrides; falls back to the global allowOperations. */
  allowOperations?: Partial<OperationFlags>;
}

// libs/.../file-manager/src/types/messages.ts (new)
export interface FileManagerMessages {
  home: string;
  newFolder: string; rename: string; delete: string;
  cut: string; copy: string; paste: string; upload: string;
  search: string; loading: string; dropFilesToUpload: string;
  noFilesOrFolders: string;
  name: string; size: string; modified: string; type: string;
  folder: string; file: string;
  deleteConfirm: (count: number) => string;
  folderNamePrompt: string;
  defaultNewFolderName: string;
  conflictReplace: string; conflictSkip: string; conflictRename: string;
}

// libs/.../web-components/file-manager/src/components/mp-file-manager.ts
class MpFileManager extends LitElement {
  // … existing
  loadChildren?: (parentId: string) => Promise<FileSystemNode[]>;
  dialogResolver?: DialogResolver;       // replaces window.confirm/prompt; see below
  conflictResolver?: ConflictResolver;   // replaces auto-replace on paste
  messages?: Partial<FileManagerMessages>;
  uploads: ReadonlyArray<UploadEntry>;   // observable view of in-flight uploads
  pendingOpIds: ReadonlySet<string>;     // ids currently being mutated server-side

  markPending(nodeId: string, op: OperationKind): void;
  clearPending(nodeId: string): void;
  reportError(message: string, nodeId?: string): void;
}

type DialogResolver = (req:
  | { kind: 'confirm'; message: string }
  | { kind: 'prompt'; label: string; defaultValue?: string }
) => Promise<string | boolean | null>;

type ConflictResolver = (req: {
  existingNode: FileSystemNode;
  incomingName: string;
  mode: 'paste' | 'upload';
}) => Promise<{ action: 'replace' | 'skip' | 'rename'; newName?: string }>;

interface UploadEntry {
  id: string;
  file: File;
  targetFolderId: string | null;
  progress: number;             // 0–100
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}
```

The Angular wrapper exposes equivalents:

```ts
@Component({ selector: 'bs-file-manager' })
class BsFileManagerComponent {
  // … existing inputs
  readonly loadChildren = input<((parentId: string) => Promise<FileSystemNode[]>) | undefined>();
  readonly dialogResolver = input<DialogResolver | undefined>();
  readonly conflictResolver = input<ConflictResolver | undefined>();
  readonly messages = input<Partial<FileManagerMessages> | undefined>();

  readonly uploads = computed(() => this.fileManagerRef()?.nativeElement.uploads ?? []);
  readonly pendingOpIds = computed(() => this.fileManagerRef()?.nativeElement.pendingOpIds ?? new Set());
}
```

### Architectural decisions

1. **Event-driven async, not Promises-on-events** — `(operation)` continues to be a fire-and-forget CustomEvent; consumers call `markPending(id, op)` synchronously to mark the rows busy and `clearPending(id)` when done. Failures are surfaced via `reportError()` which re-fires `(error)`. This matches the existing event-driven file-upload model ([[ng-bootstrap/file-upload]]) and avoids forcing the WC's API to know about Promise/Observable.
2. **Lazy tree lives on `mp-treeview`** (not on the file-manager). The treeview is the surface that knows when a folder expands, and a reusable lazy primitive serves any future tree consumer. The file-manager wires its `loadChildren` directly through. Loading state is per-node via `node.meta.loading: true` rendered as a spinner in the chevron slot.
3. **Conflict & dialog resolvers are callbacks, not events** — when paste / upload detects a same-name target, the WC calls `conflictResolver(req)` and awaits the answer. Consumers wire this to their existing modal stack. If unset, the WC falls back to `window.confirm()` for conflicts ("Replace?") and `window.prompt()` for new folder names so basic usage still works.
4. **Per-node permissions are data, not a callback** — `FileSystemNode.allowOperations` is a `Partial<OperationFlags>` that overrides the global flag locally. This is cheaper than a callback (no per-render invocation) and serialises naturally over the wire.
5. **Touch uses the scheduler's `InputHandler` semantics** — 600 ms long-press to open the context menu; detection via `matchMedia('(pointer: coarse)')`. The OS file-drop overlay is hidden on coarse pointers; an explicit "Upload" toolbar button takes its place and triggers an `<input type="file" multiple>` picker that emits the same `(uploadRequest)` event.
6. **i18n via Lit context, mirroring query-builder** — `FileManagerMessages` ships English defaults; consumer overrides flow through `[messages]` (Angular wrapper input) → WC `messages` property → Lit `ContextProvider` so descendant Lit components consume merged values. Per the query-builder precedent ([[reference_lit_context_recursive]]).

### Non-goals (still)

- Real upload pipeline implementation — the WC tracks progress the consumer pushes; the consumer owns the XHR / fetch and the storage backend.
- Permissions inheritance — `allowOperations` is per-node and does not auto-cascade to descendants. Consumers compute the effective permission server-side or in their state layer.
- Localised number / date formatting — string labels are externalised but `formatSize()` and `formatDate()` use base-2 units and `toLocaleDateString()` respectively. Pluggable formatters land in v2.

---

## Cross-framework rendering bridge

`bs-datatable` preserves the existing `*bsDatatableColumn` (header content) and `*bsRowTemplate` (per-row `<td>`s) Angular directives even though the underlying `<mp-datatable>` is a Lit web component with shadow DOM. The bridge follows the pattern the query-builder shipped in #340:

1. **Capture**: the Angular wrapper reads the directives via `contentChild()` / `contentChildren()`. Each directive owns a `TemplateRef`.
2. **Build a renderer callback**: `bs-datatable` constructs a `rowRenderer: (row, rowIndex) => Node | ReadonlyArray<Node>` (and per-column `headerRenderer`s for the column directives) that the WC accepts as a property.
3. **Materialise into DOM**: when the WC calls the renderer, the wrapper invokes `viewContainerRef.createEmbeddedView(tpl, { $implicit: row, index })`, calls `viewRef.detectChanges()`, and returns `viewRef.rootNodes` — these are the rendered `<td>` elements.
4. **Cache + reuse**: views are keyed by `rowKey(row)` and stored in a `Map<string, EmbeddedViewRef>`. On the next render Lit re-reads from the renderer, the wrapper updates `viewRef.context.$implicit = nextRow`, calls `detectChanges()`, and reuses the same DOM nodes (no detach/reattach thrash).
5. **Lifecycle**: `DestroyRef.onDestroy()` on the Angular wrapper tears down every cached `EmbeddedViewRef` when the component leaves the tree. Stale views for rows that disappeared between renders are pruned proactively in the `[items]` / `[data]` effect.

The same mechanism powers the treeview's `*bsTreeviewNode` directive via `mp-treeview.nodeRenderer`. The Lit WCs themselves know nothing about Angular — they accept a function returning `Node`s and project them into shadow DOM. This is the pattern recorded under [[feedback_wc_no_angular_imports]] and matches `mp-query-builder.element.ts`'s editor factory pattern.

**Why not slots?** Tables have strict parent-child rules — `<tr>` / `<td>` can only live inside `<table>` / `<tr>`, which makes light-DOM slot projection across the shadow boundary unworkable. Rendering directly via callbacks bypasses this constraint and gives Angular consumers full template power.

---

## Performance notes

- **Treeview lookups**: `<mp-treeview>` walks the data once into a `Map<string, TreeNode>` and `Map<string, TreeNode>` parent index when `items` changes. Per-keystroke `findParent` / `findNode` (used by `←` and `Home`/`End`) are O(1).
- **File-manager tree assembly**: `getTreeItems()` builds a `Map<parentId, FileSystemNode[]>` once per render and walks it depth-first — O(N) for N nodes, not O(N²).
- **Virtual scroll** (`<mp-datatable>`):
  - Implementation: scroll-position-driven; computes `startIndex` / `endIndex` from `scrollTop / itemSize` ± a buffer, then renders only the slice with explicit-height spacer `<tr>`s above and below.
  - Trade-off vs. [`@lit-labs/virtualizer`](https://github.com/lit/lit/tree/main/packages/labs/virtualizer): the labs package handles variable row heights and pre-cached size estimates but is a new dependency and applies its own host element. The file-manager's rows are uniform-height (`itemSize` default 40 px) so the simpler custom approach covers the use case without the dep. Re-evaluate when variable row heights are needed (e.g. icons-view inside a virtualised grid).

---

## Open Questions

| #  | Question                                                                                              | Resolution                                                          |
|----|-------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| Q1 | Reuse `bs-dropdown` for the context menu, or introduce a new `mp-context-menu` primitive?             | **Resolved**: Lit-native inline menu inside `mp-file-manager`. Using `bs-dropdown` (Angular) inside a Lit WC contradicts framework independence ([[feedback_wc_no_angular_imports]]). |
| Q2 | Lazy-loaded tree data — v1 or v2?                                                                     | **Resolved**: Landed in B2B-readiness — `mp-treeview.loadChildren` + `TreeNode.lazy`. |
| Q3 | Icon-grid view — extract a reusable `mp-card-grid` primitive, or keep file-manager-specific?          | **Deferred**: File-manager-specific in v1; extract if a second consumer appears. |
| Q4 | Drag between tree and datatable (move file to a different folder via drag) — v1 or v2?                | **Deferred to v2**: Not in user's v1 list.                          |
| Q5 | Backwards-compat shim for `bs-treeview` content-projected children?                                   | **Resolved**: Breaking change. CHANGELOG documents migration.       |
| Q6 | Backwards-compat shim for `bs-datatable` `*bsDatatableColumn` directive?                              | **Resolved**: Directive preserved and routed through new WC via `EmbeddedViewRef` bridge — see "Cross-framework rendering bridge" below. |
| Q7 | Custom virtual scroll vs. `@lit-labs/virtualizer` for `<mp-datatable>`?                              | **Resolved**: Custom scroll-position-driven virtualizer in `<mp-datatable>`. Trade-off below. |

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

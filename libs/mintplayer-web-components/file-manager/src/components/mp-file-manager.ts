import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';

// Side-effect imports: register the composed elements.
import '@mintplayer/web-components/splitter';
import '@mintplayer/web-components/treeview';
import '@mintplayer/web-components/datatable';

import type { TreeNode } from '@mintplayer/web-components/treeview';
import type {
  DatatableColumnDef,
  RowEventDetail,
  SelectionChangeEventDetail as DatatableSelectionEvent,
} from '@mintplayer/web-components/datatable';
import { fileManagerStyles } from '../styles';
import type { FileSystemNode, FileManagerMessages } from '../types';
import { DEFAULT_FILE_MANAGER_MESSAGES, mergeMessages } from '../types';

export type FileManagerSelectionMode = 'none' | 'single' | 'multiple';
export type FileManagerViewMode = 'list' | 'icons';

export type OperationKind = 'rename' | 'delete' | 'new-folder' | 'paste';

export interface OperationFlags {
  rename?: boolean;
  delete?: boolean;
  newFolder?: boolean;
  cut?: boolean;
  copy?: boolean;
  paste?: boolean;
}

/**
 * Replacement for `window.confirm` / `window.prompt`. Consumers wire this to
 * their app's modal system (e.g. `bs-modal`). The resolver should return:
 *   - `'confirm'`: a `boolean` (true = OK, false = Cancel)
 *   - `'prompt'`: a `string` (the entered text) or `null` (cancelled)
 *
 * When unset, the WC falls back to the native `window.*` dialogs so basic
 * usage still works without consumer wiring.
 */
export type DialogResolver = (
  request:
    | { kind: 'confirm'; message: string }
    | { kind: 'prompt'; label: string; defaultValue?: string },
) => Promise<string | boolean | null>;

/**
 * Invoked when paste or upload would overwrite an existing same-name entry.
 * Consumers can show a "Replace / Skip / Rename" prompt and resolve.
 * When unset, the WC defaults to `{ action: 'replace' }` (existing v1 behaviour).
 */
export type ConflictResolver = (request: {
  existingNode: FileSystemNode;
  incomingName: string;
  mode: 'paste' | 'upload';
}) => Promise<{ action: 'replace' | 'skip' | 'rename'; newName?: string }>;

/** Per-file upload progress entry surfaced via the `uploads` property. */
export interface UploadEntry {
  id: string;
  file: File;
  targetFolderId: string | null;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export interface NavigateEventDetail {
  folderId: string | null;
}

export interface NodeOpenEventDetail {
  node: FileSystemNode;
}

export interface SelectionChangeEventDetail {
  selectedIds: string[];
}

export interface UploadRequestEventDetail {
  files: File[];
  targetFolderId: string | null;
  /**
   * Per-file tracking entries. Consumers store these IDs and push progress
   * via `mp-file-manager.reportUploadProgress(id, progress, status?, error?)`
   * so the WC's `uploads` property reflects the in-flight state.
   */
  uploads: ReadonlyArray<UploadEntry>;
  /**
   * Conflict resolutions when a same-name file already exists in the
   * target folder and the `conflictResolver` decided `'replace'` or
   * `'rename'`. Files the user chose to skip are not included in `files`.
   */
  conflictResolutions: ReadonlyArray<{
    fileName: string;
    action: 'replace' | 'rename';
    newName?: string;
  }>;
}

export type OperationEventDetail =
  | { kind: 'rename'; nodeId: string; previousName: string; newName: string }
  | { kind: 'delete'; nodeIds: string[] }
  | { kind: 'new-folder'; parentId: string | null; name: string }
  | {
      kind: 'paste';
      mode: 'cut' | 'copy';
      sourceIds: string[];
      targetFolderId: string | null;
      /**
       * Per-source-id conflict resolution decided via `conflictResolver`.
       * Missing keys = no conflict. Present keys = consumer chose `'replace'`,
       * `'skip'`, or `'rename'` (with optional `newName` when rename).
       */
      conflicts?: Record<string, { action: 'replace' | 'skip' | 'rename'; newName?: string }>;
    };

let instanceCounter = 0;

const FOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181L15.546 8H2.454l-.913-3.13a.5.5 0 0 1 .013-.087.5.5 0 0 1-.014-.913zM13.81 4H2.19l-.572 6 1.193 4 11.078-2.5L15.81 5.66A1 1 0 0 0 14.81 4z"/></svg>';

const FILE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>';

const ICON_SVG_LIST = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>';
const ICON_SVG_GRID = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>';

/**
 * `<mp-file-manager>` — Lit web component composing splitter + treeview + datatable
 * into a Syncfusion-style file browser.
 *
 * Properties (camelCase JS / kebab-case HTML attributes where applicable):
 *  - `nodes: FileSystemNode[]` (property)
 *  - `rootFolderId: string | null` (`root-folder-id`)
 *  - `currentFolderId: string | null` (`current-folder-id`)
 *  - `allowUpload: boolean` (`allow-upload`)
 *  - `allowOperations: boolean | OperationFlags` (`allow-operations`)
 *  - `viewMode: 'list' | 'icons'` (`view-mode`)
 *  - `selectionMode: 'none' | 'single' | 'multiple'` (`selection-mode`)
 *  - `searchPlaceholder: string` (`search-placeholder`)
 *  - `iconResolver: (iconKey, node) => string | undefined` (property)
 *
 * Events: `mp-navigate`, `mp-node-open`, `mp-selection-change`,
 * `mp-upload-request`, `mp-operation`, `mp-error`.
 */
export class MpFileManager extends LitElement {
  static override styles = [fileManagerStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'root-folder-id',
      'current-folder-id',
      'allow-upload',
      'view-mode',
      'selection-mode',
      'search-placeholder',
    ];
  }

  private readonly instanceId = `mp-file-manager-${++instanceCounter}`;

  // ─── Reactive state ──────────────────────────────────────────────────────
  private _nodes: FileSystemNode[] = [];
  private _rootFolderId: string | null = null;
  private _currentFolderId: string | null = null;
  private _allowUpload = false;
  private _allowOperations: boolean | OperationFlags = true;
  private _viewMode: FileManagerViewMode = 'list';
  private _selectionMode: FileManagerSelectionMode = 'multiple';
  private _searchPlaceholder = '';
  private _iconResolver: ((iconKey: string, node?: FileSystemNode) => string | undefined) | undefined;
  private _messages: FileManagerMessages = DEFAULT_FILE_MANAGER_MESSAGES;

  // Internal state
  private _selection: Set<string> = new Set();
  private _expandedTreeIds: Set<string> = new Set();
  private _clipboard: { mode: 'cut' | 'copy'; ids: string[] } | null = null;
  private _searchQuery = '';
  private _renameTarget: string | null = null;
  private _renameInputRef: Ref<HTMLInputElement> = createRef();
  private _dragDepth = 0;
  private _contextMenu: { x: number; y: number; targetId: string } | null = null;
  private _isTouchMode = false;
  private _touchHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private _touchHoldTarget: string | null = null;
  private _pendingOps: Map<string, OperationKind> = new Map();
  private _uploads: UploadEntry[] = [];
  private _dialogResolver: DialogResolver | undefined;
  private _conflictResolver: ConflictResolver | undefined;
  private _loadChildren: ((parentId: string) => Promise<FileSystemNode[]>) | undefined;
  private _loadedFolders: Set<string> = new Set();

  // ─── Property accessors ──────────────────────────────────────────────────
  get nodes(): FileSystemNode[] {
    return this._nodes;
  }
  set nodes(value: FileSystemNode[]) {
    this._nodes = Array.isArray(value) ? value : [];
    this.pruneSelection();
    this.requestUpdate();
  }

  get rootFolderId(): string | null {
    return this._rootFolderId;
  }
  set rootFolderId(value: string | null) {
    this._rootFolderId = value ?? null;
    this.requestUpdate();
  }

  get currentFolderId(): string | null {
    return this._currentFolderId;
  }
  set currentFolderId(value: string | null) {
    if (this._currentFolderId !== value) {
      this._currentFolderId = value ?? null;
      this._selection.clear();
      this.requestUpdate();
    }
  }

  get allowUpload(): boolean {
    return this._allowUpload;
  }
  set allowUpload(value: boolean) {
    this._allowUpload = !!value;
    this.requestUpdate();
  }

  get allowOperations(): boolean | OperationFlags {
    return this._allowOperations;
  }
  set allowOperations(value: boolean | OperationFlags) {
    this._allowOperations = value;
    this.requestUpdate();
  }

  get viewMode(): FileManagerViewMode {
    return this._viewMode;
  }
  set viewMode(value: FileManagerViewMode) {
    if (value === 'list' || value === 'icons') {
      this._viewMode = value;
      this.requestUpdate();
    }
  }

  get selectionMode(): FileManagerSelectionMode {
    return this._selectionMode;
  }
  set selectionMode(value: FileManagerSelectionMode) {
    this._selectionMode = value;
    if (value === 'none') this._selection.clear();
    this.requestUpdate();
  }

  get searchPlaceholder(): string {
    return this._searchPlaceholder;
  }
  set searchPlaceholder(value: string) {
    this._searchPlaceholder = value || 'Search…';
    this.requestUpdate();
  }

  get iconResolver(): ((iconKey: string, node?: FileSystemNode) => string | undefined) | undefined {
    return this._iconResolver;
  }
  set iconResolver(value: ((iconKey: string, node?: FileSystemNode) => string | undefined) | undefined) {
    this._iconResolver = value;
    this.requestUpdate();
  }

  /**
   * Partial override of the visible-string set. Unset keys fall back to the
   * English defaults in `DEFAULT_FILE_MANAGER_MESSAGES`.
   */
  get messages(): FileManagerMessages {
    return this._messages;
  }
  set messages(value: Partial<FileManagerMessages> | undefined) {
    this._messages = mergeMessages(value);
    if (this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', this._messages.ariaFileManager);
    }
    this.requestUpdate();
  }

  /**
   * Replacement for `window.confirm` / `window.prompt`. When unset, falls
   * back to the browser dialogs.
   */
  get dialogResolver(): DialogResolver | undefined {
    return this._dialogResolver;
  }
  set dialogResolver(value: DialogResolver | undefined) {
    this._dialogResolver = value;
  }

  /**
   * Invoked when paste / upload would overwrite an existing entry. When
   * unset, the WC silently replaces (v1 behaviour).
   */
  get conflictResolver(): ConflictResolver | undefined {
    return this._conflictResolver;
  }
  set conflictResolver(value: ConflictResolver | undefined) {
    this._conflictResolver = value;
  }

  /**
   * Async loader invoked when a folder is expanded in the tree for the
   * first time. Resolve with the folder's children; the consumer should
   * merge them into the global `nodes` array. The WC also surfaces a
   * loading indicator via `node.meta.loading = true` while the promise
   * is in flight.
   */
  get loadChildren(): ((parentId: string) => Promise<FileSystemNode[]>) | undefined {
    return this._loadChildren;
  }
  set loadChildren(value: ((parentId: string) => Promise<FileSystemNode[]>) | undefined) {
    this._loadChildren = value;
  }

  /** In-flight uploads, exposed for read-only consumption by progress UIs. */
  get uploads(): ReadonlyArray<UploadEntry> {
    return this._uploads;
  }

  /** IDs of nodes currently being mutated server-side (set via `markPending`). */
  get pendingOpIds(): ReadonlySet<string> {
    return new Set(this._pendingOps.keys());
  }

  /**
   * Mark a node as having an operation in flight. The row renders with a
   * busy state and the consumer should call `clearPending()` when done.
   */
  markPending(nodeId: string, op: OperationKind): void {
    this._pendingOps.set(nodeId, op);
    this.requestUpdate();
  }

  /** Clear the pending state on a node. */
  clearPending(nodeId: string): void {
    if (this._pendingOps.delete(nodeId)) {
      this.requestUpdate();
    }
  }

  /**
   * Surface an error message to the consumer. The component also re-fires
   * an `(error)` event with the same payload so toast systems can listen.
   */
  reportError(message: string, nodeId?: string): void {
    this.dispatchEvent(
      new CustomEvent('mp-error', {
        detail: { kind: 'operation', message, nodeId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Push a progress update for an upload. The consumer calls this from
   * their upload-pipeline progress callback so the WC can render a
   * progress bar / completed state.
   */
  reportUploadProgress(uploadId: string, progress: number, status?: UploadEntry['status'], error?: string): void {
    const idx = this._uploads.findIndex((u) => u.id === uploadId);
    if (idx < 0) return;
    const next = { ...this._uploads[idx], progress, ...(status ? { status } : {}), ...(error ? { error } : {}) };
    this._uploads = [...this._uploads.slice(0, idx), next, ...this._uploads.slice(idx + 1)];
    this.requestUpdate();
  }

  /** Remove a finished/aborted upload from the tracking list. */
  clearUpload(uploadId: string): void {
    const before = this._uploads.length;
    this._uploads = this._uploads.filter((u) => u.id !== uploadId);
    if (this._uploads.length !== before) this.requestUpdate();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'root-folder-id':
        this._rootFolderId = newValue;
        this.requestUpdate();
        break;
      case 'current-folder-id':
        this._currentFolderId = newValue;
        this.requestUpdate();
        break;
      case 'allow-upload':
        this._allowUpload = newValue !== null;
        this.requestUpdate();
        break;
      case 'view-mode':
        if (newValue === 'list' || newValue === 'icons') {
          this._viewMode = newValue;
          this.requestUpdate();
        }
        break;
      case 'selection-mode':
        if (newValue === 'none' || newValue === 'single' || newValue === 'multiple') {
          this._selectionMode = newValue;
          if (newValue === 'none') this._selection.clear();
          this.requestUpdate();
        }
        break;
      case 'search-placeholder':
        this._searchPlaceholder = newValue ?? 'Search…';
        this.requestUpdate();
        break;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'region');
    }
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', this._messages.ariaFileManager);
    }
    // Touch detection: coarse pointer → likely tablet/phone. We hide the
    // OS file-drop overlay (which doesn't fire on touch) and surface an
    // explicit Upload toolbar button instead.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        this._isTouchMode = window.matchMedia('(pointer: coarse)').matches;
      } catch {
        this._isTouchMode = false;
      }
    }
    this.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.addEventListener('touchend', this.onTouchEnd);
    this.addEventListener('touchcancel', this.onTouchEnd);
    this.addEventListener('touchmove', this.onTouchMove);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('touchstart', this.onTouchStart);
    this.removeEventListener('touchend', this.onTouchEnd);
    this.removeEventListener('touchcancel', this.onTouchEnd);
    this.removeEventListener('touchmove', this.onTouchMove);
    if (this._touchHoldTimer) {
      clearTimeout(this._touchHoldTimer);
      this._touchHoldTimer = null;
    }
  }

  // ─── Touch support ──────────────────────────────────────────────────────
  /**
   * Long-press (≥ 600 ms, matching `mp-scheduler`'s `InputHandler`) opens
   * the context menu on the touched row. Movement aborts the long-press.
   */
  private onTouchStart = (ev: TouchEvent): void => {
    if (ev.touches.length !== 1) return;
    const touch = ev.touches[0];
    const target = (ev.composedPath().find(
      (el) => el instanceof HTMLElement && el.hasAttribute('data-node-id'),
    ) as HTMLElement | undefined)
      ?? (this.shadowRoot?.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null)?.closest('[data-node-id]') as HTMLElement | null;
    const nodeId = target?.getAttribute('data-node-id');
    if (!nodeId) return;
    this._touchHoldTarget = nodeId;
    const x = touch.clientX;
    const y = touch.clientY;
    this._touchHoldTimer = setTimeout(() => {
      if (this._touchHoldTarget !== nodeId) return;
      this._touchHoldTimer = null;
      if (this._selectionMode !== 'none' && !this._selection.has(nodeId)) {
        this._selection = new Set([nodeId]);
        this.emitSelectionChange();
      }
      this.openContextMenu(nodeId, x, y);
    }, 600);
  };

  private onTouchMove = (): void => {
    if (this._touchHoldTimer) {
      clearTimeout(this._touchHoldTimer);
      this._touchHoldTimer = null;
    }
    this._touchHoldTarget = null;
  };

  private onTouchEnd = (): void => {
    if (this._touchHoldTimer) {
      clearTimeout(this._touchHoldTimer);
      this._touchHoldTimer = null;
    }
    this._touchHoldTarget = null;
  };

  /**
   * Opens an `<input type="file" multiple>` picker for touch consumers
   * (replaces OS file-drop on phones/tablets). Emits `mp-upload-request`
   * with the chosen files just like the drag-drop path.
   */
  private openUploadPicker = (): void => {
    if (!this._allowUpload) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? []);
      if (files.length > 0) this.handleFiles(files);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  };

  // ─── Operation flags helper ─────────────────────────────────────────────
  /**
   * Resolve whether `op` is allowed. When `nodeId` is provided, per-node
   * overrides on `FileSystemNode.allowOperations` take precedence over the
   * global flag. When `nodeId` is omitted (toolbar-level decisions like
   * "new folder"), only the global flag applies.
   */
  private opEnabled(op: keyof OperationFlags, nodeId?: string): boolean {
    if (this._allowOperations === false) return false;
    const globalAllow = this._allowOperations === true
      ? true
      : (this._allowOperations as OperationFlags)[op] !== false;
    if (!nodeId) return globalAllow;
    const node = this._nodes.find((n) => n.id === nodeId);
    const localFlag = node?.allowOperations?.[op];
    if (localFlag === undefined) return globalAllow;
    return localFlag !== false;
  }

  /** True iff EVERY selected node permits the given operation. */
  private opEnabledOnSelection(op: keyof OperationFlags): boolean {
    if (!this.opEnabled(op)) return false;
    for (const id of this._selection) {
      if (!this.opEnabled(op, id)) return false;
    }
    return true;
  }

  // ─── Derived collections ─────────────────────────────────────────────────
  private getTreeItems(): TreeNode[] {
    // Build a folder-only tree from the flat node list.
    const folders = this._nodes.filter((n) => n.type === 'folder');
    const byParent = new Map<string | null, FileSystemNode[]>();
    for (const f of folders) {
      const list = byParent.get(f.parentId) ?? [];
      list.push(f);
      byParent.set(f.parentId, list);
    }
    const lazyMode = !!this._loadChildren;
    const build = (parentId: string | null): TreeNode[] => {
      const children = byParent.get(parentId);
      if (!children) return [];
      return children.map((node) => {
        const childFolders = build(node.id);
        // In lazy mode, a folder is marked `lazy` until we've successfully
        // loaded its children. Once loaded (or once it has at least one
        // child folder materialised), we treat it as a regular tree node.
        const isLazy = lazyMode && childFolders.length === 0 && !this._loadedFolders.has(node.id);
        return {
          id: node.id,
          label: node.name,
          iconKey: node.iconKey ?? 'folder',
          children: childFolders,
          lazy: isLazy || undefined,
        };
      });
    };
    const root = this._rootFolderId;
    if (root === null) return build(null);
    return build(root);
  }

  /**
   * Bridge `mp-treeview`'s `loadChildren` to the consumer's `loadChildren`
   * callback. Appends new nodes into the WC's local `_nodes` so the tree
   * (and current-folder file list) re-render, then returns the loaded
   * folder children to the treeview's lazy machinery for its own bookkeeping.
   */
  private async loadTreeChildren(parentId: string): Promise<TreeNode[]> {
    if (!this._loadChildren) return [];
    const newNodes = await this._loadChildren(parentId);
    const existing = new Set(this._nodes.map((n) => n.id));
    const additions = newNodes.filter((n) => !existing.has(n.id));
    this._nodes = [...this._nodes, ...additions];
    this._loadedFolders.add(parentId);
    this.requestUpdate();

    this.dispatchEvent(
      new CustomEvent('mp-children-loaded', {
        detail: { parentId, children: newNodes },
        bubbles: true,
        composed: true,
      }),
    );
    return additions
      .filter((n) => n.type === 'folder')
      .map((n) => ({
        id: n.id,
        label: n.name,
        iconKey: n.iconKey ?? 'folder',
        children: [],
        lazy: true,
      }));
  }

  private getCurrentChildren(): FileSystemNode[] {
    const parentId = this._currentFolderId;
    const all = this._nodes.filter((n) => n.parentId === parentId);
    const query = this._searchQuery.trim().toLowerCase();
    const filtered = query ? all.filter((n) => n.name.toLowerCase().includes(query)) : all;
    // Folders first, then files; alphabetical within each.
    return filtered.slice().sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  private getBreadcrumb(): FileSystemNode[] {
    if (this._currentFolderId === null) return [];
    const result: FileSystemNode[] = [];
    let currentId: string | null = this._currentFolderId;
    while (currentId !== null) {
      const node = this._nodes.find((n) => n.id === currentId);
      if (!node) break;
      result.unshift(node);
      currentId = node.parentId;
    }
    return result;
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  override render(): TemplateResult {
    const treeItems = this.getTreeItems();
    const currentChildren = this.getCurrentChildren();
    const breadcrumb = this.getBreadcrumb();

    return html`
      ${this.renderToolbar()}
      ${this.renderBreadcrumb(breadcrumb)}
      <div class="split-area">
        <mp-splitter orientation="horizontal" min-panel-size="120">
          <div class="tree-pane">
            <mp-treeview
              .items=${treeItems}
              .expandedIds=${[...this._expandedTreeIds]}
              .selectedIds=${this._currentFolderId ? [this._currentFolderId] : []}
              .iconResolver=${(key: string, node: TreeNode) => this.resolveIconForTree(key, node)}
              .loadChildren=${this._loadChildren ? (parentId: string) => this.loadTreeChildren(parentId) : undefined}
              hide-borders
              selection-mode="single"
              @tree-node-select=${this.onTreeNodeSelect}
              @tree-node-expand=${this.onTreeNodeExpand}
              @tree-node-collapse=${this.onTreeNodeCollapse}
            ></mp-treeview>
          </div>
          <div
            class="content-pane"
            @dragenter=${this.onDragEnter}
            @dragover=${this.onDragOver}
            @dragleave=${this.onDragLeave}
            @drop=${this.onDrop}
          >
            <div class="content-body">
              ${this._viewMode === 'list'
                ? this.renderListView(currentChildren)
                : this.renderIconGridView(currentChildren)}
            </div>
            <div class="drop-overlay" aria-live="polite" aria-label=${this._messages.fileDropZone}>${this._messages.dropFilesToUpload}</div>
          </div>
        </mp-splitter>
      </div>
      ${this.renderContextMenu()}
    `;
  }

  private renderContextMenu(): TemplateResult {
    const menu = this._contextMenu;
    if (!menu) return html``;
    const m = this._messages;
    const hasSelection = this._selection.size > 0;
    const hasClipboard = this._clipboard !== null;
    return html`
      <ul
        class="context-menu"
        role="menu"
        aria-label="File operations"
        style=${styleMap({ left: `${menu.x}px`, top: `${menu.y}px` })}
        @click=${(ev: MouseEvent) => ev.stopPropagation()}
      >
        ${this.opEnabled('rename')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${this._selection.size !== 1 || !this.opEnabledOnSelection('rename')} @click=${() => { this.closeContextMenu(); this.beginRenameFromToolbar(); }}>${m.rename}</button></li>`
          : nothing}
        ${this.opEnabled('delete')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasSelection || !this.opEnabledOnSelection('delete')} @click=${() => { this.closeContextMenu(); this.deleteSelection(); }}>${m.delete}</button></li>`
          : nothing}
        <li role="separator" class="menu-separator"></li>
        ${this.opEnabled('cut')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasSelection || !this.opEnabledOnSelection('cut')} @click=${() => { this.closeContextMenu(); this.setClipboard('cut'); }}>${m.cut}</button></li>`
          : nothing}
        ${this.opEnabled('copy')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasSelection || !this.opEnabledOnSelection('copy')} @click=${() => { this.closeContextMenu(); this.setClipboard('copy'); }}>${m.copy}</button></li>`
          : nothing}
        ${this.opEnabled('paste')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasClipboard} @click=${() => { this.closeContextMenu(); this.paste(); }}>${m.paste}</button></li>`
          : nothing}
        <li role="separator" class="menu-separator"></li>
        ${this.opEnabled('newFolder')
          ? html`<li role="none"><button class="menu-item" role="menuitem" @click=${() => { this.closeContextMenu(); this.promptNewFolder(); }}>${m.newFolder}</button></li>`
          : nothing}
      </ul>
    `;
  }

  private openContextMenu(targetId: string, x: number, y: number): void {
    if (this._allowOperations === false) return;
    this._contextMenu = { x, y, targetId };
    this.requestUpdate();
    // Close on document click / Escape — wire one-shot listeners.
    void this.updateComplete.then(() => {
      const close = (ev?: Event) => {
        if (ev instanceof KeyboardEvent && ev.key !== 'Escape') return;
        this.closeContextMenu();
        document.removeEventListener('click', close, true);
        document.removeEventListener('contextmenu', close, true);
        document.removeEventListener('keydown', close, true);
      };
      document.addEventListener('click', close, true);
      document.addEventListener('contextmenu', close, true);
      document.addEventListener('keydown', close, true);
    });
  }

  private closeContextMenu(): void {
    if (this._contextMenu) {
      this._contextMenu = null;
      this.requestUpdate();
    }
  }

  private renderToolbar(): TemplateResult {
    const m = this._messages;
    const hasSelection = this._selection.size > 0;
    const hasClipboard = this._clipboard !== null;
    const searchPlaceholder = this._searchPlaceholder || m.searchPlaceholder;
    return html`
      <div class="toolbar" role="toolbar" aria-label=${m.ariaToolbar}>
        ${this.opEnabled('newFolder')
          ? html`<button type="button" @click=${this.promptNewFolder} aria-label=${m.newFolder}>📁 ${m.newFolder}</button>`
          : nothing}
        ${this.opEnabled('rename')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection || this._selection.size !== 1 || !this.opEnabledOnSelection('rename')}
              @click=${this.beginRenameFromToolbar}
              aria-label=${m.rename}
            >✏️ ${m.rename}</button>`
          : nothing}
        ${this.opEnabled('delete')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection || !this.opEnabledOnSelection('delete')}
              @click=${this.deleteSelection}
              aria-label=${m.delete}
            >🗑 ${m.delete}</button>`
          : nothing}
        ${this.opEnabled('cut')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection || !this.opEnabledOnSelection('cut')}
              @click=${() => this.setClipboard('cut')}
              aria-label=${m.cut}
            >✂ ${m.cut}</button>`
          : nothing}
        ${this.opEnabled('copy')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection || !this.opEnabledOnSelection('copy')}
              @click=${() => this.setClipboard('copy')}
              aria-label=${m.copy}
            >📋 ${m.copy}</button>`
          : nothing}
        ${this.opEnabled('paste')
          ? html`<button
              type="button"
              ?disabled=${!hasClipboard}
              @click=${this.paste}
              aria-label=${m.paste}
            >📥 ${m.paste}</button>`
          : nothing}
        ${this._allowUpload && this._isTouchMode
          ? html`<button
              type="button"
              @click=${this.openUploadPicker}
              aria-label=${m.upload}
            >📤 ${m.upload}</button>`
          : nothing}
        <span class="spacer"></span>
        <input
          type="search"
          class="search-input"
          .value=${this._searchQuery}
          placeholder=${searchPlaceholder}
          @input=${(ev: InputEvent) => this.onSearchInput(ev)}
          aria-label=${m.searchPlaceholder}
        />
        <div class="view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            data-active=${this._viewMode === 'list' ? 'true' : 'false'}
            @click=${() => this.setViewMode('list')}
            aria-label=${m.listView}
            aria-pressed=${this._viewMode === 'list'}
          >${unsafeHTML(ICON_SVG_LIST)}</button>
          <button
            type="button"
            data-active=${this._viewMode === 'icons' ? 'true' : 'false'}
            @click=${() => this.setViewMode('icons')}
            aria-label=${m.iconsView}
            aria-pressed=${this._viewMode === 'icons'}
          >${unsafeHTML(ICON_SVG_GRID)}</button>
        </div>
      </div>
    `;
  }

  private renderBreadcrumb(crumbs: FileSystemNode[]): TemplateResult {
    return html`
      <nav class="breadcrumb-bar" aria-label=${this._messages.ariaBreadcrumb}>
        <button
          class="breadcrumb-segment"
          data-current=${crumbs.length === 0 ? 'true' : 'false'}
          aria-current=${crumbs.length === 0 ? 'page' : 'false'}
          @click=${() => this.navigateTo(null)}
          type="button"
        >${this._messages.home}</button>
        ${crumbs.map((node, index) => {
          const isLast = index === crumbs.length - 1;
          return html`
            <span class="breadcrumb-separator" aria-hidden="true">›</span>
            <button
              class="breadcrumb-segment"
              data-current=${isLast ? 'true' : 'false'}
              aria-current=${isLast ? 'page' : 'false'}
              @click=${() => this.navigateTo(node.id)}
              type="button"
            >${node.name}</button>
          `;
        })}
      </nav>
    `;
  }

  private renderListView(children: FileSystemNode[]): TemplateResult {
    const m = this._messages;
    const columns: DatatableColumnDef<FileSystemNode>[] = [
      {
        name: 'name',
        label: m.name,
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => this.renderNameCell(row),
      },
      {
        name: 'size',
        label: m.size,
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => this.formatSize(row),
      },
      {
        name: 'modifiedAt',
        label: m.modified,
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => this.formatDate(row),
      },
      {
        name: 'type',
        label: m.type,
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => (row.type === 'folder' ? m.folder : (row.mimeType ?? m.file)),
      },
    ];

    return html`
      <mp-datatable
        .columns=${columns as DatatableColumnDef[]}
        .data=${children}
        .selectedIds=${[...this._selection]}
        .rowKey=${(row: unknown) => (row as FileSystemNode).id}
        selection-mode=${this._selectionMode}
        resizable-columns
        virtual-scroll
        item-size="40"
        empty-message=${m.noFilesOrFolders}
        @mp-datatable-selection-change=${this.onDatatableSelection}
        @mp-datatable-row-click=${this.onRowClick}
        @mp-datatable-row-dblclick=${this.onRowDblClick}
        @mp-datatable-row-contextmenu=${this.onRowContextMenu}
        @keydown=${this.onContentKeydown}
      ></mp-datatable>
    `;
  }

  private renderNameCell(row: FileSystemNode): TemplateResult {
    const icon = this.resolveIcon(row);
    if (this._renameTarget === row.id) {
      return html`
        <span class="row-cell">
          <span class="row-icon" aria-hidden="true">${icon ? unsafeHTML(icon) : nothing}</span>
          <input
            ${ref(this._renameInputRef)}
            type="text"
            class="rename-input"
            .value=${row.name}
            @click=${(e: Event) => e.stopPropagation()}
            @keydown=${(ev: KeyboardEvent) => this.onRenameKeydown(ev, row)}
            @blur=${(ev: FocusEvent) => this.commitRename(row, (ev.target as HTMLInputElement).value)}
          />
        </span>
      `;
    }
    return html`
      <span class="row-cell">
        <span class="row-icon" aria-hidden="true">${icon ? unsafeHTML(icon) : nothing}</span>
        <span>${row.name}</span>
      </span>
    `;
  }

  private renderIconGridView(children: FileSystemNode[]): TemplateResult {
    return html`
      <div class="icon-grid" role="grid" aria-label="Files and folders" @keydown=${this.onContentKeydown} tabindex="0">
        ${repeat(
          children,
          (node) => node.id,
          (node) => this.renderIconCard(node),
        )}
      </div>
    `;
  }

  private renderIconCard(node: FileSystemNode): TemplateResult {
    const selected = this._selection.has(node.id);
    const cut = this._clipboard?.mode === 'cut' && this._clipboard.ids.includes(node.id);
    const icon = this.resolveIcon(node);
    return html`
      <button
        class="icon-card"
        type="button"
        role="gridcell"
        data-node-id=${node.id}
        data-selected=${selected ? 'true' : 'false'}
        data-cut=${cut ? 'true' : 'false'}
        aria-selected=${selected ? 'true' : 'false'}
        @click=${(ev: MouseEvent) => this.onIconCardClick(node, ev)}
        @dblclick=${() => this.activateNode(node)}
        @contextmenu=${(ev: MouseEvent) => this.onIconCardContextMenu(node, ev)}
      >
        <span class="file-icon" aria-hidden="true">${icon ? unsafeHTML(icon) : nothing}</span>
        <span class="file-name">${node.name}</span>
      </button>
    `;
  }

  // ─── Icon resolution ─────────────────────────────────────────────────────
  private resolveIcon(node: FileSystemNode): string | undefined {
    const key = node.iconKey ?? (node.type === 'folder' ? 'folder' : 'file');
    if (this._iconResolver) {
      const result = this._iconResolver(key, node);
      if (result) return result;
    }
    return node.type === 'folder' ? FOLDER_SVG : FILE_SVG;
  }

  private resolveIconForTree(key: string, treeNode: TreeNode): string | undefined {
    const fsNode = this._nodes.find((n) => n.id === treeNode.id);
    if (this._iconResolver) {
      const result = this._iconResolver(key, fsNode);
      if (result) return result;
    }
    return FOLDER_SVG;
  }

  // ─── Event handlers ──────────────────────────────────────────────────────
  private onTreeNodeSelect = (ev: Event): void => {
    const detail = (ev as CustomEvent<{ node: TreeNode; selectedIds: string[] }>).detail;
    this.navigateTo(detail.node.id);
  };

  private onTreeNodeExpand = (ev: Event): void => {
    const detail = (ev as CustomEvent<{ expandedIds: string[] }>).detail;
    this._expandedTreeIds = new Set(detail.expandedIds);
  };

  private onTreeNodeCollapse = (ev: Event): void => {
    const detail = (ev as CustomEvent<{ expandedIds: string[] }>).detail;
    this._expandedTreeIds = new Set(detail.expandedIds);
  };

  private onDatatableSelection = (ev: Event): void => {
    const detail = (ev as CustomEvent<DatatableSelectionEvent>).detail;
    this._selection = new Set(detail.selectedIds);
    this.emitSelectionChange();
    this.requestUpdate();
  };

  private onRowClick = (ev: Event): void => {
    const detail = (ev as CustomEvent<RowEventDetail<FileSystemNode>>).detail;
    // Selection is already handled by the datatable; we only re-emit at the file-manager level.
    this.emitSelectionChange();
  };

  private onRowDblClick = (ev: Event): void => {
    const detail = (ev as CustomEvent<RowEventDetail<FileSystemNode>>).detail;
    this.activateNode(detail.row);
  };

  private onRowContextMenu = (ev: Event): void => {
    const detail = (ev as CustomEvent<RowEventDetail<FileSystemNode>>).detail;
    const original = detail.originalEvent as MouseEvent;
    original.preventDefault();
    this.openContextMenu(detail.rowKey, original.clientX, original.clientY);
  };

  private onIconCardContextMenu(node: FileSystemNode, ev: MouseEvent): void {
    ev.preventDefault();
    if (this._selectionMode !== 'none' && !this._selection.has(node.id)) {
      this._selection = new Set([node.id]);
      this.emitSelectionChange();
    }
    this.openContextMenu(node.id, ev.clientX, ev.clientY);
  }

  private onIconCardClick(node: FileSystemNode, ev: MouseEvent): void {
    if (this._selectionMode === 'none') return;
    if (this._selectionMode === 'multiple' && (ev.ctrlKey || ev.metaKey)) {
      if (this._selection.has(node.id)) this._selection.delete(node.id);
      else this._selection.add(node.id);
    } else if (this._selectionMode === 'multiple' && ev.shiftKey && this._selection.size > 0) {
      const children = this.getCurrentChildren();
      const lastSelected = [...this._selection][this._selection.size - 1];
      const fromIdx = children.findIndex((c) => c.id === lastSelected);
      const toIdx = children.findIndex((c) => c.id === node.id);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        for (let i = lo; i <= hi; i++) this._selection.add(children[i].id);
      }
    } else {
      this._selection = new Set([node.id]);
    }
    this.emitSelectionChange();
    this.requestUpdate();
  }

  private activateNode(node: FileSystemNode): void {
    if (node.type === 'folder') {
      this.navigateTo(node.id);
    } else {
      this.dispatchEvent(
        new CustomEvent<NodeOpenEventDetail>('mp-node-open', {
          detail: { node },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private onSearchInput(ev: InputEvent): void {
    this._searchQuery = (ev.target as HTMLInputElement).value;
    this.requestUpdate();
  }

  private setViewMode(mode: FileManagerViewMode): void {
    this.viewMode = mode;
  }

  private onContentKeydown = (ev: KeyboardEvent): void => {
    if ((ev.key === 'ContextMenu' || (ev.key === 'F10' && ev.shiftKey)) && this._selection.size > 0) {
      ev.preventDefault();
      const target = ev.target as HTMLElement | null;
      const rect = target?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : 100;
      const y = rect ? rect.bottom : 100;
      const [first] = this._selection;
      this.openContextMenu(first, x, y);
      return;
    }
    if (ev.key === 'Delete' && this._selection.size > 0 && this.opEnabled('delete')) {
      ev.preventDefault();
      this.deleteSelection();
      return;
    }
    if (ev.key === 'F2' && this._selection.size === 1 && this.opEnabled('rename')) {
      ev.preventDefault();
      this.beginRenameFromToolbar();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'x' && this._selection.size > 0 && this.opEnabled('cut')) {
      ev.preventDefault();
      this.setClipboard('cut');
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'c' && this._selection.size > 0 && this.opEnabled('copy')) {
      ev.preventDefault();
      this.setClipboard('copy');
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'v' && this._clipboard && this.opEnabled('paste')) {
      ev.preventDefault();
      this.paste();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && (ev.key === 'N' || ev.key === 'n') && this.opEnabled('newFolder')) {
      ev.preventDefault();
      this.promptNewFolder();
      return;
    }
  };

  // ─── Navigation ─────────────────────────────────────────────────────────
  private navigateTo(folderId: string | null): void {
    if (folderId !== null) {
      const target = this._nodes.find((n) => n.id === folderId);
      if (!target || target.type !== 'folder') return;
      // Auto-expand all ancestors in the tree.
      let cursor: string | null = target.parentId;
      while (cursor !== null) {
        this._expandedTreeIds.add(cursor);
        const parentNode = this._nodes.find((n) => n.id === cursor);
        cursor = parentNode?.parentId ?? null;
      }
      this._expandedTreeIds.add(folderId);
    }
    if (this._currentFolderId === folderId) return;
    this._currentFolderId = folderId;
    const hadSelection = this._selection.size > 0;
    this._selection.clear();
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<NavigateEventDetail>('mp-navigate', {
        detail: { folderId },
        bubbles: true,
        composed: true,
      }),
    );
    // Selection is folder-scoped — when the folder changes, surfacing the
    // implicit clear via the same event consumers subscribe to keeps the
    // Angular wrapper's `selectedIds` model (and any external listener)
    // in sync with the WC's internal state.
    if (hadSelection) this.emitSelectionChange();
  }

  // ─── Operations ─────────────────────────────────────────────────────────
  private promptNewFolder = async (): Promise<void> => {
    if (!this.opEnabled('newFolder')) return;
    const m = this._messages;
    const answer = await this.invokeDialog({
      kind: 'prompt',
      label: m.folderNamePrompt,
      defaultValue: m.defaultNewFolderName,
    });
    if (typeof answer !== 'string' || !answer.trim()) return;
    this.dispatchEvent(
      new CustomEvent<OperationEventDetail>('mp-operation', {
        detail: { kind: 'new-folder', parentId: this._currentFolderId, name: answer.trim() },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private async invokeDialog(
    request:
      | { kind: 'confirm'; message: string }
      | { kind: 'prompt'; label: string; defaultValue?: string },
  ): Promise<string | boolean | null> {
    if (this._dialogResolver) {
      return this._dialogResolver(request);
    }
    if (request.kind === 'confirm') return window.confirm(request.message);
    return window.prompt(request.label, request.defaultValue ?? '');
  }

  private beginRenameFromToolbar = (): void => {
    if (this._selection.size !== 1) return;
    const [id] = this._selection;
    this._renameTarget = id;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const input = this._renameInputRef.value;
      if (input) {
        input.focus();
        input.select();
      }
    });
  };

  private commitRename(row: FileSystemNode, newName: string): void {
    if (this._renameTarget !== row.id) return;
    const trimmed = newName.trim();
    this._renameTarget = null;
    this.requestUpdate();
    if (!trimmed || trimmed === row.name) return;
    this.dispatchEvent(
      new CustomEvent<OperationEventDetail>('mp-operation', {
        detail: { kind: 'rename', nodeId: row.id, previousName: row.name, newName: trimmed },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRenameKeydown(ev: KeyboardEvent, row: FileSystemNode): void {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const value = (ev.target as HTMLInputElement).value;
      this.commitRename(row, value);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      this._renameTarget = null;
      this.requestUpdate();
    } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.stopPropagation();
    }
  }

  private deleteSelection = async (): Promise<void> => {
    if (this._selection.size === 0 || !this.opEnabledOnSelection('delete')) return;
    const confirmed = await this.invokeDialog({
      kind: 'confirm',
      message: this._messages.deleteConfirm(this._selection.size),
    });
    if (!confirmed) return;
    const ids = [...this._selection];
    this._selection.clear();
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<OperationEventDetail>('mp-operation', {
        detail: { kind: 'delete', nodeIds: ids },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private setClipboard(mode: 'cut' | 'copy'): void {
    if (this._selection.size === 0) return;
    this._clipboard = { mode, ids: [...this._selection] };
    this.requestUpdate();
  }

  private paste = async (): Promise<void> => {
    if (!this._clipboard || !this.opEnabled('paste')) return;
    const { mode, ids } = this._clipboard;
    // If a conflictResolver is wired, ask the consumer how to handle each conflict.
    const conflicts = await this.resolveConflictsForPaste(ids, this._currentFolderId);
    if (conflicts === null) return; // resolver indicated abort

    this.dispatchEvent(
      new CustomEvent<OperationEventDetail>('mp-operation', {
        detail: {
          kind: 'paste',
          mode,
          sourceIds: ids,
          targetFolderId: this._currentFolderId,
          conflicts,
        },
        bubbles: true,
        composed: true,
      }),
    );
    if (mode === 'cut') {
      this._clipboard = null;
    }
    this.requestUpdate();
  };

  /**
   * For every source node whose name already exists in the target folder,
   * consult the conflictResolver. Returns a map of sourceId → resolution
   * (action + optional newName). Returns `null` if any resolver returned
   * abort. When no resolver is wired, returns an empty record (the
   * consumer's paste handler is expected to overwrite-by-default).
   */
  private async resolveConflictsForPaste(
    sourceIds: ReadonlyArray<string>,
    targetFolderId: string | null,
  ): Promise<Record<string, { action: 'replace' | 'skip' | 'rename'; newName?: string }> | null> {
    if (!this._conflictResolver) return {};
    const result: Record<string, { action: 'replace' | 'skip' | 'rename'; newName?: string }> = {};
    const targetChildren = this._nodes.filter((n) => n.parentId === targetFolderId);
    for (const id of sourceIds) {
      const src = this._nodes.find((n) => n.id === id);
      if (!src) continue;
      const existing = targetChildren.find((n) => n.name === src.name && n.id !== id);
      if (!existing) continue;
      const decision = await this._conflictResolver({
        existingNode: existing,
        incomingName: src.name,
        mode: 'paste',
      });
      result[id] = decision;
    }
    return result;
  }

  // ─── Drag & drop ────────────────────────────────────────────────────────
  private onDragEnter = (ev: DragEvent): void => {
    if (!this._allowUpload) return;
    if (!ev.dataTransfer || !ev.dataTransfer.types.includes('Files')) return;
    ev.preventDefault();
    this._dragDepth++;
    if (this._dragDepth === 1) this.setAttribute('drop-active', '');
  };

  private onDragOver = (ev: DragEvent): void => {
    if (!this._allowUpload) return;
    if (!ev.dataTransfer || !ev.dataTransfer.types.includes('Files')) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
  };

  private onDragLeave = (ev: DragEvent): void => {
    if (!this._allowUpload) return;
    this._dragDepth = Math.max(0, this._dragDepth - 1);
    if (this._dragDepth === 0) this.removeAttribute('drop-active');
  };

  private onDrop = (ev: DragEvent): void => {
    if (!this._allowUpload) return;
    if (!ev.dataTransfer) return;
    ev.preventDefault();
    this._dragDepth = 0;
    this.removeAttribute('drop-active');
    if (this._isTouchMode) return; // OS file-drop ignored on touch
    const files = Array.from(ev.dataTransfer.files ?? []);
    if (files.length === 0) return;
    this.handleFiles(files);
  };

  /**
   * Common entry point for file-upload requests from either the drag-drop
   * overlay or the touch upload picker. Resolves conflicts against the
   * target folder, registers `UploadEntry` records in `uploads`, and
   * emits `mp-upload-request` with one resolved file per kept entry.
   */
  private async handleFiles(files: File[]): Promise<void> {
    const targetFolderId = this._currentFolderId;

    // Resolve conflicts against the target folder.
    const targetChildren = this._nodes.filter((n) => n.parentId === targetFolderId);
    const kept: { file: File; entryId: string; conflict?: 'replace' | 'rename'; renamedTo?: string }[] = [];
    for (const file of files) {
      const existing = targetChildren.find((n) => n.name === file.name);
      if (existing && this._conflictResolver) {
        const decision = await this._conflictResolver({
          existingNode: existing,
          incomingName: file.name,
          mode: 'upload',
        });
        if (decision.action === 'skip') continue;
        kept.push({
          file,
          entryId: this.makeUploadId(),
          conflict: decision.action,
          renamedTo: decision.newName,
        });
      } else {
        kept.push({ file, entryId: this.makeUploadId() });
      }
    }

    if (kept.length === 0) return;

    // Register UploadEntry records so consumers can render progress UIs.
    const newEntries: UploadEntry[] = kept.map((k) => ({
      id: k.entryId,
      file: k.file,
      targetFolderId,
      progress: 0,
      status: 'pending',
    }));
    this._uploads = [...this._uploads, ...newEntries];
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<UploadRequestEventDetail>('mp-upload-request', {
        detail: {
          files: kept.map((k) => k.file),
          targetFolderId,
          uploads: newEntries,
          conflictResolutions: kept
            .filter((k) => k.conflict)
            .map((k) => ({ fileName: k.file.name, action: k.conflict!, newName: k.renamedTo })),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private makeUploadId(): string {
    return `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────
  private pruneSelection(): void {
    const valid = new Set(this._nodes.map((n) => n.id));
    let mutated = false;
    for (const id of this._selection) {
      if (!valid.has(id)) {
        this._selection.delete(id);
        mutated = true;
      }
    }
    if (mutated) this.emitSelectionChange();
  }

  private emitSelectionChange(): void {
    this.dispatchEvent(
      new CustomEvent<SelectionChangeEventDetail>('mp-selection-change', {
        detail: { selectedIds: [...this._selection] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private formatSize(row: FileSystemNode): string {
    if (row.type === 'folder' || row.size == null) return '—';
    const bytes = row.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  private formatDate(row: FileSystemNode): string {
    if (!row.modifiedAt) return '—';
    try {
      const d = new Date(row.modifiedAt);
      return d.toLocaleDateString();
    } catch {
      return row.modifiedAt;
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-file-manager')) {
  customElements.define('mp-file-manager', MpFileManager);
}

import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';

// Side-effect imports: register the composed elements.
import '@mintplayer/ng-bootstrap/web-components/splitter';
import '@mintplayer/ng-bootstrap/web-components/treeview';
import '@mintplayer/ng-bootstrap/web-components/datatable';

import type { TreeNode } from '@mintplayer/ng-bootstrap/web-components/treeview';
import type {
  DatatableColumnDef,
  RowEventDetail,
  SelectionChangeEventDetail as DatatableSelectionEvent,
} from '@mintplayer/ng-bootstrap/web-components/datatable';

import { fileManagerStyles } from '../styles';
import type { FileSystemNode } from '../types';

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
}

export type OperationEventDetail =
  | { kind: 'rename'; nodeId: string; previousName: string; newName: string }
  | { kind: 'delete'; nodeIds: string[] }
  | { kind: 'new-folder'; parentId: string | null; name: string }
  | { kind: 'paste'; mode: 'cut' | 'copy'; sourceIds: string[]; targetFolderId: string | null };

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
  private _searchPlaceholder = 'Search…';
  private _iconResolver: ((iconKey: string, node?: FileSystemNode) => string | undefined) | undefined;

  // Internal state
  private _selection: Set<string> = new Set();
  private _expandedTreeIds: Set<string> = new Set();
  private _clipboard: { mode: 'cut' | 'copy'; ids: string[] } | null = null;
  private _searchQuery = '';
  private _renameTarget: string | null = null;
  private _renameInputRef: Ref<HTMLInputElement> = createRef();
  private _dragDepth = 0;
  private _contextMenu: { x: number; y: number; targetId: string } | null = null;

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
      this.setAttribute('aria-label', 'File manager');
    }
  }

  // ─── Operation flags helper ─────────────────────────────────────────────
  private opEnabled(op: keyof OperationFlags): boolean {
    if (this._allowOperations === false) return false;
    if (this._allowOperations === true) return true;
    const flags = this._allowOperations as OperationFlags;
    return flags[op] !== false;
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
    const build = (parentId: string | null): TreeNode[] => {
      const children = byParent.get(parentId);
      if (!children) return [];
      return children.map((node) => ({
        id: node.id,
        label: node.name,
        iconKey: node.iconKey ?? 'folder',
        children: build(node.id),
      }));
    };
    const root = this._rootFolderId;
    if (root === null) return build(null);
    return build(root);
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
            <div class="drop-overlay" aria-live="polite">↓ Drop files to upload ↓</div>
          </div>
        </mp-splitter>
      </div>
      ${this.renderContextMenu()}
    `;
  }

  private renderContextMenu(): TemplateResult {
    const menu = this._contextMenu;
    if (!menu) return html``;
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
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${this._selection.size !== 1} @click=${() => { this.closeContextMenu(); this.beginRenameFromToolbar(); }}>Rename</button></li>`
          : nothing}
        ${this.opEnabled('delete')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasSelection} @click=${() => { this.closeContextMenu(); this.deleteSelection(); }}>Delete</button></li>`
          : nothing}
        <li role="separator" class="menu-separator"></li>
        ${this.opEnabled('cut')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasSelection} @click=${() => { this.closeContextMenu(); this.setClipboard('cut'); }}>Cut</button></li>`
          : nothing}
        ${this.opEnabled('copy')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasSelection} @click=${() => { this.closeContextMenu(); this.setClipboard('copy'); }}>Copy</button></li>`
          : nothing}
        ${this.opEnabled('paste')
          ? html`<li role="none"><button class="menu-item" role="menuitem" ?disabled=${!hasClipboard} @click=${() => { this.closeContextMenu(); this.paste(); }}>Paste</button></li>`
          : nothing}
        <li role="separator" class="menu-separator"></li>
        ${this.opEnabled('newFolder')
          ? html`<li role="none"><button class="menu-item" role="menuitem" @click=${() => { this.closeContextMenu(); this.promptNewFolder(); }}>New folder</button></li>`
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
    const hasSelection = this._selection.size > 0;
    const hasClipboard = this._clipboard !== null;
    return html`
      <div class="toolbar" role="toolbar" aria-label="File manager toolbar">
        ${this.opEnabled('newFolder')
          ? html`<button type="button" @click=${this.promptNewFolder} aria-label="New folder">📁 New folder</button>`
          : nothing}
        ${this.opEnabled('rename')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection || this._selection.size !== 1}
              @click=${this.beginRenameFromToolbar}
              aria-label="Rename"
            >✏️ Rename</button>`
          : nothing}
        ${this.opEnabled('delete')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection}
              @click=${this.deleteSelection}
              aria-label="Delete"
            >🗑 Delete</button>`
          : nothing}
        ${this.opEnabled('cut')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection}
              @click=${() => this.setClipboard('cut')}
              aria-label="Cut"
            >✂ Cut</button>`
          : nothing}
        ${this.opEnabled('copy')
          ? html`<button
              type="button"
              ?disabled=${!hasSelection}
              @click=${() => this.setClipboard('copy')}
              aria-label="Copy"
            >📋 Copy</button>`
          : nothing}
        ${this.opEnabled('paste')
          ? html`<button
              type="button"
              ?disabled=${!hasClipboard}
              @click=${this.paste}
              aria-label="Paste"
            >📥 Paste</button>`
          : nothing}
        <span class="spacer"></span>
        <input
          type="search"
          class="search-input"
          .value=${this._searchQuery}
          placeholder=${this._searchPlaceholder}
          @input=${(ev: InputEvent) => this.onSearchInput(ev)}
          aria-label="Search files and folders"
        />
        <div class="view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            data-active=${this._viewMode === 'list' ? 'true' : 'false'}
            @click=${() => this.setViewMode('list')}
            aria-label="List view"
            aria-pressed=${this._viewMode === 'list'}
          >${unsafeHTML(ICON_SVG_LIST)}</button>
          <button
            type="button"
            data-active=${this._viewMode === 'icons' ? 'true' : 'false'}
            @click=${() => this.setViewMode('icons')}
            aria-label="Icons view"
            aria-pressed=${this._viewMode === 'icons'}
          >${unsafeHTML(ICON_SVG_GRID)}</button>
        </div>
      </div>
    `;
  }

  private renderBreadcrumb(crumbs: FileSystemNode[]): TemplateResult {
    return html`
      <nav class="breadcrumb-bar" aria-label="Breadcrumb">
        <button
          class="breadcrumb-segment"
          data-current=${crumbs.length === 0 ? 'true' : 'false'}
          aria-current=${crumbs.length === 0 ? 'page' : 'false'}
          @click=${() => this.navigateTo(null)}
          type="button"
        >Home</button>
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
    const columns: DatatableColumnDef<FileSystemNode>[] = [
      {
        name: 'name',
        label: 'Name',
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => this.renderNameCell(row),
      },
      {
        name: 'size',
        label: 'Size',
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => this.formatSize(row),
      },
      {
        name: 'modifiedAt',
        label: 'Modified',
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => this.formatDate(row),
      },
      {
        name: 'type',
        label: 'Type',
        sortable: true,
        cellClass: 'text-nowrap',
        cellRenderer: (row) => (row.type === 'folder' ? 'Folder' : (row.mimeType ?? 'File')),
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
        empty-message="No files or folders"
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
    this._selection.clear();
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<NavigateEventDetail>('mp-navigate', {
        detail: { folderId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ─── Operations ─────────────────────────────────────────────────────────
  private promptNewFolder = (): void => {
    if (!this.opEnabled('newFolder')) return;
    const name = window.prompt('Folder name', 'New folder');
    if (!name) return;
    this.dispatchEvent(
      new CustomEvent<OperationEventDetail>('mp-operation', {
        detail: { kind: 'new-folder', parentId: this._currentFolderId, name },
        bubbles: true,
        composed: true,
      }),
    );
  };

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

  private deleteSelection = (): void => {
    if (this._selection.size === 0 || !this.opEnabled('delete')) return;
    if (!window.confirm(`Delete ${this._selection.size} item(s)?`)) return;
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

  private paste = (): void => {
    if (!this._clipboard || !this.opEnabled('paste')) return;
    const { mode, ids } = this._clipboard;
    this.dispatchEvent(
      new CustomEvent<OperationEventDetail>('mp-operation', {
        detail: { kind: 'paste', mode, sourceIds: ids, targetFolderId: this._currentFolderId },
        bubbles: true,
        composed: true,
      }),
    );
    if (mode === 'cut') {
      this._clipboard = null;
    }
    this.requestUpdate();
  };

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
    const files = Array.from(ev.dataTransfer.files ?? []);
    if (files.length === 0) return;
    this.dispatchEvent(
      new CustomEvent<UploadRequestEventDetail>('mp-upload-request', {
        detail: { files, targetFolderId: this._currentFolderId },
        bubbles: true,
        composed: true,
      }),
    );
  };

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

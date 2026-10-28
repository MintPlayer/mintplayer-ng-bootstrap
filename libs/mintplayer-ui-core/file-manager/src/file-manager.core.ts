import { Announcer } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreApi, type ModelBinding } from '@mintplayer/ui-core/component';
import type { RowEventDetail, SortColumn } from '@mintplayer/ui-core/datatable';
import { rovingTarget } from '@mintplayer/ui-core/roving';
import type { TreeNode } from '@mintplayer/ui-core/tree';
import type { TreeChildrenLoader, TreeNodeSelectEventDetail } from '@mintplayer/ui-core/treeview';
import {
  connectFileManager,
  folderEntries,
  folderTree,
  mergeMessages,
  mergeNodes,
  opEnabled,
  opEnabledOnAll,
  parseFileManagerSelectionMode,
  parseFileManagerViewMode,
  pathTo,
  type ChildrenLoadedEventDetail,
  type ConflictDecision,
  type ConflictResolver,
  type DialogResolver,
  type FileManagerChildrenLoader,
  type FileManagerErrorEventDetail,
  type FileManagerIconResolver,
  type FileManagerMessages,
  type FileManagerSelectionEventDetail,
  type FileManagerSelectionMode,
  type FileManagerView,
  type FileManagerViewMode,
  type FileSystemNode,
  type NavigateEventDetail,
  type NodeOpenEventDetail,
  type OperationEventDetail,
  type OperationFlags,
  type OperationKind,
  type UploadEntry,
  type UploadRequestEventDetail,
} from './file-manager';

/**
 * The file manager's core (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `file-manager.component.ts` is their manifest
 * and `templates/file-manager.view.vue` their markup, which composes the
 * splitter, the treeview and the datatable.
 *
 * The native controls (toolbar, breadcrumb, icon cards, context menu, search,
 * drop zone) are wired by delegation on the root; the composed children talk
 * back through the handlers and model bindings the view hands them.
 */
export interface FileManagerInputs {
  nodes: readonly FileSystemNode[];
  /** Shows only this folder's subtree in the tree; null shows every root. */
  rootFolderId: string | null;
  /** The open folder. Two-way. */
  currentFolderId: string | null;
  allowUpload: boolean;
  /** `true` allows every operation; flags allow or refuse each one. Per-node flags win. */
  allowOperations: boolean | OperationFlags;
  /** Two-way. */
  viewMode: FileManagerViewMode;
  selectionMode: FileManagerSelectionMode;
  /** Two-way. */
  selectedIds: readonly string[];
  /** Falls back to the localized `messages.searchPlaceholder`. */
  searchPlaceholder: string | null;
  iconResolver?: FileManagerIconResolver | null;
  messages?: Partial<FileManagerMessages> | null;
  dialogResolver?: DialogResolver | null;
  conflictResolver?: ConflictResolver | null;
  loadChildren?: FileManagerChildrenLoader | null;
  /** Requested uploads and their progress. Two-way: the component adds them, `reportUploadProgress` moves them. */
  uploads: readonly UploadEntry[];
  /** Nodes with an operation in flight, by id. Two-way: `markPending` / `clearPending`. */
  pending: Readonly<Record<string, OperationKind>>;
}

export interface FileManagerState {
  currentFolderId: string | null;
  selectedIds: readonly string[];
  viewMode: FileManagerViewMode;
  uploads: readonly UploadEntry[];
  pending: Readonly<Record<string, OperationKind>>;
  expandedTreeIds: readonly string[];
  clipboard: { readonly mode: 'cut' | 'copy'; readonly ids: readonly string[] } | null;
  searchQuery: string;
  sortColumns: readonly SortColumn[];
  iconFocusId: string | null;
  renameTarget: string | null;
  dropActive: boolean;
  contextMenu: { readonly x: number; readonly y: number; readonly targetId: string } | null;
  touchMode: boolean;
  /** Children a lazy load added, until the consumer's `nodes` change. */
  loaded: readonly FileSystemNode[];
  loadedFolders: readonly string[];
  announcement: string;
  alert: string;
}

export interface FileManagerEvents {
  navigate: NavigateEventDetail;
  nodeOpen: NodeOpenEventDetail;
  selectionChanged: FileManagerSelectionEventDetail;
  uploadRequest: UploadRequestEventDetail;
  operation: OperationEventDetail;
  errorReported: FileManagerErrorEventDetail;
  childrenLoaded: ChildrenLoadedEventDetail;
  currentFolderIdChange: string | null;
  selectedIdsChange: string[];
  viewModeChange: FileManagerViewMode;
  uploadsChange: UploadEntry[];
  pendingChange: Record<string, OperationKind>;
}

export interface FileManagerMethods {
  /** Marks a node busy while the consumer's backend works on it. */
  markPending(nodeId: string, op: OperationKind): void;
  clearPending(nodeId: string): void;
  /** Fires `errorReported`, for the consumer's toast bus. */
  reportError(message: string, nodeId?: string): void;
  /** Moves an upload's progress; a change to `done` or `error` is announced (failure assertively). */
  reportUploadProgress(uploadId: string, progress: number, status?: UploadEntry['status'], error?: string): void;
  clearUpload(uploadId: string): void;
}

/** What the template binds: the bags plus the composed children's handlers. */
export interface FileManagerTemplateView extends FileManagerView {
  readonly touchMode: boolean;
  readonly announcement: string;
  readonly alertText: string;
  readonly selectionMode: FileManagerSelectionMode;
  readonly data: FileSystemNode[];
  readonly selection: ModelBinding<string[]>;
  readonly sort: ModelBinding<SortColumn[]>;
  readonly treeExpanded: ModelBinding<readonly string[]>;
  readonly treeLoad: TreeChildrenLoader | null;
  readonly onTreeSelect: (detail: TreeNodeSelectEventDetail) => void;
  readonly onRowDblClick: (detail: RowEventDetail) => void;
  readonly onRowContextMenu: (detail: RowEventDetail) => void;
}

type Api = CoreApi<FileManagerInputs, FileManagerState, FileManagerEvents>;

/** The attached behaviour the view's handlers and the methods reach through the host. */
interface Engine {
  setSelection(ids: readonly string[]): void;
  setExpanded(ids: readonly string[]): void;
  navigateTo(folderId: string | null): void;
  loadTree(parentId: string): Promise<TreeNode[]>;
  activate(node: FileSystemNode): void;
  contextMenuAt(nodeId: string, x: number, y: number): void;
  announce(text: string, assertive?: boolean): void;
}

const engines = new WeakMap<HTMLElement, Engine>();
const engineOf = (api: Api | null): Engine | undefined => (api ? engines.get(api.host) : undefined);

/** A one-slot memo: the last result while every argument is the same object. */
function memoLast<A extends readonly unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; result: R } | null = null;
  return (...args: A) => {
    if (last && last.args.length === args.length && last.args.every((a, i) => Object.is(a, args[i]))) return last.result;
    const result = fn(...args);
    last = { args, result };
    return result;
  };
}

// The datatable re-reads its rows when `data` is a new array; the tree its items.
const entriesOf = memoLast(folderEntries);
const treeOf = memoLast(folderTree);
const nodesOf = memoLast(mergeNodes);

const NODE_ELEMENT = '[data-node-id], tr[data-row-key]';
const TOUCH_HOLD_MS = 600;
const SEARCH_ANNOUNCE_MS = 500;

const isEditable = (el: EventTarget | null): boolean => el instanceof Element && !!el.closest('input, textarea, select, [contenteditable]');

function attachFileManager(api: Api): () => void {
  const host = api.host;
  const doc = host.ownerDocument;
  const inputs = () => api.inputs();
  const state = () => api.state();
  const messages = () => mergeMessages(inputs().messages);
  const allNodes = () => nodesOf(inputs().nodes ?? [], state().loaded);
  const nodeById = (id: string) => allNodes().find((n) => n.id === id);
  const mode = () => parseFileManagerSelectionMode(inputs().selectionMode);
  const allow = () => inputs().allowOperations ?? true;
  const selectedNodes = () => state().selectedIds.map(nodeById);
  const entries = () => entriesOf(allNodes(), state().currentFolderId, state().searchQuery, state().sortColumns);

  const polite = new Announcer();
  const assertive = new Announcer({ politeness: 'assertive' });
  const unsubscribes = [
    polite.subscribe((s) => api.setState({ announcement: s.text })),
    assertive.subscribe((s) => api.setState({ alert: s.text })),
  ];

  let disposed = false;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let dragDepth = 0;
  let menuReturn: HTMLElement | null = null;
  let menuCleanup: (() => void) | null = null;

  /** Act on an element once the front has rendered it (it renders asynchronously in some fronts). */
  const whenRendered = (selector: string, act: (el: HTMLElement) => void, frames = 6): void => {
    const el = host.querySelector<HTMLElement>(selector);
    if (el) act(el);
    else if (!disposed && frames > 0 && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => whenRendered(selector, act, frames - 1));
    }
  };

  const setSelection = (ids: readonly string[]) => {
    api.setState({ selectedIds: ids });
    api.emit('selectedIdsChange', [...ids]);
    api.emit('selectionChanged', { selectedIds: [...ids] });
  };

  const setExpanded = (ids: readonly string[]) => api.setState({ expandedTreeIds: ids });

  const navigateTo = (folderId: string | null) => {
    if (folderId !== null) {
      const target = nodeById(folderId);
      if (!target || target.type !== 'folder') return;
      // The folder and its ancestors open in the tree.
      const path = pathTo(allNodes(), folderId).map((n) => n.id);
      const expanded = state().expandedTreeIds;
      setExpanded([...expanded, ...path.filter((id) => !expanded.includes(id))]);
    }
    if (state().currentFolderId === folderId) return;
    const hadSelection = state().selectedIds.length > 0;
    api.setState({ currentFolderId: folderId, selectedIds: [], renameTarget: null, iconFocusId: null });
    api.emit('currentFolderIdChange', folderId);
    api.emit('navigate', { folderId });
    // Selection is per folder: report the implicit clear like any other change.
    if (hadSelection) {
      api.emit('selectedIdsChange', []);
      api.emit('selectionChanged', { selectedIds: [] });
    }
  };

  const activate = (node: FileSystemNode) => {
    if (node.type === 'folder') navigateTo(node.id);
    else api.emit('nodeOpen', { node });
  };

  const loadTree = async (parentId: string): Promise<TreeNode[]> => {
    const loader = inputs().loadChildren;
    if (!loader) return [];
    const children = await loader(parentId);
    if (disposed) return [];
    const known = new Set(allNodes().map((n) => n.id));
    const additions = children.filter((n) => !known.has(n.id));
    api.setState({ loaded: [...state().loaded, ...additions], loadedFolders: [...state().loadedFolders, parentId] });
    api.emit('childrenLoaded', { parentId, children });
    return folderTree(additions, parentId, true, []);
  };

  const announce = (text: string, loud = false) => (loud ? assertive : polite).announce(text);

  const dialog = (request: Parameters<DialogResolver>[0]): Promise<string | boolean | null> => {
    const resolver = inputs().dialogResolver;
    if (resolver) return resolver(request);
    const win = doc.defaultView;
    return Promise.resolve(request.kind === 'confirm' ? !!win?.confirm(request.message) : (win?.prompt(request.label, request.defaultValue ?? '') ?? null));
  };

  // ─── Commands ─────────────────────────────────────────────────────────────

  const promptNewFolder = async () => {
    if (!opEnabled(allow(), 'newFolder')) return;
    const m = messages();
    const answer = await dialog({ kind: 'prompt', label: m.folderNamePrompt, defaultValue: m.defaultNewFolderName });
    const name = typeof answer === 'string' ? answer.trim() : '';
    if (!name || disposed) return;
    announce(m.announceNewFolder(name));
    api.emit('operation', { kind: 'new-folder', parentId: state().currentFolderId, name });
  };

  const beginRename = () => {
    const [id] = state().selectedIds;
    if (state().selectedIds.length !== 1 || !opEnabledOnAll(allow(), 'rename', selectedNodes())) return;
    api.setState({ renameTarget: id });
    whenRendered('.rename-input', (input) => {
      input.focus();
      (input as HTMLInputElement).select();
    });
  };

  const commitRename = (id: string, value: string) => {
    if (state().renameTarget !== id) return;
    api.setState({ renameTarget: null });
    const node = nodeById(id);
    const name = value.trim();
    if (!node || !name || name === node.name) return;
    announce(messages().announceRenamed(node.name, name));
    api.emit('operation', { kind: 'rename', nodeId: id, previousName: node.name, newName: name });
  };

  const deleteSelection = async () => {
    const ids = state().selectedIds;
    if (ids.length === 0 || !opEnabledOnAll(allow(), 'delete', selectedNodes())) return;
    const confirmed = await dialog({ kind: 'confirm', message: messages().deleteConfirm(ids.length) });
    if (!confirmed || disposed) return;
    setSelection([]);
    announce(messages().announceDeleted(ids.length));
    api.emit('operation', { kind: 'delete', nodeIds: [...ids] });
  };

  const setClipboard = (clipMode: 'cut' | 'copy') => {
    const ids = state().selectedIds;
    if (ids.length === 0 || !opEnabledOnAll(allow(), clipMode, selectedNodes())) return;
    api.setState({ clipboard: { mode: clipMode, ids } });
  };

  /** By source id, how each same-name clash in the target resolves; empty without a resolver. */
  const pasteConflicts = async (ids: readonly string[], target: string | null): Promise<Record<string, ConflictDecision>> => {
    const resolver = inputs().conflictResolver;
    if (!resolver) return {};
    const siblings = allNodes().filter((n) => n.parentId === target);
    const clashes = ids
      .map((id) => nodeById(id))
      .filter((src): src is FileSystemNode => !!src)
      .map((src) => ({ src, existing: siblings.find((n) => n.name === src.name && n.id !== src.id) }))
      .filter((c): c is { src: FileSystemNode; existing: FileSystemNode } => !!c.existing);
    // One question at a time: the consumer's dialog asks them in order.
    return clashes.reduce<Promise<Record<string, ConflictDecision>>>(
      async (acc, { src, existing }) => ({ ...(await acc), [src.id]: await resolver({ existingNode: existing, incomingName: src.name, mode: 'paste' }) }),
      Promise.resolve({}),
    );
  };

  const paste = async () => {
    const clip = state().clipboard;
    if (!clip || !opEnabled(allow(), 'paste')) return;
    const target = state().currentFolderId;
    const conflicts = await pasteConflicts(clip.ids, target);
    if (disposed) return;
    announce(messages().announcePasted(clip.ids.length));
    api.emit('operation', { kind: 'paste', mode: clip.mode, sourceIds: [...clip.ids], targetFolderId: target, conflicts });
    if (clip.mode === 'cut') api.setState({ clipboard: null });
  };

  let uploadCounter = 0;
  const uploadId = () => `upload-${Date.now().toString(36)}-${++uploadCounter}`;

  const handleFiles = async (files: readonly File[]) => {
    const target = state().currentFolderId;
    const siblings = allNodes().filter((n) => n.parentId === target);
    const resolver = inputs().conflictResolver;
    const decided = await files.reduce<Promise<{ file: File; decision: ConflictDecision | null }[]>>(async (acc, file) => {
      const existing = siblings.find((n) => n.name === file.name);
      const decision = existing && resolver ? await resolver({ existingNode: existing, incomingName: file.name, mode: 'upload' }) : null;
      return [...(await acc), { file, decision }];
    }, Promise.resolve([]));
    const kept = decided.filter((d) => d.decision?.action !== 'skip');
    if (kept.length === 0 || disposed) return;
    const added: UploadEntry[] = kept.map(({ file }) => ({ id: uploadId(), file, targetFolderId: target, progress: 0, status: 'pending' }));
    const uploads = [...state().uploads, ...added];
    api.setState({ uploads });
    api.emit('uploadsChange', uploads);
    api.emit('uploadRequest', {
      files: kept.map((k) => k.file),
      targetFolderId: target,
      uploads: added,
      conflictResolutions: kept
        .filter((k) => k.decision && k.decision.action !== 'skip')
        .map((k) => ({ fileName: k.file.name, action: k.decision!.action as 'replace' | 'rename', newName: k.decision!.newName })),
    });
  };

  /** Touch devices get no OS file drop: the toolbar's Upload opens a picker. */
  const openUploadPicker = () => {
    if (!inputs().allowUpload) return;
    const input = doc.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.hidden = true;
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? []);
      input.remove();
      if (files.length > 0) void handleFiles(files);
    });
    // A dismissed OS dialog fires cancel, never change.
    input.addEventListener('cancel', () => input.remove());
    doc.body.appendChild(input);
    input.click();
  };

  const run = (command: string) => {
    switch (command) {
      case 'newFolder':
        return void promptNewFolder();
      case 'rename':
        return beginRename();
      case 'delete':
        return void deleteSelection();
      case 'cut':
      case 'copy':
        return setClipboard(command);
      case 'paste':
        return void paste();
      case 'upload':
        return openUploadPicker();
    }
  };

  const setViewMode = (next: FileManagerViewMode) => {
    if (state().viewMode === next) return;
    api.setState({ viewMode: next, renameTarget: null });
    api.emit('viewModeChange', next);
  };

  // ─── Context menu ─────────────────────────────────────────────────────────

  const closeMenu = (restore = true) => {
    if (!state().contextMenu) return;
    menuCleanup?.();
    menuCleanup = null;
    api.setState({ contextMenu: null });
    const back = menuReturn;
    menuReturn = null;
    if (restore) back?.focus();
  };

  const openMenu = (targetId: string, x: number, y: number) => {
    if (allow() === false) return;
    menuCleanup?.();
    const active = doc.activeElement;
    // Body is no place to return to: an unfocused open restores nothing.
    menuReturn = active instanceof HTMLElement && active !== doc.body ? active : null;
    api.setState({ contextMenu: { x, y, targetId } });
    // APG menu: focus moves into the menu when it opens.
    whenRendered('.context-menu .menu-item:not([disabled])', (item) => item.focus());
    const outside = (ev: Event) => {
      const menu = host.querySelector('.context-menu');
      if (menu && ev.target instanceof Node && menu.contains(ev.target)) return;
      closeMenu(ev.type !== 'contextmenu');
    };
    const escape = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      closeMenu();
    };
    doc.addEventListener('click', outside, true);
    doc.addEventListener('contextmenu', outside, true);
    doc.addEventListener('keydown', escape, true);
    menuCleanup = () => {
      doc.removeEventListener('click', outside, true);
      doc.removeEventListener('contextmenu', outside, true);
      doc.removeEventListener('keydown', escape, true);
    };
  };

  /** A context menu on a node selects it first, unless it is already part of the selection. */
  const contextMenuAt = (nodeId: string, x: number, y: number) => {
    if (mode() !== 'none' && !state().selectedIds.includes(nodeId)) setSelection([nodeId]);
    openMenu(nodeId, x, y);
  };

  const menuKeydown = (ev: KeyboardEvent, item: HTMLElement) => {
    const items = [...host.querySelectorAll<HTMLElement>('.context-menu .menu-item:not([disabled])')];
    const next = rovingTarget(ev.key, { count: items.length, from: items.indexOf(item), orientation: 'vertical', wrap: true });
    if (next !== null && items[next]) {
      ev.preventDefault();
      items[next].focus();
    } else if (ev.key === 'Tab') {
      closeMenu(false);
    }
  };

  // ─── Content keys ─────────────────────────────────────────────────────────

  const contentKeydown = (ev: KeyboardEvent, origin: HTMLElement) => {
    const ctrl = ev.ctrlKey || ev.metaKey;
    const key = ev.key.toLowerCase();
    const selected = state().selectedIds;
    const card = origin.closest<HTMLElement>('.icon-card');
    if (ev.key === 'Enter') {
      // Same as a double click. It acts on the focused card or row, not on a stale selection.
      const id = card?.dataset['nodeId'] ?? origin.closest<HTMLElement>('tr[data-row-key]')?.dataset['rowKey'] ?? (selected.length === 1 ? selected[0] : undefined);
      const node = id === undefined ? undefined : nodeById(id);
      if (!node) return;
      ev.preventDefault();
      if (card && mode() !== 'none') setSelection([node.id]);
      activate(node);
      return;
    }
    if ((ev.key === 'ContextMenu' || (ev.key === 'F10' && ev.shiftKey)) && selected.length > 0) {
      ev.preventDefault();
      const rect = origin.getBoundingClientRect();
      openMenu(selected[0], rect.left + rect.width / 2, rect.bottom);
      return;
    }
    const shortcut: string | null =
      ev.key === 'Delete'
        ? 'delete'
        : ev.key === 'F2'
          ? 'rename'
          : ctrl && ev.shiftKey && key === 'n'
            ? 'newFolder'
            : ctrl && !ev.shiftKey && key === 'x'
              ? 'cut'
              : ctrl && !ev.shiftKey && key === 'c'
                ? 'copy'
                : ctrl && !ev.shiftKey && key === 'v'
                  ? 'paste'
                  : null;
    if (shortcut) {
      const ready = shortcut === 'paste' ? !!state().clipboard : shortcut === 'newFolder' || selected.length > 0;
      if (!ready) return;
      ev.preventDefault();
      run(shortcut);
      return;
    }
    // Icon view: the cards reflow, so every arrow walks the linear order.
    if (!card) return;
    const cards = [...host.querySelectorAll<HTMLElement>('.icon-grid .icon-card')];
    const from = cards.indexOf(card);
    const forward = ev.key === 'ArrowRight' || ev.key === 'ArrowDown';
    const back = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp';
    const target = ev.key === 'Home' ? 0 : ev.key === 'End' ? cards.length - 1 : forward ? Math.min(cards.length - 1, from + 1) : back ? Math.max(0, from - 1) : -1;
    if (from < 0 || target < 0 || ctrl || ev.altKey) return;
    ev.preventDefault();
    api.setState({ iconFocusId: cards[target].dataset['nodeId'] ?? null });
    cards[target].focus();
  };

  const cardClick = (card: HTMLElement, ev: MouseEvent) => {
    const id = card.dataset['nodeId'];
    const m = mode();
    if (!id || m === 'none') return;
    const selected = state().selectedIds;
    if (m === 'multiple' && (ev.ctrlKey || ev.metaKey)) {
      setSelection(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    } else if (m === 'multiple' && ev.shiftKey && selected.length > 0) {
      const ids = entries().map((e) => e.id);
      const a = ids.indexOf(selected[selected.length - 1]);
      const b = ids.indexOf(id);
      if (a < 0 || b < 0) return;
      const range = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
      setSelection([...selected, ...range.filter((r) => !selected.includes(r))]);
    } else {
      setSelection([id]);
    }
  };

  // ─── Delegated listeners ──────────────────────────────────────────────────

  const onClick = (ev: MouseEvent) => {
    const target = ev.target as Element;
    const command = target.closest<HTMLElement>('[data-fm-command]');
    if (command) {
      if ((command as HTMLButtonElement).disabled) return;
      const inMenu = !!command.closest('.context-menu');
      if (inMenu) closeMenu(command.dataset['fmCommand'] !== 'rename');
      run(command.dataset['fmCommand']!);
      return;
    }
    const crumb = target.closest<HTMLElement>('[data-fm-navigate]');
    if (crumb) return navigateTo(crumb.dataset['fmNavigate'] || null);
    const toggle = target.closest<HTMLElement>('[data-fm-view]');
    if (toggle) return setViewMode(parseFileManagerViewMode(toggle.dataset['fmView']));
    const card = target.closest<HTMLElement>('.icon-card');
    if (card) cardClick(card, ev);
  };

  // The rename box is inside a datatable row: its clicks must not reach the row's selection.
  const onClickCapture = (ev: MouseEvent) => {
    if ((ev.target as Element).closest?.('.rename-input')) ev.stopPropagation();
  };

  const onDblClick = (ev: MouseEvent) => {
    const id = (ev.target as Element).closest<HTMLElement>('.icon-card')?.dataset['nodeId'];
    const node = id === undefined ? undefined : nodeById(id);
    if (node) activate(node);
  };

  const onContextMenu = (ev: MouseEvent) => {
    const id = (ev.target as Element).closest<HTMLElement>('.icon-card')?.dataset['nodeId'];
    if (id === undefined) return;
    ev.preventDefault();
    contextMenuAt(id, ev.clientX, ev.clientY);
  };

  const onKeydown = (ev: KeyboardEvent) => {
    const origin = ev.target as HTMLElement;
    const rename = origin.closest<HTMLInputElement>('.rename-input');
    if (rename) {
      // The editor owns every key: Delete deletes a character, Ctrl+C copies text.
      if (ev.key === 'Enter') {
        ev.preventDefault();
        commitRename(rename.dataset['fmRename']!, rename.value);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        api.setState({ renameTarget: null });
      }
      return;
    }
    const item = origin.closest<HTMLElement>('.context-menu .menu-item');
    if (item) return menuKeydown(ev, item);
    if (isEditable(origin) || !origin.closest('[data-fm-content]')) return;
    contentKeydown(ev, origin);
  };

  const onFocusIn = (ev: FocusEvent) => {
    const id = (ev.target as Element).closest<HTMLElement>('.icon-card')?.dataset['nodeId'];
    if (id !== undefined && id !== state().iconFocusId) api.setState({ iconFocusId: id });
  };

  const onFocusOut = (ev: FocusEvent) => {
    const rename = (ev.target as Element).closest<HTMLInputElement>('.rename-input');
    if (rename) commitRename(rename.dataset['fmRename']!, rename.value);
  };

  const onInput = (ev: Event) => {
    const search = (ev.target as Element).closest<HTMLInputElement>('[data-fm-search]');
    if (!search) return;
    api.setState({ searchQuery: search.value });
    // The result count, once the keystroke burst is over.
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (state().searchQuery.trim()) announce(messages().announceSearchResults(entries().length));
    }, SEARCH_ANNOUNCE_MS);
  };

  const hasFiles = (ev: DragEvent) => !!ev.dataTransfer && [...ev.dataTransfer.types].includes('Files');
  const inContent = (ev: Event) => !!(ev.target as Element).closest?.('[data-fm-content]');

  const onDragEnter = (ev: DragEvent) => {
    if (!inputs().allowUpload || !inContent(ev) || !hasFiles(ev)) return;
    ev.preventDefault();
    if (++dragDepth === 1) api.setState({ dropActive: true });
  };
  const onDragOver = (ev: DragEvent) => {
    if (!inputs().allowUpload || !inContent(ev) || !hasFiles(ev)) return;
    ev.preventDefault();
    ev.dataTransfer!.dropEffect = 'copy';
  };
  const onDragLeave = (ev: DragEvent) => {
    if (!inputs().allowUpload || !inContent(ev)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) api.setState({ dropActive: false });
  };
  const onDrop = (ev: DragEvent) => {
    if (!inputs().allowUpload || !inContent(ev) || !ev.dataTransfer) return;
    ev.preventDefault();
    dragDepth = 0;
    api.setState({ dropActive: false });
    if (state().touchMode) return;
    const files = Array.from(ev.dataTransfer.files ?? []);
    if (files.length > 0) void handleFiles(files);
  };

  /** A 600 ms press opens the context menu on the pressed node; any movement abandons it. */
  const cancelHold = () => {
    clearTimeout(holdTimer);
    holdTimer = undefined;
  };
  const onTouchStart = (ev: TouchEvent) => {
    // A second finger turns the press into a pinch, and a new press replaces the old.
    cancelHold();
    if (ev.touches.length !== 1) return;
    const touch = ev.touches[0];
    const el = (ev.target as Element).closest?.<HTMLElement>(NODE_ELEMENT) ?? doc.elementFromPoint?.(touch.clientX, touch.clientY)?.closest<HTMLElement>(NODE_ELEMENT);
    const id = el?.dataset['nodeId'] ?? el?.dataset['rowKey'];
    if (!id) return;
    const { clientX: x, clientY: y } = touch;
    holdTimer = setTimeout(() => {
      holdTimer = undefined;
      contextMenuAt(id, x, y);
    }, TOUCH_HOLD_MS);
  };

  const listeners: [string, EventListener, boolean?][] = [
    ['click', onClick as EventListener],
    ['click', onClickCapture as EventListener, true],
    ['dblclick', onDblClick as EventListener],
    ['contextmenu', onContextMenu as EventListener],
    ['keydown', onKeydown as EventListener],
    ['focusin', onFocusIn as EventListener],
    ['focusout', onFocusOut as EventListener],
    ['input', onInput],
    ['dragenter', onDragEnter as EventListener],
    ['dragover', onDragOver as EventListener],
    ['dragleave', onDragLeave as EventListener],
    ['drop', onDrop as EventListener],
    ['touchstart', onTouchStart as EventListener],
    ['touchend', cancelHold],
    ['touchcancel', cancelHold],
    ['touchmove', cancelHold],
  ];
  listeners.forEach(([type, fn, capture]) => host.addEventListener(type, fn, capture ?? false));

  // A coarse pointer means no OS file drop: the toolbar's Upload button stands in.
  const coarse = doc.defaultView?.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (coarse) api.setState({ touchMode: true });

  engines.set(host, { setSelection, setExpanded, navigateTo, loadTree, activate, contextMenuAt, announce });

  return () => {
    disposed = true;
    engines.delete(host);
    listeners.forEach(([type, fn, capture]) => host.removeEventListener(type, fn, capture ?? false));
    menuCleanup?.();
    cancelHold();
    clearTimeout(searchTimer);
    unsubscribes.forEach((u) => u());
    polite.destroy();
    assertive.destroy();
  };
}

const writeUploads = (api: Api, uploads: UploadEntry[]) => {
  api.setState({ uploads });
  api.emit('uploadsChange', uploads);
};

const writePending = (api: Api, pending: Record<string, OperationKind>) => {
  api.setState({ pending });
  api.emit('pendingChange', pending);
};

export const fileManagerCore = defineCore<
  FileManagerInputs,
  FileManagerState,
  { view: FileManagerTemplateView },
  FileManagerEvents,
  undefined,
  undefined,
  FileManagerMethods
>({
  state: (inputs) => ({
    currentFolderId: inputs.currentFolderId ?? null,
    selectedIds: parseFileManagerSelectionMode(inputs.selectionMode) === 'none' ? [] : (inputs.selectedIds ?? []),
    viewMode: parseFileManagerViewMode(inputs.viewMode),
    uploads: inputs.uploads ?? [],
    pending: inputs.pending ?? {},
    expandedTreeIds: [],
    clipboard: null,
    searchQuery: '',
    sortColumns: [],
    iconFocusId: null,
    renameTarget: null,
    dropActive: false,
    contextMenu: null,
    touchMode: false,
    loaded: [],
    loadedFolders: [],
    announcement: '',
    alert: '',
  }),
  view: ({ inputs, state, id, hydrated, label, api }) => {
    const messages = mergeMessages(inputs.messages);
    const nodes = nodesOf(inputs.nodes ?? [], state.loaded);
    const entries = entriesOf(nodes, state.currentFolderId, state.searchQuery, state.sortColumns);
    const selectionMode = parseFileManagerSelectionMode(inputs.selectionMode);
    const lazy = !!inputs.loadChildren;
    const engine = () => engineOf(api());
    const view = connectFileManager({
      id,
      hydrated,
      label,
      messages,
      nodes,
      entries,
      currentFolderId: state.currentFolderId,
      selected: new Set(state.selectedIds),
      allowOperations: inputs.allowOperations ?? true,
      allowUpload: !!inputs.allowUpload,
      viewMode: state.viewMode,
      selectionMode,
      searchPlaceholder: inputs.searchPlaceholder ?? null,
      iconResolver: inputs.iconResolver,
      clipboard: state.clipboard,
      renameTarget: state.renameTarget,
      iconFocusId: state.iconFocusId,
      pending: state.pending,
      dropActive: state.dropActive,
      contextMenu: state.contextMenu,
      treeItems: treeOf(nodes, inputs.rootFolderId ?? null, lazy, state.loadedFolders),
    });
    return {
      view: {
        ...view,
        touchMode: state.touchMode,
        announcement: state.announcement,
        alertText: state.alert,
        selectionMode,
        data: entries,
        selection: { value: state.selectedIds as string[], set: (ids) => engine()?.setSelection(ids) },
        sort: { value: state.sortColumns as SortColumn[], set: (sort) => api()?.setState({ sortColumns: sort }) },
        treeExpanded: { value: state.expandedTreeIds, set: (ids) => engine()?.setExpanded(ids) },
        treeLoad: lazy ? (parentId) => engine()?.loadTree(parentId) ?? Promise.resolve([]) : null,
        onTreeSelect: (detail) => engine()?.navigateTo(detail.node.id),
        onRowDblClick: (detail) => {
          const node = detail.row as FileSystemNode;
          engine()?.activate(node);
        },
        onRowContextMenu: (detail) => {
          const ev = detail.originalEvent as MouseEvent;
          ev.preventDefault();
          engine()?.contextMenuAt(detail.rowKey, ev.clientX, ev.clientY);
        },
      },
    };
  },
  attach: attachFileManager,
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    const state = api.state();
    if (inputs.nodes !== prev.nodes) {
      const known = new Set((inputs.nodes ?? []).map((n) => n.id));
      const kept = state.selectedIds.filter((id) => known.has(id));
      api.setState({ loaded: [] });
      if (kept.length !== state.selectedIds.length) engineOf(api)?.setSelection(kept);
    }
    if (inputs.currentFolderId !== prev.currentFolderId && inputs.currentFolderId !== state.currentFolderId) {
      api.setState({ currentFolderId: inputs.currentFolderId ?? null, selectedIds: [], renameTarget: null });
    }
    const m = parseFileManagerSelectionMode(inputs.selectionMode);
    if (inputs.selectedIds !== prev.selectedIds && inputs.selectedIds !== state.selectedIds) {
      api.setState({ selectedIds: m === 'none' ? [] : (inputs.selectedIds ?? []) });
    } else if (m === 'none' && state.selectedIds.length > 0) {
      engineOf(api)?.setSelection([]);
    }
    if (inputs.viewMode !== prev.viewMode) api.setState({ viewMode: parseFileManagerViewMode(inputs.viewMode) });
    if (inputs.uploads !== prev.uploads && inputs.uploads !== state.uploads) api.setState({ uploads: inputs.uploads ?? [] });
    if (inputs.pending !== prev.pending && inputs.pending !== state.pending) api.setState({ pending: inputs.pending ?? {} });
  },
  methods: {
    markPending: (api, nodeId, op) => writePending(api, { ...api.state().pending, [nodeId]: op }),
    clearPending: (api, nodeId) => {
      if (!(nodeId in api.state().pending)) return;
      writePending(api, Object.fromEntries(Object.entries(api.state().pending).filter(([id]) => id !== nodeId)));
    },
    reportError: (api, message, nodeId) => api.emit('errorReported', { kind: 'operation', message, ...(nodeId === undefined ? {} : { nodeId }) }),
    reportUploadProgress: (api, uploadId, progress, status, error) => {
      const uploads = api.state().uploads;
      const previous = uploads.find((u) => u.id === uploadId);
      if (!previous) return;
      const next: UploadEntry = { ...previous, progress, ...(status ? { status } : {}), ...(error ? { error } : {}) };
      writeUploads(api, uploads.map((u) => (u === previous ? next : u)));
      // Outcomes only: progress ticks would drown a screen reader. A failure interrupts.
      if (previous.status === next.status) return;
      const m = mergeMessages(api.inputs().messages);
      if (next.status === 'done') engineOf(api)?.announce(m.announceUploadDone(next.file.name));
      else if (next.status === 'error') engineOf(api)?.announce(m.announceUploadFailed(next.file.name), true);
    },
    clearUpload: (api, uploadId) => {
      const uploads = api.state().uploads;
      if (uploads.some((u) => u.id === uploadId)) writeUploads(api, uploads.filter((u) => u.id !== uploadId));
    },
  },
});

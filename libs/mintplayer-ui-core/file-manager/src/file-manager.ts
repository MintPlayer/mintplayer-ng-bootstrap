import type { CoreBag } from '@mintplayer/ui-core/component';
import type { DatatableColumnDef, SortColumn } from '@mintplayer/ui-core/datatable';
import type { TreeNode } from '@mintplayer/ui-core/tree';
import type { IconResolver as TreeIconResolver } from '@mintplayer/ui-core/treeview';
import { hydratedAttr } from '@mintplayer/ui-core/store';

/**
 * The file manager (#437): a folder tree, a breadcrumb, a toolbar and the
 * current folder's content as a list (a datatable) or as icon cards, side by
 * side in a splitter. It composes the splitter, the treeview and the
 * datatable; this module is its pure half (types, strings, derived data and
 * the attribute bags).
 *
 * The component renders intents and emits them (`operation`, `uploadRequest`,
 * ...): the consumer owns the data and the backend. Visible strings and
 * accessible names all come from `FileManagerMessages`.
 *
 * No-JS: the server render shows the tree and the current folder's content;
 * every control that needs script (toolbar, breadcrumb, view toggle, search)
 * renders disabled until the component is live.
 */
export const FILE_MANAGER_SCOPE = 'file-manager';

export type FileManagerBag = CoreBag;
export type FileManagerSelectionMode = 'none' | 'single' | 'multiple';
export type FileManagerViewMode = 'list' | 'icons';
export type OperationKind = 'rename' | 'delete' | 'new-folder' | 'paste';
export type FileSystemNodeType = 'folder' | 'file';

export interface OperationFlags {
  rename?: boolean;
  delete?: boolean;
  newFolder?: boolean;
  cut?: boolean;
  copy?: boolean;
  paste?: boolean;
}

export interface FileSystemNode {
  id: string;
  parentId: string | null;
  name: string;
  type: FileSystemNodeType;
  size?: number;
  modifiedAt?: string;
  mimeType?: string;
  iconKey?: string;
  /** Per-node operation overrides; an unset key falls back to the component's `allowOperations`. */
  allowOperations?: Partial<OperationFlags>;
  /** Free-form metadata, never read by the component. */
  meta?: Record<string, unknown>;
}

/** Resolves a node's icon key (`node.iconKey`, else `folder` / `file`) to SVG markup; undefined keeps the built-in icon. */
export type FileManagerIconResolver = (iconKey: string, node?: FileSystemNode) => string | undefined;

/** Loads a folder's children the first time it expands in the tree. */
export type FileManagerChildrenLoader = (parentId: string) => Promise<FileSystemNode[]>;

/**
 * Replaces `window.confirm` / `window.prompt`: resolve a boolean for
 * `'confirm'`, the entered text (or null when cancelled) for `'prompt'`.
 * Unset, the browser dialogs are used.
 */
export type DialogResolver = (
  request: { kind: 'confirm'; message: string } | { kind: 'prompt'; label: string; defaultValue?: string },
) => Promise<string | boolean | null>;

export interface ConflictDecision {
  action: 'replace' | 'skip' | 'rename';
  newName?: string;
}

/** Asked once per same-name conflict on paste or upload. Unset, the incoming entry replaces the existing one. */
export type ConflictResolver = (request: { existingNode: FileSystemNode; incomingName: string; mode: 'paste' | 'upload' }) => Promise<ConflictDecision>;

/** One requested upload, tracked in the two-way `uploads`. */
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

export interface FileManagerSelectionEventDetail {
  selectedIds: string[];
}

export interface UploadRequestEventDetail {
  files: File[];
  targetFolderId: string | null;
  /** One entry per file; push progress with `reportUploadProgress(id, ...)`. */
  uploads: ReadonlyArray<UploadEntry>;
  /** Files that replace or rename a same-name entry. Skipped files are not in `files`. */
  conflictResolutions: ReadonlyArray<{ fileName: string; action: 'replace' | 'rename'; newName?: string }>;
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
      /** By source id, for the sources that clashed with a same-name entry. */
      conflicts?: Record<string, ConflictDecision>;
    };

export interface FileManagerErrorEventDetail {
  kind: 'operation';
  message: string;
  nodeId?: string;
}

export interface ChildrenLoadedEventDetail {
  parentId: string;
  children: FileSystemNode[];
}

/** Every visible string and accessible name, for translation. */
export interface FileManagerMessages {
  home: string;
  newFolder: string;
  rename: string;
  delete: string;
  cut: string;
  copy: string;
  paste: string;
  upload: string;
  searchPlaceholder: string;
  listView: string;
  iconsView: string;
  name: string;
  size: string;
  modified: string;
  type: string;
  folder: string;
  file: string;
  loading: string;
  noFilesOrFolders: string;
  dropFilesToUpload: string;
  fileDropZone: string;
  deleteConfirm: (count: number) => string;
  folderNamePrompt: string;
  defaultNewFolderName: string;
  conflictMessage: (existingName: string) => string;
  conflictReplace: string;
  conflictSkip: string;
  conflictRename: string;
  announceDeleted: (count: number) => string;
  announcePasted: (count: number) => string;
  announceNewFolder: (name: string) => string;
  announceRenamed: (from: string, to: string) => string;
  announceUploadDone: (name: string) => string;
  announceUploadFailed: (name: string) => string;
  announceSearchResults: (count: number) => string;
  /** The rename box's accessible name. */
  renameLabel: (name: string) => string;
  ariaToolbar: string;
  ariaFileOperations: string;
  ariaViewMode: string;
  ariaBreadcrumb: string;
  ariaFileList: string;
  ariaFileManager: string;
  ariaFolderTree: string;
}

export const DEFAULT_FILE_MANAGER_MESSAGES: FileManagerMessages = {
  home: 'Home',
  newFolder: 'New folder',
  rename: 'Rename',
  delete: 'Delete',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  upload: 'Upload',
  searchPlaceholder: 'Search…',
  listView: 'List view',
  iconsView: 'Icons view',
  name: 'Name',
  size: 'Size',
  modified: 'Modified',
  type: 'Type',
  folder: 'Folder',
  file: 'File',
  loading: 'Loading…',
  noFilesOrFolders: 'No files or folders',
  dropFilesToUpload: '↓ Drop files to upload ↓',
  fileDropZone: 'File drop zone',
  deleteConfirm: (count) => `Delete ${count} item${count === 1 ? '' : 's'}?`,
  folderNamePrompt: 'Folder name',
  defaultNewFolderName: 'New folder',
  conflictMessage: (existingName) => `"${existingName}" already exists. Replace?`,
  conflictReplace: 'Replace',
  conflictSkip: 'Skip',
  conflictRename: 'Keep both',
  announceDeleted: (count) => (count === 1 ? '1 item deleted.' : `${count} items deleted.`),
  announcePasted: (count) => (count === 1 ? '1 item pasted.' : `${count} items pasted.`),
  announceNewFolder: (name) => `Folder ${name} created.`,
  announceRenamed: (from, to) => `${from} renamed to ${to}.`,
  announceUploadDone: (name) => `Upload of ${name} complete.`,
  announceUploadFailed: (name) => `Upload of ${name} failed.`,
  announceSearchResults: (count) => (count === 1 ? '1 result.' : `${count} results.`),
  renameLabel: (name) => `New name for ${name}`,
  ariaToolbar: 'File manager toolbar',
  ariaFileOperations: 'File operations',
  ariaViewMode: 'View mode',
  ariaBreadcrumb: 'Breadcrumb',
  ariaFileList: 'Files and folders',
  ariaFileManager: 'File manager',
  ariaFolderTree: 'Folders',
};

export function mergeMessages(overrides: Partial<FileManagerMessages> | null | undefined): FileManagerMessages {
  return overrides ? { ...DEFAULT_FILE_MANAGER_MESSAGES, ...overrides } : DEFAULT_FILE_MANAGER_MESSAGES;
}

export const parseFileManagerSelectionMode = (value: unknown): FileManagerSelectionMode =>
  value === 'none' || value === 'single' ? value : 'multiple';

export const parseFileManagerViewMode = (value: unknown): FileManagerViewMode => (value === 'icons' ? 'icons' : 'list');

export const FOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181L15.546 8H2.454l-.913-3.13a.5.5 0 0 1 .013-.087.5.5 0 0 1-.014-.913zM13.81 4H2.19l-.572 6 1.193 4 11.078-2.5L15.81 5.66A1 1 0 0 0 14.81 4z"/></svg>';

export const FILE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>';

const LIST_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>';

const GRID_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>';

// ─── Derived data ───────────────────────────────────────────────────────────

/** The consumer's nodes plus children a lazy load added that they do not carry yet. */
export function mergeNodes(nodes: readonly FileSystemNode[], loaded: readonly FileSystemNode[]): readonly FileSystemNode[] {
  if (loaded.length === 0) return nodes;
  const known = new Set(nodes.map((n) => n.id));
  return [...nodes, ...loaded.filter((n) => !known.has(n.id))];
}

/** Whether `op` is allowed: globally, and on `node` when given (its own flag wins). */
export function opEnabled(allow: boolean | OperationFlags, op: keyof OperationFlags, node?: FileSystemNode): boolean {
  if (allow === false) return false;
  const global = allow === true || allow[op] !== false;
  const local = node?.allowOperations?.[op];
  return local === undefined ? global : local !== false;
}

/** Whether `op` is allowed globally and on every node of the selection. */
export function opEnabledOnAll(allow: boolean | OperationFlags, op: keyof OperationFlags, nodes: readonly (FileSystemNode | undefined)[]): boolean {
  return opEnabled(allow, op) && nodes.every((node) => opEnabled(allow, op, node));
}

/** The folders under `root` (all roots when null) as a tree; in lazy mode a folder with nothing loaded yet is lazy. */
export function folderTree(nodes: readonly FileSystemNode[], root: string | null, lazy: boolean, loadedFolders: readonly string[]): TreeNode[] {
  const folders = nodes.filter((n) => n.type === 'folder');
  const loaded = new Set(loadedFolders);
  const build = (parentId: string | null): TreeNode[] =>
    folders
      .filter((f) => f.parentId === parentId)
      .map((folder) => {
        const children = build(folder.id);
        const isLazy = lazy && children.length === 0 && !loaded.has(folder.id);
        return { id: folder.id, label: folder.name, iconKey: folder.iconKey ?? 'folder', children, ...(isLazy ? { lazy: true } : {}) };
      });
  return build(root);
}

/** The ancestors of a node, outermost first, ending with the node itself. */
export function pathTo(nodes: readonly FileSystemNode[], id: string | null): FileSystemNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const walk = (cursor: string | null, seen: readonly FileSystemNode[]): readonly FileSystemNode[] => {
    const node = cursor === null ? undefined : byId.get(cursor);
    return node && !seen.includes(node) ? walk(node.parentId, [node, ...seen]) : seen;
  };
  return [...walk(id, [])];
}

const sortValue = (node: FileSystemNode, property: string): string | number => {
  const value = (node as unknown as Record<string, unknown>)[property];
  return typeof value === 'number' ? value : String(value ?? '');
};

/**
 * The current folder's entries, filtered by the search. Unsorted, folders
 * come first and each group is alphabetical; a sort column orders all of
 * them by that column.
 */
export function folderEntries(
  nodes: readonly FileSystemNode[],
  folderId: string | null,
  query: string,
  sort: readonly SortColumn[],
): FileSystemNode[] {
  const needle = query.trim().toLowerCase();
  const entries = nodes.filter((n) => n.parentId === folderId && (!needle || n.name.toLowerCase().includes(needle)));
  const compare = (a: FileSystemNode, b: FileSystemNode): number => {
    const by = sort.find((s) => sortValue(a, s.property) !== sortValue(b, s.property));
    if (!by) return a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name);
    const x = sortValue(a, by.property);
    const y = sortValue(b, by.property);
    const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return by.direction === 'descending' ? -order : order;
  };
  return entries.slice().sort(compare);
}

export function formatSize(node: FileSystemNode): string {
  if (node.type === 'folder' || node.size == null) return '—';
  const bytes = node.size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(node: FileSystemNode): string {
  if (!node.modifiedAt) return '—';
  // An unparseable value does not throw; it yields an Invalid Date.
  const date = new Date(node.modifiedAt);
  return Number.isNaN(date.getTime()) ? node.modifiedAt : date.toLocaleDateString();
}

export const typeText = (node: FileSystemNode, messages: FileManagerMessages): string =>
  node.type === 'folder' ? messages.folder : (node.mimeType ?? messages.file);

/** A node's icon: the resolver's, else the built-in folder or file. */
export function nodeIcon(node: FileSystemNode, resolver: FileManagerIconResolver | null | undefined): string {
  const key = node.iconKey ?? (node.type === 'folder' ? 'folder' : 'file');
  return resolver?.(key, node) || (node.type === 'folder' ? FOLDER_SVG : FILE_SVG);
}

/** The tree's icon resolver over the file manager's: tree rows are folders. */
export function treeIconResolver(nodes: readonly FileSystemNode[], resolver: FileManagerIconResolver | null | undefined): TreeIconResolver {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (key, treeNode) => resolver?.(key, byId.get(treeNode.id)) || FOLDER_SVG;
}

const columnsByMessages = new WeakMap<FileManagerMessages, DatatableColumnDef[]>();

/**
 * The list view's columns. One array per messages object: a new array would
 * make the datatable forget its column widths on every render.
 */
export function fileManagerColumns(messages: FileManagerMessages): DatatableColumnDef[] {
  const known = columnsByMessages.get(messages);
  if (known) return known;
  const node = (row: unknown) => row as FileSystemNode;
  const columns: DatatableColumnDef[] = [
    { name: 'name', label: messages.name, sortable: true, cellClass: 'text-nowrap' },
    { name: 'size', label: messages.size, sortable: true, cellClass: 'text-nowrap', format: (row) => formatSize(node(row)) },
    { name: 'modifiedAt', label: messages.modified, sortable: true, cellClass: 'text-nowrap', format: (row) => formatDate(node(row)) },
    { name: 'type', label: messages.type, sortable: true, cellClass: 'text-nowrap', format: (row) => typeText(node(row), messages) },
  ];
  columnsByMessages.set(messages, columns);
  return columns;
}

export const fileManagerRowKey = (row: unknown): string => (row as FileSystemNode).id;

// ─── Bags ───────────────────────────────────────────────────────────────────

const scoped = (bag: FileManagerBag): FileManagerBag => ({ ...bag, 'data-mps': FILE_MANAGER_SCOPE });

export interface FileManagerAction {
  readonly key: string;
  readonly bag: FileManagerBag;
  /** Decorative glyph in front of the label. */
  readonly glyph: string;
  readonly label: string;
}

export interface FileManagerCrumb {
  readonly key: string;
  readonly bag: FileManagerBag;
  readonly label: string;
  /** A separator goes in front of every crumb but Home. */
  readonly separator: boolean;
}

/** One entry of the current folder, for both views. */
export interface FileManagerRow {
  readonly id: string;
  readonly name: string;
  /** SVG markup the core resolved: the built-in icon or the consumer's resolver. */
  readonly icon: string;
  /** The list view's text by column name. */
  readonly texts: Readonly<Record<string, string>>;
  /** The list view's name cell. */
  readonly cell: FileManagerBag;
  /** Set while this row is renamed: the inline editor replaces the name. */
  readonly renameInput: FileManagerBag | null;
  /** The icon view's option. */
  readonly card: FileManagerBag;
}

export interface FileManagerMenuItem {
  readonly key: string;
  readonly li: FileManagerBag;
  /** Null for a separator. */
  readonly button: FileManagerBag | null;
  readonly label: string;
}

export interface FileManagerMenu {
  readonly list: FileManagerBag;
  /** Where the menu opens, as geometry custom properties. */
  readonly style: Readonly<Record<string, string>>;
  readonly items: readonly FileManagerMenuItem[];
}

export interface FileManagerTreeView {
  readonly items: TreeNode[];
  readonly selected: readonly string[];
  readonly icon: TreeIconResolver;
  readonly label: string;
}

export interface FileManagerOptions {
  readonly id: string;
  readonly hydrated: boolean;
  readonly label: string | null;
  readonly messages: FileManagerMessages;
  readonly nodes: readonly FileSystemNode[];
  readonly entries: readonly FileSystemNode[];
  readonly currentFolderId: string | null;
  readonly selected: ReadonlySet<string>;
  readonly allowOperations: boolean | OperationFlags;
  readonly allowUpload: boolean;
  readonly viewMode: FileManagerViewMode;
  readonly selectionMode: FileManagerSelectionMode;
  readonly searchPlaceholder: string | null;
  readonly iconResolver: FileManagerIconResolver | null | undefined;
  readonly clipboard: { readonly mode: 'cut' | 'copy'; readonly ids: readonly string[] } | null;
  readonly renameTarget: string | null;
  readonly iconFocusId: string | null;
  readonly pending: Readonly<Record<string, OperationKind>>;
  readonly dropActive: boolean;
  readonly contextMenu: { readonly x: number; readonly y: number } | null;
  /** The folder tree the treeview shows. */
  readonly treeItems: TreeNode[];
}

export interface FileManagerView {
  readonly root: FileManagerBag;
  readonly live: FileManagerBag;
  readonly alert: FileManagerBag;
  readonly toolbar: FileManagerBag;
  readonly actions: readonly FileManagerAction[];
  readonly glyph: FileManagerBag;
  readonly spacer: FileManagerBag;
  readonly search: FileManagerBag;
  readonly viewToggle: FileManagerBag;
  readonly listToggle: FileManagerBag;
  readonly iconsToggle: FileManagerBag;
  readonly toggleIcon: FileManagerBag;
  readonly listIcon: string;
  readonly gridIcon: string;
  readonly breadcrumb: FileManagerBag;
  readonly crumbItem: FileManagerBag;
  readonly crumbSeparator: FileManagerBag;
  readonly crumbs: readonly FileManagerCrumb[];
  readonly splitArea: FileManagerBag;
  readonly treePane: FileManagerBag;
  readonly contentPane: FileManagerBag;
  readonly contentBody: FileManagerBag;
  readonly list: boolean;
  readonly listLabel: string;
  readonly emptyMessage: string;
  readonly columns: DatatableColumnDef[];
  readonly rowKey: (row: unknown) => string;
  readonly cutIds: string[];
  readonly rows: readonly FileManagerRow[];
  readonly rowIcon: FileManagerBag;
  readonly rowName: FileManagerBag;
  readonly cellText: FileManagerBag;
  readonly grid: FileManagerBag;
  readonly cardIcon: FileManagerBag;
  readonly cardName: FileManagerBag;
  readonly overlay: FileManagerBag;
  readonly dropText: string;
  readonly menu: FileManagerMenu | null;
  readonly tree: FileManagerTreeView;
}

/** What a toolbar or menu command needs before it is enabled. */
export interface FileManagerCommands {
  readonly rename: boolean;
  readonly delete: boolean;
  readonly cut: boolean;
  readonly copy: boolean;
  readonly paste: boolean;
  readonly newFolder: boolean;
}

/** Which commands are offered (allowed at all) and which are enabled right now. */
export function fileManagerCommands(
  allow: boolean | OperationFlags,
  selection: readonly (FileSystemNode | undefined)[],
  hasClipboard: boolean,
): { offered: FileManagerCommands; enabled: FileManagerCommands } {
  const some = selection.length > 0;
  return {
    offered: {
      rename: opEnabled(allow, 'rename'),
      delete: opEnabled(allow, 'delete'),
      cut: opEnabled(allow, 'cut'),
      copy: opEnabled(allow, 'copy'),
      paste: opEnabled(allow, 'paste'),
      newFolder: opEnabled(allow, 'newFolder'),
    },
    enabled: {
      rename: selection.length === 1 && opEnabledOnAll(allow, 'rename', selection),
      delete: some && opEnabledOnAll(allow, 'delete', selection),
      cut: some && opEnabledOnAll(allow, 'cut', selection),
      copy: some && opEnabledOnAll(allow, 'copy', selection),
      paste: hasClipboard && opEnabled(allow, 'paste'),
      newFolder: opEnabled(allow, 'newFolder'),
    },
  };
}

type Command = keyof FileManagerCommands;

const COMMANDS: readonly { readonly command: Command; readonly glyph: string }[] = [
  { command: 'newFolder', glyph: '📁' },
  { command: 'rename', glyph: '✏️' },
  { command: 'delete', glyph: '🗑' },
  { command: 'cut', glyph: '✂' },
  { command: 'copy', glyph: '📋' },
  { command: 'paste', glyph: '📥' },
];

/** The context menu's order: a separator after delete and after paste. */
const MENU: readonly (Command | 'separator')[] = ['rename', 'delete', 'separator', 'cut', 'copy', 'paste', 'separator', 'newFolder'];

// The datatable re-renders on a new `cutIds` array: keep one per clipboard.
const NO_IDS: string[] = [];
const cutIds = new WeakMap<readonly string[], string[]>();
const cutIdsOf = (ids: readonly string[]): string[] => cutIds.get(ids) ?? cutIds.set(ids, [...ids]).get(ids)!;

export function connectFileManager(o: FileManagerOptions): FileManagerView {
  const m = o.messages;
  const live = o.hydrated;
  const disabled = (enabled: boolean) => (!live || !enabled ? true : null);
  const byId = new Map(o.nodes.map((n) => [n.id, n]));
  const selection = [...o.selected].map((id) => byId.get(id));
  const { offered, enabled } = fileManagerCommands(o.allowOperations, selection, o.clipboard !== null);
  const cut = o.clipboard?.mode === 'cut' ? cutIdsOf(o.clipboard.ids) : NO_IDS;
  const icons = o.viewMode === 'icons';

  const actions: FileManagerAction[] = [
    ...COMMANDS.filter((c) => offered[c.command]).map(({ command, glyph }) => ({
      key: command,
      glyph,
      label: m[command],
      bag: scoped({ type: 'button', class: 'toolbar-button', 'data-fm-command': command, disabled: disabled(enabled[command]) }),
    })),
    ...(o.allowUpload
      ? [{ key: 'upload', glyph: '📤', label: m.upload, bag: scoped({ type: 'button', class: 'toolbar-button', 'data-fm-command': 'upload', disabled: disabled(true) }) }]
      : []),
  ];

  const path = pathTo(o.nodes, o.currentFolderId);
  const crumb = (id: string | null, label: string, current: boolean, separator: boolean): FileManagerCrumb => ({
    key: id ?? '',
    label,
    separator,
    bag: scoped({
      type: 'button',
      class: 'breadcrumb-segment',
      'data-fm-navigate': id ?? '',
      'data-current': current ? 'true' : 'false',
      'aria-current': current ? 'page' : null,
      disabled: live ? null : true,
    }),
  });
  const crumbs = [crumb(null, m.home, path.length === 0, false), ...path.map((n, i) => crumb(n.id, n.name, i === path.length - 1, true))];

  // Roving tab stop of the icon view: the focused card, else the first selected, else the first.
  const stop =
    (o.iconFocusId !== null && o.entries.some((e) => e.id === o.iconFocusId) ? o.iconFocusId : null) ??
    o.entries.find((e) => o.selected.has(e.id))?.id ??
    o.entries[0]?.id;

  const rows = o.entries.map((node): FileManagerRow => {
    const selected = o.selected.has(node.id);
    const pending = o.pending[node.id] ?? null;
    return {
      id: node.id,
      name: node.name,
      icon: nodeIcon(node, o.iconResolver),
      texts: { name: node.name, size: formatSize(node), modifiedAt: formatDate(node), type: typeText(node, m) },
      cell: scoped({ class: 'row-cell', 'data-pending': pending }),
      renameInput:
        o.renameTarget === node.id
          ? scoped({ type: 'text', class: 'rename-input', value: node.name, 'aria-label': m.renameLabel(node.name), 'data-fm-rename': node.id })
          : null,
      card: scoped({
        type: 'button',
        class: 'icon-card',
        role: 'option',
        tabindex: node.id === stop ? 0 : -1,
        'data-node-id': node.id,
        'data-selected': selected ? 'true' : 'false',
        'data-cut': cut.includes(node.id) ? 'true' : 'false',
        'data-pending': pending,
        'aria-selected': selected ? 'true' : 'false',
        'aria-busy': pending ? 'true' : null,
      }),
    };
  });

  const menu: FileManagerMenu | null = o.contextMenu
    ? {
        list: scoped({ class: 'context-menu', role: 'menu', 'aria-label': m.ariaFileOperations }),
        style: { '--mp-file-manager-menu-x': `${o.contextMenu.x}px`, '--mp-file-manager-menu-y': `${o.contextMenu.y}px` },
        items: MENU.filter((entry) => entry === 'separator' || offered[entry]).map((entry, i) =>
          entry === 'separator'
            ? { key: `separator-${i}`, li: scoped({ role: 'separator', class: 'menu-separator' }), button: null, label: '' }
            : {
                key: entry,
                li: scoped({ role: 'none' }),
                label: m[entry],
                button: scoped({
                  type: 'button',
                  class: 'menu-item',
                  role: 'menuitem',
                  tabindex: -1,
                  'data-fm-command': entry,
                  disabled: enabled[entry] ? null : true,
                }),
              },
        ),
      }
    : null;

  const toggle = (mode: FileManagerViewMode, label: string) =>
    scoped({
      type: 'button',
      'data-fm-view': mode,
      'data-active': o.viewMode === mode ? 'true' : 'false',
      'aria-pressed': o.viewMode === mode ? 'true' : 'false',
      'aria-label': label,
      disabled: live ? null : true,
    });

  return {
    root: scoped({
      class: o.dropActive ? 'file-manager drop-active' : 'file-manager',
      role: 'region',
      'aria-label': o.label ?? m.ariaFileManager,
      ...hydratedAttr(o.hydrated),
    }),
    live: scoped({ class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }),
    alert: scoped({ class: 'visually-hidden', role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'true' }),
    toolbar: scoped({ class: 'toolbar', role: 'toolbar', 'aria-label': m.ariaToolbar }),
    actions,
    glyph: scoped({ class: 'toolbar-glyph', 'aria-hidden': 'true' }),
    spacer: scoped({ class: 'spacer' }),
    search: scoped({
      type: 'search',
      class: 'search-input',
      placeholder: o.searchPlaceholder || m.searchPlaceholder,
      'aria-label': m.searchPlaceholder,
      'data-fm-search': '',
      disabled: live ? null : true,
    }),
    viewToggle: scoped({ class: 'view-toggle', role: 'group', 'aria-label': m.ariaViewMode }),
    listToggle: toggle('list', m.listView),
    iconsToggle: toggle('icons', m.iconsView),
    toggleIcon: scoped({ class: 'toggle-icon', 'aria-hidden': 'true' }),
    listIcon: LIST_SVG,
    gridIcon: GRID_SVG,
    breadcrumb: scoped({ class: 'breadcrumb-bar', 'aria-label': m.ariaBreadcrumb }),
    crumbItem: scoped({ class: 'breadcrumb-item' }),
    crumbSeparator: scoped({ class: 'breadcrumb-separator', 'aria-hidden': 'true' }),
    crumbs,
    splitArea: scoped({ class: 'split-area' }),
    treePane: scoped({ class: 'tree-pane' }),
    contentPane: scoped({ class: 'content-pane', 'data-fm-content': '' }),
    contentBody: scoped({ class: 'content-body' }),
    list: !icons,
    listLabel: m.ariaFileList,
    emptyMessage: m.noFilesOrFolders,
    columns: fileManagerColumns(m),
    rowKey: fileManagerRowKey,
    cutIds: cut,
    rows,
    rowIcon: scoped({ class: 'row-icon', 'aria-hidden': 'true' }),
    rowName: scoped({ class: 'row-name' }),
    cellText: scoped({ class: 'cell-text' }),
    grid: scoped({
      class: 'icon-grid',
      role: 'listbox',
      'aria-multiselectable': o.selectionMode === 'multiple' ? 'true' : null,
      'aria-label': m.ariaFileList,
    }),
    cardIcon: scoped({ class: 'file-icon', 'aria-hidden': 'true' }),
    cardName: scoped({ class: 'file-name' }),
    // Drag feedback is visual; the upload path announces its own outcomes.
    overlay: scoped({ class: 'drop-overlay', 'aria-hidden': 'true' }),
    dropText: m.dropFilesToUpload,
    menu,
    tree: {
      items: o.treeItems,
      selected: o.currentFolderId === null ? [] : [o.currentFolderId],
      icon: treeIconResolver(o.nodes, o.iconResolver),
      label: m.ariaFolderTree,
    },
  };
}

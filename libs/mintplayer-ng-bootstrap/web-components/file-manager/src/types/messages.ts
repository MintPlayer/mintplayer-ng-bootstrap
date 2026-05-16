/**
 * All user-visible strings rendered by `<mp-file-manager>`. Consumers
 * override via the `messages` property; merge semantics are partial —
 * any key the consumer omits falls back to the English default.
 *
 * Patterned after `QueryBuilderMessages` (libs/.../query-builder/src/lib/model/messages.ts).
 */
export interface FileManagerMessages {
  // Breadcrumb
  home: string;

  // Toolbar
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

  // Column headers
  name: string;
  size: string;
  modified: string;
  type: string;

  // Type labels (rendered in the `type` column)
  folder: string;
  file: string;

  // Empty / loading states
  loading: string;
  noFilesOrFolders: string;
  dropFilesToUpload: string;
  fileDropZone: string;

  // Dialog text
  deleteConfirm: (count: number) => string;
  folderNamePrompt: string;
  defaultNewFolderName: string;

  // Conflict resolution
  conflictMessage: (existingName: string) => string;
  conflictReplace: string;
  conflictSkip: string;
  conflictRename: string;

  // ARIA labels
  ariaToolbar: string;
  ariaBreadcrumb: string;
  ariaFileList: string;
  ariaFileManager: string;
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
  ariaToolbar: 'File manager toolbar',
  ariaBreadcrumb: 'Breadcrumb',
  ariaFileList: 'Files and folders',
  ariaFileManager: 'File manager',
};

export function mergeMessages(
  overrides: Partial<FileManagerMessages> | undefined,
): FileManagerMessages {
  if (!overrides) return DEFAULT_FILE_MANAGER_MESSAGES;
  return { ...DEFAULT_FILE_MANAGER_MESSAGES, ...overrides };
}

import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The file manager's manifest (PRD #437 D10): `@mintplayer/nx-component-compiler`
 * generates `bs-file-manager` (Angular), `BsFileManager` (React, Vue) and
 * `mp-file-manager` (Lit) from it, the core in `file-manager.core.ts` and the
 * template in `templates/`. It composes the splitter, the treeview and the
 * datatable.
 */
export default {
  group: 'file-manager',
  style: { scope: 'file-manager' },
  components: {
    'file-manager': {
      core: 'fileManagerCore',
      doc: [
        'A file browser (#437): a folder tree and the open folder as a list or as icon cards, with a breadcrumb,',
        'a toolbar, search, a context menu, inline rename and file drop. It renders intents (`operation`,',
        '`uploadRequest`, `nodeOpen`); the consumer owns `nodes` and the backend. Two-way: `currentFolderId`,',
        '`selectedIds`, `viewMode`, `uploads`, `pending`. Strings come from `messages`.',
      ].join('\n'),
      inputs: {
        type: 'FileManagerInputs',
        fields: {
          nodes: { default: '[]', kind: false },
          rootFolderId: { default: 'null', kind: 'string' },
          currentFolderId: { default: 'null', kind: 'string', model: true },
          allowUpload: { default: 'false', kind: 'boolean' },
          allowOperations: { default: 'true', kind: false },
          viewMode: { default: "'list'", kind: 'string', model: true },
          selectionMode: { default: "'multiple'", kind: 'string' },
          selectedIds: { default: '[]', kind: false, model: true },
          searchPlaceholder: { default: 'null', kind: 'string' },
          iconResolver: { default: 'null', kind: false },
          messages: { default: 'null', kind: false },
          dialogResolver: { default: 'null', kind: false },
          conflictResolver: { default: 'null', kind: false },
          loadChildren: { default: 'null', kind: false },
          uploads: { default: '[]', kind: false, model: true },
          pending: { default: '{}', kind: false, model: true },
        },
      },
      outputs: {
        navigate: { type: 'NavigateEventDetail', doc: 'The user opened a folder.' },
        nodeOpen: { type: 'NodeOpenEventDetail', doc: 'A file was opened (double click or Enter).' },
        selectionChanged: { type: 'FileManagerSelectionEventDetail', doc: 'The selection changed.' },
        uploadRequest: { type: 'UploadRequestEventDetail', doc: 'Files were dropped or picked, after conflict resolution.' },
        operation: { type: 'OperationEventDetail', doc: 'Rename, delete, new folder or paste: the consumer applies it.' },
        errorReported: { type: 'FileManagerErrorEventDetail', doc: '`reportError()` was called.' },
        childrenLoaded: { type: 'ChildrenLoadedEventDetail', doc: "A lazy folder's children arrived." },
        currentFolderIdChange: { type: 'string | null', doc: 'The open folder, after the user changed it.' },
        selectedIdsChange: { type: 'string[]', doc: 'The selected node ids, after the user changed them.' },
        viewModeChange: { type: 'FileManagerViewMode', doc: 'The view, after the user switched it.' },
        uploadsChange: { type: 'UploadEntry[]', doc: 'The tracked uploads, after a change.' },
        pendingChange: { type: 'Record<string, OperationKind>', doc: 'The nodes with an operation in flight, after a change.' },
      },
      methods: {
        type: 'FileManagerMethods',
        fields: {
          markPending: { doc: 'Mark a node busy while the backend works on it.' },
          clearPending: { doc: "Clear a node's busy mark." },
          reportError: { doc: 'Fire `errorReported` with this message.' },
          reportUploadProgress: { doc: "Move an upload's progress and status." },
          clearUpload: { doc: 'Stop tracking an upload.' },
        },
      },
    },
  },
} satisfies ComponentGroup;

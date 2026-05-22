/// <reference types="../../../../types" />

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFileManagerComponent, DEFAULT_FILE_MANAGER_MESSAGES, type ConflictResolver, type DialogResolver, type FileManagerMessages, type FileSystemNode, type FileManagerSelectionMode, type FileManagerViewMode, type OperationEventDetail, type UploadEntry, type UploadRequestEventDetail, type FileManagerIconResolver } from '@mintplayer/ng-bootstrap/file-manager';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
import { makeMockFileSystem } from './mock-data';
type DemoLocale = 'en' | 'nl' | 'fr';

@Component({
  selector: 'demo-file-manager',
  templateUrl: './file-manager.component.html',
  styleUrls: ['./file-manager.component.scss'],
  imports: [
    FormsModule,
    BsFileManagerComponent,
    BsCheckboxComponent,
    BsSelectComponent,
    BsSelectOption,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileManagerDemoComponent {
  private readonly icons = signal<Map<string, string>>(new Map());

  // ─── Demo state ──────────────────────────────────────────────────────────
  readonly nodes = signal<FileSystemNode[]>(makeMockFileSystem());
  readonly currentFolderId = signal<string | null>(null);
  readonly selectedIds = signal<string[]>([]);

  // Toggleable B2B feature switches.
  readonly allowUpload = signal<boolean>(true);
  readonly viewMode = signal<FileManagerViewMode>('list');
  readonly selectionMode = signal<FileManagerSelectionMode>('multiple');
  readonly useCustomDialog = signal<boolean>(false);
  readonly useConflictResolver = signal<boolean>(false);
  readonly readOnlyDocs = signal<boolean>(false);
  readonly lazyMode = signal<boolean>(false);
  readonly locale = signal<DemoLocale>('en');

  // ─── i18n ────────────────────────────────────────────────────────────────
  /** Messages overrides per locale. Strings the consumer doesn't override
   *  fall back to DEFAULT_FILE_MANAGER_MESSAGES. */
  readonly messages = computed<Partial<FileManagerMessages>>(() => {
    switch (this.locale()) {
      case 'nl':
        return {
          home: 'Start',
          newFolder: 'Nieuwe map',
          rename: 'Hernoemen',
          delete: 'Verwijderen',
          cut: 'Knippen',
          copy: 'Kopiëren',
          paste: 'Plakken',
          upload: 'Uploaden',
          searchPlaceholder: 'Zoeken…',
          loading: 'Bezig met laden…',
          noFilesOrFolders: 'Geen bestanden of mappen',
          dropFilesToUpload: '↓ Sleep bestanden hierheen om te uploaden ↓',
          name: 'Naam',
          size: 'Grootte',
          modified: 'Gewijzigd',
          type: 'Type',
          folder: 'Map',
          file: 'Bestand',
          deleteConfirm: (n) => `${n} item${n === 1 ? '' : 's'} verwijderen?`,
          folderNamePrompt: 'Mapnaam',
          defaultNewFolderName: 'Nieuwe map',
        };
      case 'fr':
        return {
          home: 'Accueil',
          newFolder: 'Nouveau dossier',
          rename: 'Renommer',
          delete: 'Supprimer',
          cut: 'Couper',
          copy: 'Copier',
          paste: 'Coller',
          upload: 'Téléverser',
          searchPlaceholder: 'Rechercher…',
          loading: 'Chargement…',
          noFilesOrFolders: 'Aucun fichier ou dossier',
          dropFilesToUpload: '↓ Déposez les fichiers ici pour les téléverser ↓',
          name: 'Nom',
          size: 'Taille',
          modified: 'Modifié',
          type: 'Type',
          folder: 'Dossier',
          file: 'Fichier',
          deleteConfirm: (n) => `Supprimer ${n} élément${n === 1 ? '' : 's'} ?`,
          folderNamePrompt: 'Nom du dossier',
          defaultNewFolderName: 'Nouveau dossier',
        };
      default:
        return DEFAULT_FILE_MANAGER_MESSAGES;
    }
  });

  // ─── Per-node permissions ───────────────────────────────────────────────
  /** When `readOnlyDocs` is true, the "Documents" folder rejects every
   *  mutating operation. Demonstrates `FileSystemNode.allowOperations`. */
  readonly effectiveNodes = computed<FileSystemNode[]>(() => {
    const ns = this.nodes();
    if (!this.readOnlyDocs()) return ns;
    return ns.map((n) =>
      n.id === 'docs' || this.isDescendantOf(n, 'docs', ns)
        ? { ...n, allowOperations: { rename: false, delete: false, cut: false, newFolder: false } }
        : n,
    );
  });

  // ─── Lazy tree ───────────────────────────────────────────────────────────
  /** In lazy mode the demo only seeds the top-level folders. Expansion of
   *  any folder triggers `loadChildren`, which simulates a 600 ms backend
   *  fetch and returns the matching subtree from the full mock. */
  readonly nodesForFm = computed<FileSystemNode[]>(() =>
    this.lazyMode()
      ? this.effectiveNodes().filter((n) => n.parentId === null)
      : this.effectiveNodes(),
  );

  loadChildren = async (parentId: string): Promise<FileSystemNode[]> => {
    await new Promise((r) => setTimeout(r, 600));
    return makeMockFileSystem().filter((n) => n.parentId === parentId);
  };

  // ─── Custom dialogs ─────────────────────────────────────────────────────
  /** Replaces `window.confirm` / `window.prompt`. In real apps this opens
   *  `bs-modal`. Here we use a simple Promise-based wrapper around the
   *  native dialogs but flag them as "custom" via a console log. */
  dialogResolver: DialogResolver = async (req) => {
    if (req.kind === 'confirm') {
      // In production: open a bs-modal with the message and resolve on click.
      return window.confirm(`[Custom dialog] ${req.message}`);
    }
    return window.prompt(`[Custom dialog] ${req.label}`, req.defaultValue ?? '');
  };

  conflictResolver: ConflictResolver = async (req) => {
    // In production: open a bs-modal with Replace / Skip / Keep both buttons.
    const choice = window.prompt(
      `"${req.incomingName}" already exists in this folder.\n` +
        `Type one of: replace / skip / rename:newname`,
      'rename:' + req.incomingName + ' (1)',
    );
    if (!choice) return { action: 'skip' };
    if (choice === 'replace') return { action: 'replace' };
    if (choice === 'skip') return { action: 'skip' };
    if (choice.startsWith('rename:')) return { action: 'rename', newName: choice.slice(7) };
    return { action: 'skip' };
  };

  // ─── Wiring ─────────────────────────────────────────────────────────────
  readonly activeDialogResolver = computed(() =>
    this.useCustomDialog() ? this.dialogResolver : undefined,
  );

  readonly activeConflictResolver = computed(() =>
    this.useConflictResolver() ? this.conflictResolver : undefined,
  );

  readonly activeLoadChildren = computed(() =>
    this.lazyMode() ? this.loadChildren : undefined,
  );

  /** Toasts: error messages re-emitted via the `(errorReported)` event. */
  readonly toasts = signal<{ id: string; message: string }[]>([]);

  iconResolver: FileManagerIconResolver = (iconKey) => this.icons().get(iconKey);

  constructor() {
    this.preloadIcons([
      'folder', 'folder-fill', 'file', 'file-earmark',
      'file-text', 'file-pdf', 'file-word', 'file-excel',
      'file-image', 'file-music', 'file-zip',
      'folder-image', 'folder-music', 'folder-code',
    ]);
  }

  private preloadIcons(keys: ReadonlyArray<string>): void {
    Promise.all(
      keys.map(async (key) => {
        try {
          const mod = await import(`bootstrap-icons/icons/${key}.svg`);
          return [key, mod.default as string] as const;
        } catch {
          return [key, ''] as const;
        }
      }),
    ).then((entries) => {
      const map = new Map<string, string>();
      entries.forEach(([k, v]) => {
        if (v) map.set(k, v);
      });
      this.icons.set(map);
    });
  }

  // ─── Operation handler (canonical wiring) ───────────────────────────────
  onOperation(op: OperationEventDetail, fm: BsFileManagerComponent): void {
    const current = this.nodes();

    if (op.kind === 'rename') {
      // Real apps: mark pending, PATCH /api/nodes/:id, clearPending on completion.
      fm.markPending(op.nodeId, 'rename');
      this.simulateBackendDelay()
        .then(() => {
          this.nodes.set(
            current.map((n) => (n.id === op.nodeId ? { ...n, name: op.newName } : n)),
          );
        })
        .catch(() => fm.reportError(`Could not rename "${op.previousName}".`, op.nodeId))
        .finally(() => fm.clearPending(op.nodeId));
      return;
    }

    if (op.kind === 'delete') {
      const drop = new Set<string>(op.nodeIds);
      let changed = true;
      while (changed) {
        changed = false;
        for (const n of current) {
          if (n.parentId !== null && drop.has(n.parentId) && !drop.has(n.id)) {
            drop.add(n.id);
            changed = true;
          }
        }
      }
      op.nodeIds.forEach((id) => fm.markPending(id, 'delete'));
      this.simulateBackendDelay()
        .then(() => this.nodes.set(current.filter((n) => !drop.has(n.id))))
        .catch(() => fm.reportError(`Could not delete the selected items.`))
        .finally(() => op.nodeIds.forEach((id) => fm.clearPending(id)));
      return;
    }

    if (op.kind === 'new-folder') {
      const id = `new-${Date.now()}`;
      const folder: FileSystemNode = {
        id,
        parentId: op.parentId,
        name: op.name,
        type: 'folder',
        iconKey: 'folder',
        modifiedAt: new Date().toISOString().slice(0, 10),
      };
      this.nodes.set([...current, folder]);
      return;
    }

    if (op.kind === 'paste') {
      const sourceIds = new Set(op.sourceIds);
      const conflicts = op.conflicts ?? {};
      const filteredSourceIds = op.sourceIds.filter((id) => conflicts[id]?.action !== 'skip');
      const renameMap = new Map<string, string>();
      for (const [id, decision] of Object.entries(conflicts)) {
        if (decision.action === 'rename' && decision.newName) renameMap.set(id, decision.newName);
      }
      if (op.mode === 'cut') {
        this.nodes.set(
          current
            .filter((n) => {
              // Drop existing same-name children in the target folder when replacing.
              return !Object.entries(conflicts).some(
                ([sourceId, decision]) =>
                  decision.action === 'replace' &&
                  n.parentId === op.targetFolderId &&
                  current.find((s) => s.id === sourceId)?.name === n.name &&
                  n.id !== sourceId,
              );
            })
            .map((n) =>
              filteredSourceIds.includes(n.id)
                ? {
                    ...n,
                    parentId: op.targetFolderId,
                    name: renameMap.get(n.id) ?? n.name,
                  }
                : n,
            ),
        );
      } else {
        const copies = duplicateBranches(current, filteredSourceIds, op.targetFolderId, renameMap);
        this.nodes.set([...current, ...copies]);
      }
      return;
    }
  }

  // ─── Upload pipeline (canonical wiring) ─────────────────────────────────
  onUpload(req: UploadRequestEventDetail, fm: BsFileManagerComponent): void {
    const stamp = new Date().toISOString().slice(0, 10);

    // Optimistic: register the file node immediately. A real app might delay
    // this until the server confirms — depends on UX preference.
    const newNodes: FileSystemNode[] = req.files.map((file, idx) => ({
      id: req.uploads[idx].id,
      parentId: req.targetFolderId,
      name: this.resolveUploadName(file.name, req, idx),
      type: 'file',
      size: file.size,
      mimeType: file.type || 'File',
      iconKey: this.guessIconKey(file.name),
      modifiedAt: stamp,
    }));
    this.nodes.set([...this.nodes(), ...newNodes]);

    // Drive the WC's progress signals from the simulated pipeline.
    req.uploads.forEach((entry) => this.simulateUpload(entry, fm));
  }

  private simulateUpload(entry: UploadEntry, fm: BsFileManagerComponent): void {
    fm.reportUploadProgress(entry.id, 0, 'uploading');
    let progress = 0;
    const tick = setInterval(() => {
      progress = Math.min(100, progress + 12);
      fm.reportUploadProgress(entry.id, progress, progress >= 100 ? 'done' : 'uploading');
      if (progress >= 100) {
        clearInterval(tick);
        setTimeout(() => fm.clearUpload(entry.id), 800);
      }
    }, 180);
  }

  private resolveUploadName(originalName: string, req: UploadRequestEventDetail, idx: number): string {
    const resolution = req.conflictResolutions.find((c) => c.fileName === originalName);
    return resolution?.action === 'rename' && resolution.newName ? resolution.newName : originalName;
  }

  // ─── Error → toast bridge ───────────────────────────────────────────────
  onError(detail: { kind: string; message: string; nodeId?: string }): void {
    const id = `t-${Date.now()}`;
    this.toasts.set([...this.toasts(), { id, message: detail.message }]);
    setTimeout(() => {
      this.toasts.set(this.toasts().filter((t) => t.id !== id));
    }, 4000);
  }

  // ─── Misc ───────────────────────────────────────────────────────────────
  resetData(): void {
    this.nodes.set(makeMockFileSystem());
    this.currentFolderId.set(null);
    this.selectedIds.set([]);
  }

  private simulateBackendDelay(): Promise<void> {
    return new Promise((res) => setTimeout(res, 350));
  }

  private isDescendantOf(node: FileSystemNode, ancestorId: string, all: ReadonlyArray<FileSystemNode>): boolean {
    let cursor: string | null = node.parentId;
    while (cursor !== null) {
      if (cursor === ancestorId) return true;
      cursor = all.find((n) => n.id === cursor)?.parentId ?? null;
    }
    return false;
  }

  private guessIconKey(name: string): string {
    const lower = name.toLowerCase();
    if (lower.match(/\.(pdf)$/)) return 'file-pdf';
    if (lower.match(/\.(docx?|odt)$/)) return 'file-word';
    if (lower.match(/\.(xlsx?|ods)$/)) return 'file-excel';
    if (lower.match(/\.(png|jpe?g|gif|webp|svg)$/)) return 'file-image';
    if (lower.match(/\.(mp3|wav|flac|m4a|ogg)$/)) return 'file-music';
    if (lower.match(/\.(zip|tar|gz|7z|rar)$/)) return 'file-zip';
    if (lower.match(/\.(md|txt)$/)) return 'file-text';
    return 'file';
  }

  // ─── Code-snippet samples (rendered in the integration guide) ───────────
  readonly snippetOperationHandler = dedent`
    // Mark rows busy while the backend processes the change, then clear
    // on completion. Failures route through reportError() → (errorReported).
    onOperation(op: OperationEventDetail, fm: BsFileManagerComponent) {
      if (op.kind === 'rename') {
        fm.markPending(op.nodeId, 'rename');
        this.api.renameNode(op.nodeId, op.newName).then(
          () => { /* update local nodes signal */ },
          err => fm.reportError(err.message, op.nodeId),
        ).finally(() => fm.clearPending(op.nodeId));
      }
      // …handle 'delete', 'new-folder', 'paste' the same way.
    }`;

  readonly snippetUploadPipeline = dedent`
    // The (uploadRequest) event carries pre-registered UploadEntry IDs.
    // Drive your real XHR / fetch upload, then push progress into the WC
    // so it can render the in-flight bar wherever your app prefers.
    onUpload(req: UploadRequestEventDetail, fm: BsFileManagerComponent) {
      for (const entry of req.uploads) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.upload.addEventListener('progress', e =>
          fm.reportUploadProgress(entry.id, Math.round((e.loaded / e.total) * 100), 'uploading'));
        xhr.addEventListener('load', () =>
          fm.reportUploadProgress(entry.id, 100, 'done'));
        xhr.addEventListener('error', () =>
          fm.reportUploadProgress(entry.id, 0, 'error', 'Network error'));
        const fd = new FormData();
        fd.append('file', entry.file);
        xhr.send(fd);
      }
    }`;

  readonly snippetDialogResolver = dedent`
    // Replace the native window.confirm / window.prompt with a bs-modal
    // (or your design system's dialog). The resolver returns a Promise
    // resolving to a boolean (for confirm) or string|null (for prompt).
    dialogResolver: DialogResolver = req => {
      if (req.kind === 'confirm') {
        return this.modalService.confirm({ message: req.message }); // your wrapper
      }
      return this.modalService.prompt({ label: req.label, defaultValue: req.defaultValue });
    };

    // template:
    // <bs-file-manager [dialogResolver]="dialogResolver" ...></bs-file-manager>`;

  readonly snippetConflictResolver = dedent`
    // Asked once per same-name overlap when the user pastes or drops
    // files. Returning 'skip' filters that source out of the operation.
    conflictResolver: ConflictResolver = async req => {
      const choice = await this.modalService.open(ConflictDialogComponent, {
        existingNode: req.existingNode,
        incomingName: req.incomingName,
      });
      // choice is 'replace' | 'skip' | { action: 'rename', newName: string }
      return choice;
    };`;

  readonly snippetLazyTree = dedent`
    // Lazy tree: seed only the top level; load children on first expand.
    // The component merges loaded nodes into its local store and re-renders.
    nodes = signal<FileSystemNode[]>(this.api.getRoots());

    loadChildren = (parentId: string) =>
      this.api.listChildren(parentId); // returns Promise<FileSystemNode[]>

    // template:
    // <bs-file-manager [nodes]="nodes()" [loadChildren]="loadChildren"></bs-file-manager>`;

  readonly snippetI18n = dedent`
    // Overrides are partial — unset keys fall back to English defaults.
    messages = computed<Partial<FileManagerMessages>>(() => ({
      home: this.t('fm.home'),
      newFolder: this.t('fm.new_folder'),
      delete: this.t('fm.delete'),
      deleteConfirm: n => this.t('fm.delete_confirm', { count: n }),
      // …all keys your locale needs
    }));`;

  readonly snippetPerNodePermissions = dedent`
    // Mark a folder read-only by setting allowOperations on the node itself.
    // Each falsy key disables that operation for the node; unset keys fall
    // back to the global [allowOperations] input.
    const node: FileSystemNode = {
      id: 'shared/marketing',
      parentId: null,
      name: 'Marketing (read-only)',
      type: 'folder',
      allowOperations: { rename: false, delete: false, cut: false, newFolder: false },
    };`;

  readonly snippetErrorBridge = dedent`
    // Surface errors from your backend through the (errorReported) event.
    // The component fires this whenever reportError() is called — wire
    // it to your toast / snackbar service.
    onError(detail: { kind: string; message: string; nodeId?: string }) {
      this.toastService.danger(detail.message);
    }

    // template:
    // <bs-file-manager (errorReported)="onError($event)"></bs-file-manager>`;
}

function duplicateBranches(
  all: ReadonlyArray<FileSystemNode>,
  sourceIds: ReadonlyArray<string>,
  targetFolderId: string | null,
  renameMap: Map<string, string> = new Map(),
): FileSystemNode[] {
  const result: FileSystemNode[] = [];
  const remap = new Map<string, string>();

  const byParent = new Map<string | null, FileSystemNode[]>();
  for (const n of all) {
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }

  const stamp = () => `copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  for (const srcId of sourceIds) {
    const src = all.find((n) => n.id === srcId);
    if (!src) continue;
    const newId = stamp();
    remap.set(src.id, newId);
    result.push({
      ...src,
      id: newId,
      parentId: targetFolderId,
      name: renameMap.get(src.id) ?? `${src.name} (copy)`,
    });
    const queue: FileSystemNode[] = byParent.get(src.id)?.slice() ?? [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      const id = stamp();
      remap.set(node.id, id);
      const parentId = remap.get(node.parentId ?? '') ?? targetFolderId;
      result.push({ ...node, id, parentId });
      const grandchildren = byParent.get(node.id) ?? [];
      queue.push(...grandchildren);
    }
  }

  return result;
}

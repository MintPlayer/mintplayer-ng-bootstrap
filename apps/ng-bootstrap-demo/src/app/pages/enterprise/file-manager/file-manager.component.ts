/// <reference types="../../../../types" />

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BsFileManagerComponent,
  type FileSystemNode,
  type FileManagerSelectionMode,
  type FileManagerViewMode,
  type OperationEventDetail,
  type UploadRequestEventDetail,
  type FileManagerIconResolver,
} from '@mintplayer/ng-bootstrap/file-manager';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { makeMockFileSystem } from './mock-data';

interface FakeUpload {
  fileId: string;
  fileName: string;
  progress: number;
}

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileManagerDemoComponent {
  private readonly icons = signal<Map<string, string>>(new Map());

  readonly nodes = signal<FileSystemNode[]>(makeMockFileSystem());
  readonly currentFolderId = signal<string | null>(null);
  readonly selectedIds = signal<string[]>([]);

  readonly allowUpload = signal<boolean>(true);
  readonly viewMode = signal<FileManagerViewMode>('list');
  readonly selectionMode = signal<FileManagerSelectionMode>('multiple');

  readonly inProgressUploads = signal<FakeUpload[]>([]);

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

  onOperation(op: OperationEventDetail): void {
    const current = this.nodes();

    if (op.kind === 'rename') {
      this.nodes.set(current.map((n) => (n.id === op.nodeId ? { ...n, name: op.newName } : n)));
      return;
    }

    if (op.kind === 'delete') {
      // Recursive delete: also drop descendants.
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
      this.nodes.set(current.filter((n) => !drop.has(n.id)));
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
      if (op.mode === 'cut') {
        this.nodes.set(
          current.map((n) => (sourceIds.has(n.id) ? { ...n, parentId: op.targetFolderId } : n)),
        );
      } else {
        // copy — create shallow duplicates of each source node + its descendants.
        const copies = duplicateBranches(current, op.sourceIds, op.targetFolderId);
        this.nodes.set([...current, ...copies]);
      }
      return;
    }
  }

  onUpload(req: UploadRequestEventDetail): void {
    const startUploads: FakeUpload[] = [];
    const newNodes: FileSystemNode[] = [];
    const stamp = new Date().toISOString().slice(0, 10);

    for (const file of req.files) {
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      newNodes.push({
        id,
        parentId: req.targetFolderId,
        name: file.name,
        type: 'file',
        size: file.size,
        mimeType: file.type || 'File',
        iconKey: this.guessIconKey(file.name),
        modifiedAt: stamp,
      });
      startUploads.push({ fileId: id, fileName: file.name, progress: 0 });
    }

    this.nodes.set([...this.nodes(), ...newNodes]);
    this.inProgressUploads.set([...this.inProgressUploads(), ...startUploads]);

    // Simulate progress over 2 seconds.
    const interval = setInterval(() => {
      const current = this.inProgressUploads().map((u) =>
        startUploads.some((s) => s.fileId === u.fileId)
          ? { ...u, progress: Math.min(100, u.progress + 10) }
          : u,
      );
      this.inProgressUploads.set(current);
      const allDone = startUploads.every((s) => {
        const updated = current.find((u) => u.fileId === s.fileId);
        return updated && updated.progress >= 100;
      });
      if (allDone) {
        clearInterval(interval);
        setTimeout(() => {
          this.inProgressUploads.set(
            this.inProgressUploads().filter((u) => !startUploads.some((s) => s.fileId === u.fileId)),
          );
        }, 500);
      }
    }, 200);
  }

  resetData(): void {
    this.nodes.set(makeMockFileSystem());
    this.currentFolderId.set(null);
    this.selectedIds.set([]);
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
}

function duplicateBranches(
  all: ReadonlyArray<FileSystemNode>,
  sourceIds: ReadonlyArray<string>,
  targetFolderId: string | null,
): FileSystemNode[] {
  const result: FileSystemNode[] = [];
  const remap = new Map<string, string>();

  // Build children index for descendant walk.
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
    result.push({ ...src, id: newId, parentId: targetFolderId, name: `${src.name} (copy)` });
    // Walk descendants
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

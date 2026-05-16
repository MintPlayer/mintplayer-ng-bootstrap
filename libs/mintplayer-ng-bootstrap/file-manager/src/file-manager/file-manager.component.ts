import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  ConflictResolver,
  DialogResolver,
  FileManagerMessages,
  FileSystemNode,
  FileManagerSelectionMode,
  FileManagerViewMode,
  MpFileManager,
  NavigateEventDetail,
  NodeOpenEventDetail,
  OperationEventDetail,
  OperationFlags,
  OperationKind,
  SelectionChangeEventDetail,
  UploadEntry,
  UploadRequestEventDetail,
} from '@mintplayer/ng-bootstrap/web-components/file-manager';

// Side-effect import: registers <mp-file-manager> and all the nested WCs.
import '@mintplayer/ng-bootstrap/web-components/file-manager';

export type FileManagerIconResolver = (
  iconKey: string,
  node?: FileSystemNode,
) => string | undefined;

export interface ChildrenLoadedEventDetail {
  parentId: string;
  children: FileSystemNode[];
}

@Component({
  selector: 'bs-file-manager',
  templateUrl: './file-manager.component.html',
  styleUrls: ['./file-manager.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsFileManagerComponent implements AfterViewInit {
  /** All file-system nodes. Consumer mutates this in response to operation events. */
  readonly nodes = input<FileSystemNode[]>([]);

  /** Restrict the tree to descendants of this folder. `null` = show everything. */
  readonly rootFolderId = input<string | null>(null);

  /** Two-way bound: the folder the user has navigated into. */
  readonly currentFolderId = model<string | null>(null);

  /** Show the drag-drop upload overlay on the right pane. */
  readonly allowUpload = input<boolean>(false);

  /** Enable / disable individual operations. `true` enables all. */
  readonly allowOperations = input<boolean | OperationFlags>(true);

  /** Two-way bound list / icons view toggle. */
  readonly viewMode = model<FileManagerViewMode>('list');

  /** Selection mode (none / single / multiple). */
  readonly selectionMode = input<FileManagerSelectionMode>('multiple');

  /** Search input placeholder; falls back to the localised default. */
  readonly searchPlaceholder = input<string>('');

  /** Resolve a node's icon key to an SVG string. */
  readonly iconResolver = input<FileManagerIconResolver | undefined>(undefined);

  /**
   * Lazy-loaded tree: when set, every folder is treated as potentially
   * expandable. The first expansion of each folder invokes this callback;
   * the returned `FileSystemNode[]` is merged into `nodes` automatically.
   */
  readonly loadChildren = input<((parentId: string) => Promise<FileSystemNode[]>) | undefined>(undefined);

  /**
   * Replaces `window.confirm` / `window.prompt` with consumer-provided
   * dialogs (typically a `bs-modal`). When unset, the WC falls back to
   * the native browser dialogs.
   */
  readonly dialogResolver = input<DialogResolver | undefined>(undefined);

  /**
   * Invoked when paste / upload would overwrite an existing entry. When
   * unset, the WC silently replaces (preserving v1 behaviour).
   */
  readonly conflictResolver = input<ConflictResolver | undefined>(undefined);

  /** Partial override of the visible-string set (i18n). */
  readonly messages = input<Partial<FileManagerMessages> | undefined>(undefined);

  /** Two-way bound array of selected node IDs. */
  readonly selectedIds = model<string[]>([]);

  // Outputs
  readonly navigate = output<NavigateEventDetail>();
  readonly nodeOpen = output<NodeOpenEventDetail>();
  readonly selectionChange = output<SelectionChangeEventDetail>();
  readonly uploadRequest = output<UploadRequestEventDetail>();
  readonly operation = output<OperationEventDetail>();
  readonly errorReported = output<{ kind: string; message: string; nodeId?: string }>();
  readonly childrenLoaded = output<ChildrenLoadedEventDetail>();

  readonly fileManagerRef = viewChild<ElementRef<MpFileManager>>('fileManager');

  /**
   * Read-only snapshot of in-flight uploads. Updated by the WC; consumers
   * read it for progress UIs. Use `reportUploadProgress(id, pct, status?, error?)`
   * to push progress from the upload-pipeline callback.
   */
  readonly uploads = signal<ReadonlyArray<UploadEntry>>([]);

  /** Node IDs currently marked pending by `markPending`. */
  readonly pendingOpIds = signal<ReadonlySet<string>>(new Set());

  /** Convenience: number of pending operations. */
  readonly pendingCount = computed(() => this.pendingOpIds().size);

  constructor() {
    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.nodes = this.nodes();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.rootFolderId = this.rootFolderId();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.currentFolderId = this.currentFolderId();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.allowUpload = this.allowUpload();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.allowOperations = this.allowOperations();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.viewMode = this.viewMode();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.selectionMode = this.selectionMode();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      const placeholder = this.searchPlaceholder();
      if (placeholder) el.searchPlaceholder = placeholder;
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.iconResolver = this.iconResolver();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.loadChildren = this.loadChildren();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.dialogResolver = this.dialogResolver();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.conflictResolver = this.conflictResolver();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.messages = this.messages();
    });
  }

  ngAfterViewInit(): void {
    // Effects re-run after view init; nothing else required.
  }

  /** Mark a node as having an operation in flight (rows render busy). */
  markPending(nodeId: string, op: OperationKind): void {
    const el = this.fileManagerRef()?.nativeElement;
    el?.markPending(nodeId, op);
    if (el) this.pendingOpIds.set(el.pendingOpIds);
  }

  /** Clear the pending state on a node. */
  clearPending(nodeId: string): void {
    const el = this.fileManagerRef()?.nativeElement;
    el?.clearPending(nodeId);
    if (el) this.pendingOpIds.set(el.pendingOpIds);
  }

  /** Push progress for an in-flight upload (called from the upload pipeline). */
  reportUploadProgress(
    uploadId: string,
    progress: number,
    status?: UploadEntry['status'],
    error?: string,
  ): void {
    const el = this.fileManagerRef()?.nativeElement;
    el?.reportUploadProgress(uploadId, progress, status, error);
    if (el) this.uploads.set(el.uploads);
  }

  /** Remove a finished/aborted upload from the tracking list. */
  clearUpload(uploadId: string): void {
    const el = this.fileManagerRef()?.nativeElement;
    el?.clearUpload(uploadId);
    if (el) this.uploads.set(el.uploads);
  }

  /** Re-fire `(error)` from anywhere in the consumer's code. */
  reportError(message: string, nodeId?: string): void {
    this.fileManagerRef()?.nativeElement.reportError(message, nodeId);
  }

  onNavigate(event: Event): void {
    const detail = (event as CustomEvent<NavigateEventDetail>).detail;
    this.currentFolderId.set(detail.folderId);
    this.navigate.emit(detail);
  }

  onNodeOpen(event: Event): void {
    this.nodeOpen.emit((event as CustomEvent<NodeOpenEventDetail>).detail);
  }

  onSelectionChange(event: Event): void {
    const detail = (event as CustomEvent<SelectionChangeEventDetail>).detail;
    this.selectedIds.set([...detail.selectedIds]);
    this.selectionChange.emit(detail);
  }

  onUploadRequest(event: Event): void {
    const detail = (event as CustomEvent<UploadRequestEventDetail>).detail;
    // Sync the wrapper's uploads signal to the WC's freshly-registered batch.
    const el = this.fileManagerRef()?.nativeElement;
    if (el) this.uploads.set(el.uploads);
    this.uploadRequest.emit(detail);
  }

  onOperation(event: Event): void {
    this.operation.emit((event as CustomEvent<OperationEventDetail>).detail);
  }

  onErrorReported(event: Event): void {
    this.errorReported.emit((event as CustomEvent<{ kind: string; message: string; nodeId?: string }>).detail);
  }

  onChildrenLoaded(event: Event): void {
    this.childrenLoaded.emit((event as CustomEvent<ChildrenLoadedEventDetail>).detail);
  }
}

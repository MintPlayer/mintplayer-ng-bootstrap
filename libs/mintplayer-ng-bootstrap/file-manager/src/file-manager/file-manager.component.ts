import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type {
  FileSystemNode,
  FileManagerSelectionMode,
  FileManagerViewMode,
  MpFileManager,
  NavigateEventDetail,
  NodeOpenEventDetail,
  OperationEventDetail,
  OperationFlags,
  SelectionChangeEventDetail,
  UploadRequestEventDetail,
} from '@mintplayer/ng-bootstrap/web-components/file-manager';

// Side-effect import: registers <mp-file-manager> and all the nested WCs.
import '@mintplayer/ng-bootstrap/web-components/file-manager';

export type FileManagerIconResolver = (
  iconKey: string,
  node?: FileSystemNode,
) => string | undefined;

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

  /** Search input placeholder. */
  readonly searchPlaceholder = input<string>('Search…');

  /** Resolve a node's icon key to an SVG string. */
  readonly iconResolver = input<FileManagerIconResolver | undefined>(undefined);

  /** Two-way bound array of selected node IDs. */
  readonly selectedIds = model<string[]>([]);

  // Outputs
  readonly navigate = output<NavigateEventDetail>();
  readonly nodeOpen = output<NodeOpenEventDetail>();
  readonly selectionChange = output<SelectionChangeEventDetail>();
  readonly uploadRequest = output<UploadRequestEventDetail>();
  readonly operation = output<OperationEventDetail>();

  readonly fileManagerRef = viewChild<ElementRef<MpFileManager>>('fileManager');

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
      el.searchPlaceholder = this.searchPlaceholder();
    });

    effect(() => {
      const el = this.fileManagerRef()?.nativeElement;
      if (!el) return;
      el.iconResolver = this.iconResolver();
    });
  }

  ngAfterViewInit(): void {
    // Effects re-run after view init; no extra work required.
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
    this.uploadRequest.emit((event as CustomEvent<UploadRequestEventDetail>).detail);
  }

  onOperation(event: Event): void {
    this.operation.emit((event as CustomEvent<OperationEventDetail>).detail);
  }
}

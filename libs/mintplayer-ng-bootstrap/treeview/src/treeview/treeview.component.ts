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
import {
  MpTreeview,
  type IconResolver,
  type TreeNode,
  type TreeNodeCollapseEventDetail,
  type TreeNodeExpandEventDetail,
  type TreeNodeSelectEventDetail,
  type TreeviewSelectionMode,
} from '@mintplayer/ng-bootstrap/web-components/treeview';

// Side-effect import: registers the `<mp-treeview>` custom element.
import '@mintplayer/ng-bootstrap/web-components/treeview';

@Component({
  selector: 'bs-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTreeviewComponent implements AfterViewInit {
  readonly items = input<TreeNode[]>([]);
  readonly expandedIds = model<string[]>([]);
  readonly selectedIds = model<string[]>([]);
  readonly selectionMode = input<TreeviewSelectionMode>('single');
  readonly hideBorders = input<boolean>(false);
  readonly iconResolver = input<IconResolver | undefined>(undefined);

  readonly nodeSelect = output<TreeNodeSelectEventDetail>();
  readonly nodeExpand = output<TreeNodeExpandEventDetail>();
  readonly nodeCollapse = output<TreeNodeCollapseEventDetail>();

  readonly treeviewRef = viewChild<ElementRef<MpTreeview>>('treeview');

  constructor() {
    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      el.items = this.items();
    });

    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      el.expandedIds = this.expandedIds();
    });

    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      el.selectedIds = this.selectedIds();
    });

    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      el.selectionMode = this.selectionMode();
    });

    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      el.hideBorders = this.hideBorders();
    });

    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      el.iconResolver = this.iconResolver();
    });
  }

  ngAfterViewInit(): void {
    // The effect()s above re-run when the view is created; nothing else needed.
  }

  onSelect(event: Event): void {
    const detail = (event as CustomEvent<TreeNodeSelectEventDetail>).detail;
    this.selectedIds.set([...detail.selectedIds]);
    this.nodeSelect.emit(detail);
  }

  onExpand(event: Event): void {
    const detail = (event as CustomEvent<TreeNodeExpandEventDetail>).detail;
    this.expandedIds.set([...detail.expandedIds]);
    this.nodeExpand.emit(detail);
  }

  onCollapse(event: Event): void {
    const detail = (event as CustomEvent<TreeNodeCollapseEventDetail>).detail;
    this.expandedIds.set([...detail.expandedIds]);
    this.nodeCollapse.emit(detail);
  }
}

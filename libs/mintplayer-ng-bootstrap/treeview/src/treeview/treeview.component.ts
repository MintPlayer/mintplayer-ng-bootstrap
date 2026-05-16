import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  EmbeddedViewRef,
  inject,
  input,
  model,
  output,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import {
  MpTreeview,
  type IconResolver,
  type TreeNode,
  type TreeNodeCollapseEventDetail,
  type TreeNodeExpandEventDetail,
  type TreeNodeRenderer,
  type TreeNodeSelectEventDetail,
  type TreeviewSelectionMode,
} from '@mintplayer/ng-bootstrap/web-components/treeview';

// Side-effect import: registers the `<mp-treeview>` custom element.
import '@mintplayer/ng-bootstrap/web-components/treeview';

import { BsTreeviewNodeTemplateDirective } from '../treeview-node-template/treeview-node-template.directive';

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
  readonly nodeTemplate = contentChild(BsTreeviewNodeTemplateDirective);

  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewCache = new Map<string, EmbeddedViewRef<{ $implicit: TreeNode }>>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const view of this.viewCache.values()) view.destroy();
      this.viewCache.clear();
    });

    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      el.items = this.items();
      // Prune cached views for nodes that no longer exist.
      const liveIds = new Set<string>();
      const walk = (nodes: ReadonlyArray<TreeNode>) => {
        for (const n of nodes) {
          liveIds.add(n.id);
          if (n.children) walk(n.children);
        }
      };
      walk(this.items());
      for (const [id, view] of this.viewCache) {
        if (!liveIds.has(id)) {
          view.destroy();
          this.viewCache.delete(id);
        }
      }
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

    // Wire nodeRenderer when a *bsTreeviewNode template is provided.
    effect(() => {
      const el = this.treeviewRef()?.nativeElement;
      if (!el) return;
      const tpl = this.nodeTemplate();
      if (!tpl) {
        el.nodeRenderer = undefined;
        // Destroy any stale views from a previous template.
        for (const view of this.viewCache.values()) view.destroy();
        this.viewCache.clear();
        return;
      }
      el.nodeRenderer = this.buildNodeRenderer(tpl);
    });
  }

  ngAfterViewInit(): void {
    // Effects above re-run as the view is created; nothing else needed.
  }

  private buildNodeRenderer(tpl: BsTreeviewNodeTemplateDirective): TreeNodeRenderer {
    return (node) => {
      let viewRef = this.viewCache.get(node.id);
      if (!viewRef) {
        viewRef = this.viewContainerRef.createEmbeddedView(tpl.templateRef, { $implicit: node });
        this.viewCache.set(node.id, viewRef);
      } else {
        viewRef.context.$implicit = node;
      }
      viewRef.detectChanges();
      const nodes = (viewRef.rootNodes as unknown[]).filter((n): n is Node => n instanceof Node);
      if (nodes.length === 0) return undefined;
      if (nodes.length === 1) return nodes[0];
      const fragment = document.createDocumentFragment();
      for (const n of nodes) fragment.appendChild(n);
      return fragment;
    };
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

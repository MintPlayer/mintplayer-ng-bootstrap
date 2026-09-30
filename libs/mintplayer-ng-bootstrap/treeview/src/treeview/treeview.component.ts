import {
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
} from '@mintplayer/web-components/treeview';

// Side-effect import: registers the `<mp-treeview>` custom element.
import '@mintplayer/web-components/treeview';

import { BsTreeviewNodeTemplateDirective } from '../treeview-node-template/treeview-node-template.directive';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-treeview',
  templateUrl: './treeview.component.html',
  imports: [BsForwardAriaDirective],
  styleUrls: ['./treeview.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTreeviewComponent {
  readonly items = input<TreeNode[]>([]);
  readonly expandedIds = model<string[]>([]);
  readonly selectedIds = model<string[]>([]);
  readonly selectionMode = input<TreeviewSelectionMode>('single');
  readonly hideBorders = input<boolean>(false);
  readonly iconResolver = input<IconResolver | undefined>(undefined);

  readonly nodeSelect = output<TreeNodeSelectEventDetail>();
  readonly nodeExpand = output<TreeNodeExpandEventDetail>();
  readonly nodeCollapse = output<TreeNodeCollapseEventDetail>();

  readonly treeviewRef = viewChild.required<ElementRef<MpTreeview>>('treeview');
  readonly nodeTemplate = contentChild(BsTreeviewNodeTemplateDirective);

  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewCache = new Map<string, EmbeddedViewRef<{ $implicit: TreeNode }>>();

  constructor() {
    this.destroyRef.onDestroy(() => this.destroyCachedViews());

    effect(() => {
      const el = this.treeviewRef().nativeElement;
      el.items = this.items();
      // Prune cached views for nodes that no longer exist.
      const ids = (nodes: ReadonlyArray<TreeNode>): string[] =>
        nodes.flatMap((n) => [n.id, ...ids(n.children ?? [])]);
      const liveIds = new Set(ids(this.items()));
      [...this.viewCache.entries()]
        .filter(([id]) => !liveIds.has(id))
        .map(([id, view]) => {
          view.destroy();
          this.viewCache.delete(id);
        });
    });

    effect(() => {
      const el = this.treeviewRef().nativeElement;
      el.expandedIds = this.expandedIds();
    });

    effect(() => {
      const el = this.treeviewRef().nativeElement;
      el.selectedIds = this.selectedIds();
    });

    effect(() => {
      const el = this.treeviewRef().nativeElement;
      el.selectionMode = this.selectionMode();
    });

    effect(() => {
      const el = this.treeviewRef().nativeElement;
      el.hideBorders = this.hideBorders();
    });

    effect(() => {
      const el = this.treeviewRef().nativeElement;
      el.iconResolver = this.iconResolver();
    });

    // Wire nodeRenderer when a *bsTreeviewNode template is provided.
    effect(() => {
      const el = this.treeviewRef().nativeElement;
      const tpl = this.nodeTemplate();
      // Views cached for a previous template would keep rendering ITS markup: drop them.
      this.destroyCachedViews();
      el.nodeRenderer = tpl ? this.buildNodeRenderer(tpl) : undefined;
    });
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
      fragment.append(...nodes);
      return fragment;
    };
  }

  private destroyCachedViews(): void {
    [...this.viewCache.values()].map((view) => view.destroy());
    this.viewCache.clear();
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

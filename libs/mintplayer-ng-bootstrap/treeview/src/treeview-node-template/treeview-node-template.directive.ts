import { Directive, inject, TemplateRef } from '@angular/core';
import type { TreeNode } from '@mintplayer/web-components/treeview';

/**
 * Marks an `<ng-template>` as the per-node body renderer for `<bs-treeview>`.
 * The template's `$implicit` is the `TreeNode`; consumers can render arbitrary
 * Angular content (icons, badges, custom layout) per node.
 *
 * `mp-treeview` is a light-tier component: the nodes this template produces stay
 * in the document, so this component's own styles, the page's stylesheet and
 * Bootstrap's utility classes all reach them. (Before the light-DOM conversion
 * they were mounted into a shadow root, where none of that applied.)
 *
 * Example:
 * ```html
 * <bs-treeview [items]="nodes()">
 *   <ng-container *bsTreeviewNode="let node">
 *     <span [innerHTML]="iconFor(node)"></span>
 *     <strong>{{ node.label }}</strong>
 *     @if (node.meta?.['badge']) {
 *       <bs-badge [type]="colors.secondary">{{ node.meta!['badge'] }}</bs-badge>
 *     }
 *   </ng-container>
 * </bs-treeview>
 * ```
 *
 * `<bs-badge>` rather than `<span class="badge">`: the workspace's own
 * `_bootstrap.scss` ships only a subset of Bootstrap's partials and `badge` is
 * not among them, so a raw `.badge` class is unstyled on a stock setup. It
 * works, of course, in an app that loads the full framework.
 */
@Directive({ selector: '[bsTreeviewNode]' })
export class BsTreeviewNodeTemplateDirective {
  readonly templateRef = inject<TemplateRef<{ $implicit: TreeNode }>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: BsTreeviewNodeTemplateDirective,
    ctx: unknown,
  ): ctx is { $implicit: TreeNode } {
    return true;
  }
}

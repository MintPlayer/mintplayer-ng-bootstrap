import { Directive, inject, TemplateRef } from '@angular/core';
import type { TreeNode } from '@mintplayer/ng-bootstrap/web-components/treeview';

/**
 * Marks an `<ng-template>` as the per-node body renderer for `<bs-treeview>`.
 * The template's `$implicit` is the `TreeNode`; consumers can render arbitrary
 * Angular content (icons, badges, custom layout) per node.
 *
 * Example:
 * ```html
 * <bs-treeview [items]="nodes()">
 *   <ng-container *bsTreeviewNode="let node">
 *     <span [innerHTML]="iconFor(node)"></span>
 *     <strong>{{ node.label }}</strong>
 *     @if (node.meta?.['badge']) {
 *       <span class="badge bg-secondary">{{ node.meta!['badge'] }}</span>
 *     }
 *   </ng-container>
 * </bs-treeview>
 * ```
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

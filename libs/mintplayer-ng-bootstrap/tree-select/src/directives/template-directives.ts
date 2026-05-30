import { Directive, inject, TemplateRef } from '@angular/core';
import type { TreeNode } from '@mintplayer/web-components/tree-select';

export interface BsTreeSelectNodeContext {
  $implicit: TreeNode;
  query: string;
}

export interface BsTreeSelectValueContext {
  $implicit: TreeNode | TreeNode[] | null;
}

export interface BsTreeSelectItemContext {
  /** The selected node this chip represents. */
  $implicit: TreeNode;
  /** Current search query. */
  query: string;
  /** Deselect this node (drives a custom chip's remove control). */
  remove: () => void;
}

/**
 * Per-chip template for a selected item (multiple / checkbox modes).
 *
 * The wrapper renders the template **once per selected node** and projects it
 * into the WC's `slot="chips"` — so the template's ROOT element must carry
 * `slot="chips"`. Because it's rendered in the consumer's light DOM, Bootstrap
 * classes and directives (incl. Angular CDK `cdkDrag` / `cdkDragHandle`) work.
 *
 * ```html
 * <bs-tree-select mode="multiple" [provider]="p" [(value)]="tags">
 *   <ng-template bsTreeSelectItem let-node let-remove="remove">
 *     <span slot="chips" class="badge text-bg-secondary">
 *       {{ node.label }}
 *       <button type="button" (click)="remove()">&times;</button>
 *     </span>
 *   </ng-template>
 * </bs-tree-select>
 * ```
 */
@Directive({ selector: '[bsTreeSelectItem]' })
export class BsTreeSelectItemTemplateDirective {
  readonly templateRef = inject<TemplateRef<BsTreeSelectItemContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTreeSelectItemTemplateDirective,
    ctx: unknown,
  ): ctx is BsTreeSelectItemContext {
    return true;
  }
}

/** Dropdown row template. Context: `{ $implicit: node, query }`. */
@Directive({ selector: '[bsTreeSelectSuggestion]' })
export class BsTreeSelectSuggestionTemplateDirective {
  readonly templateRef = inject<TemplateRef<BsTreeSelectNodeContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTreeSelectSuggestionTemplateDirective,
    ctx: unknown,
  ): ctx is BsTreeSelectNodeContext {
    return true;
  }
}

/** Full trigger override (button variant). Context: `{ $implicit: value }`. */
@Directive({ selector: '[bsTreeSelectButton]' })
export class BsTreeSelectButtonTemplateDirective {
  readonly templateRef = inject<TemplateRef<BsTreeSelectValueContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTreeSelectButtonTemplateDirective,
    ctx: unknown,
  ): ctx is BsTreeSelectValueContext {
    return true;
  }
}

/** Panel header template. No context. */
@Directive({ selector: '[bsTreeSelectHeader]' })
export class BsTreeSelectHeaderTemplateDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Panel footer template. No context. */
@Directive({ selector: '[bsTreeSelectFooter]' })
export class BsTreeSelectFooterTemplateDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Shown when a search returns no rows. No context. */
@Directive({ selector: '[bsTreeSelectNoResults]' })
export class BsTreeSelectNoResultsTemplateDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Shown when the panel is open with no items / before a search. No context. */
@Directive({ selector: '[bsTreeSelectEnterSearchTerm]' })
export class BsTreeSelectEnterSearchTermTemplateDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}

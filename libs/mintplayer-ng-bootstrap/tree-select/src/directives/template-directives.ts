import { Directive, inject, TemplateRef } from '@angular/core';
import type { TreeNode } from '@mintplayer/web-components/tree-select';

export interface BsTreeSelectNodeContext {
  $implicit: TreeNode;
  query: string;
}

export interface BsTreeSelectValueContext {
  $implicit: TreeNode | TreeNode[] | null;
}

/** Selected-item (chip / single value) template. Context: `{ $implicit: node, query }`. */
@Directive({ selector: '[bsTreeSelectItem]' })
export class BsTreeSelectItemTemplateDirective {
  readonly templateRef = inject<TemplateRef<BsTreeSelectNodeContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTreeSelectItemTemplateDirective,
    ctx: unknown,
  ): ctx is BsTreeSelectNodeContext {
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

import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's breadcrumb (#458 M5): a named `<nav>` landmark around an
 * ordered list of items.
 *
 *   <div class="breadcrumb-host">
 *     <nav aria-label=<label>><ol class="breadcrumb">
 *       <li class="breadcrumb-item" role=listitem>…</li>
 *       <li class="breadcrumb-item active" role=listitem aria-current=page>…</li>
 *     </ol></nav>
 *   </div>
 *
 * Each item's root is its host in Angular and Lit (`bs-breadcrumb-item`), so
 * Bootstrap's `.breadcrumb-item + .breadcrumb-item` separator sees siblings
 * and the item writes `role="listitem"` itself (redundant on React's and
 * Vue's `<li>`). No-JS: static markup, fully functional.
 */
export interface BreadcrumbInputs {
  /** Names the `<nav>` landmark. Override for localisation; a consumer `aria-label` wins. */
  label: string;
}

export interface BreadcrumbView {
  readonly root: CoreBag;
  readonly nav: CoreBag;
  readonly list: CoreBag;
}

export function connectBreadcrumb({ label }: BreadcrumbInputs, consumerLabel: string | null = null): BreadcrumbView {
  return {
    root: { class: 'breadcrumb-host' },
    nav: { 'aria-label': consumerLabel ?? label },
    list: { class: 'breadcrumb' },
  };
}

export const breadcrumbCore = defineCore<BreadcrumbInputs, object, { view: BreadcrumbView }>({
  view: ({ inputs, label }) => ({ view: connectBreadcrumb(inputs, label) }),
});

export interface BreadcrumbItemInputs {
  /** The current page: `aria-current="page"` and Bootstrap's active colour. */
  active: boolean;
}

export function connectBreadcrumbItem({ active }: BreadcrumbItemInputs): CoreBag {
  return {
    class: active ? 'breadcrumb-item active' : 'breadcrumb-item',
    role: 'listitem',
    'aria-current': active ? 'page' : null,
  };
}

export const breadcrumbItemCore = defineCore<BreadcrumbItemInputs, object, { root: CoreBag }>({
  view: ({ inputs }) => ({ root: connectBreadcrumbItem(inputs) }),
});

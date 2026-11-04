import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import {
  connectPagination,
  isPlainClick,
  type PaginationLabels,
  type PaginationSize,
} from './pagination';

/**
 * The pagination as a D10 component (#458 M4). The layout, classes and ARIA
 * come from `connectPagination`; this core adds the selected page as a two-way
 * model and one delegated click listener. Every link carries `data-page` (its
 * target), so the listener needs no per-link wiring in any front.
 */

/** The attribute a link carries naming the page it selects. */
export const PAGINATION_PAGE_ATTR = 'data-page';

export interface PaginationInputs {
  pageNumbers: readonly number[];
  selectedPageNumber: number;
  /** Cap on visible boxes, arrows included (`0` = uncapped). */
  numberOfBoxes: number;
  showArrows: boolean;
  size: PaginationSize;
  /** Localized accessible names; missing keys fall back to English. */
  labels: Partial<PaginationLabels> | null;
  /** Renders every page as a link to this URL, so it works without JavaScript. */
  hrefFor: ((page: number) => string) | null;
}

/** One `<li>` of the rendered list: a gap `<span>`, an `<a>` or a `<button>`, all carrying `link`. */
export interface PaginationRenderEntry {
  readonly key: string;
  readonly item: CoreBag;
  readonly link: CoreBag;
  readonly gap: boolean;
  readonly anchor: boolean;
  /** The anchor's URL, bound explicitly (the bridges refuse URL names in a bag); `undefined` renders none. */
  readonly href: string | undefined;
  readonly text: string;
}

export interface PaginationRenderView {
  readonly root: CoreBag;
  readonly nav: CoreBag;
  readonly list: CoreBag;
  readonly entries: readonly PaginationRenderEntry[];
}

/** `label` is the consumer's `aria-label` on the component: it names the `<nav>`. */
export function connectPaginationRender(inputs: PaginationInputs, selected: number, label: string | null = null): PaginationRenderView {
  const p = connectPagination({ ...inputs, selectedPageNumber: selected });
  return {
    root: { class: 'pagination-host' },
    nav: { ...p.nav, 'aria-label': label ?? p.nav['aria-label'] },
    list: { class: p.listClass },
    entries: p.entries.map((e): PaginationRenderEntry =>
      e.kind === 'gap'
        ? { key: e.key, item: { class: e.itemClass }, link: e.attrs, gap: true, anchor: false, href: undefined, text: e.text }
        : {
            key: e.key,
            item: { class: e.itemClass },
            link: { ...e.attrs, [PAGINATION_PAGE_ATTR]: e.target },
            gap: false,
            anchor: p.tag === 'a',
            href: e.href ?? undefined,
            text: e.text,
          },
    ),
  };
}

export const paginationCore = defineCore<
  PaginationInputs,
  { selectedPageNumber: number },
  { view: PaginationRenderView },
  { selectedPageNumberChange: number }
>({
  state: (inputs) => ({ selectedPageNumber: inputs.selectedPageNumber }),
  view: ({ inputs, state, label }) => ({ view: connectPaginationRender(inputs, state.selectedPageNumber, label) }),
  attach: (api) => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.(`.page-link[${PAGINATION_PAGE_ATTR}]`);
      if (!link || !api.host.contains(link)) return;
      // A modified click on a real link (new tab, new window) belongs to the browser.
      if (link.localName === 'a' && !isPlainClick(event)) return;
      event.preventDefault();
      const page = Number(link.getAttribute(PAGINATION_PAGE_ATTR));
      if (!Number.isFinite(page) || page === api.state().selectedPageNumber) return;
      api.setState({ selectedPageNumber: page });
    };
    api.host.addEventListener('click', onClick);
    return () => api.host.removeEventListener('click', onClick);
  },
  inputsChanged: (api, prev) => {
    const next = api.inputs().selectedPageNumber;
    if (next !== prev.selectedPageNumber) api.setState({ selectedPageNumber: next });
  },
});

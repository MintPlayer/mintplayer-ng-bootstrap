import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's table (#458 M5): a real `<table>` in a host box.
 *
 *   <div class="table-host [table-responsive]">
 *     <table class="table [table-striped] [table-hover] [table-bordered] [mb-0]">…rows…</table>
 *   </div>
 *
 * The consumer's rows are the content. Their attributes (`aria-rowcount` for a
 * virtualised table, `aria-label`, `id`) land on the `<table>` (`mp-attrs`),
 * so there is no row-count input. A responsive table scrolls inline and
 * keeps every cell on one line. No-JS: static markup.
 */
export interface TableInputs {
  /** Scroll horizontally instead of wrapping cells. */
  responsive: boolean;
  striped: boolean;
  hover: boolean;
  bordered: boolean;
}

export interface TableView {
  readonly root: CoreBag;
  readonly table: CoreBag;
}

export function connectTable({ responsive, striped, hover, bordered }: TableInputs): TableView {
  return {
    root: { class: responsive ? 'table-host table-responsive' : 'table-host' },
    table: {
      class: ['table', striped ? 'table-striped' : null, hover ? 'table-hover' : null, bordered ? 'table-bordered' : null, responsive ? 'mb-0' : null]
        .filter(Boolean)
        .join(' '),
    },
  };
}

export const tableCore = defineCore<TableInputs, object, { view: TableView }>({
  view: ({ inputs }) => ({ view: connectTable(inputs) }),
});

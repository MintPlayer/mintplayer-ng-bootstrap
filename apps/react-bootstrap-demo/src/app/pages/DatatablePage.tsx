import { useCallback, useRef, useState } from 'react';
import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type {
  DatatableColumnDef,
  DatatableFetchRequest,
  DatatableFetchResponse,
  SelectionChangeEventDetail,
  DistinctValue,
  FilterChangeDetail,
} from '@mintplayer/web-components/datatable';

// In dev, /api is proxied to localhost:5000 by vite.config.mts. In prod we
// hit the api subdomain (CORS-allowed in apps/api/Program.cs).
const API_BASE = import.meta.env.PROD ? 'https://api.bootstrap.mintplayer.com' : '';

interface Artist {
  id: number;
  name: string;
  genre: string;
  founded: number;
}

const COLUMNS: DatatableColumnDef[] = [
  { name: 'name',    label: 'Name',    sortable: true },
  { name: 'genre',   label: 'Genre',   sortable: true },
  { name: 'founded', label: 'Founded', sortable: true },
];

const ARTISTS: Artist[] = [
  { id: 1, name: 'Radiohead',   genre: 'Alternative', founded: 1985 },
  { id: 2, name: 'Daft Punk',   genre: 'Electronic',  founded: 1993 },
  { id: 3, name: 'Tame Impala', genre: 'Psychedelic', founded: 2007 },
  { id: 4, name: 'Pink Floyd',  genre: 'Progressive', founded: 1965 },
];

const SIMPLE_SOURCE = `<BsDatatable columns={COLUMNS} data={ARTISTS} />`;

const FILTER_SOURCE = `// filterable is the whole opt-in: with no filterRenderer the built-in
// panel renders — search, include/exclude, a checkbox list of the
// column's distinct values, and clear. No React code behind it.
const columns: DatatableColumnDef[] = COLUMNS.map((col) =>
  col.name === 'name'
    ? { ...col, filterable: true,
        filterActive: nameSelection.length > 0,   // visual only; the meaning is yours
        filterSummary: nameSummary }
    : col,
);

const [nameSelection, setNameSelection] = useState<DistinctValue[]>([]);
const [nameInverse, setNameInverse] = useState(false);

const onFilterChange = useCallback((e: CustomEvent<FilterChangeDetail>) => {
  if (e.detail.column !== 'name') return;
  setNameSelection(e.detail.selected);   // [] when the user clears
  setNameInverse(e.detail.inverse);      // the include/exclude toggle
}, []);

// ARTISTS is the UNFILTERED master copy. The value lists are computed from
// the rows the element holds, so filtering the source would remove the
// values needed to widen the filter again.
const rows = ARTISTS.filter(a => {
  if (nameSelection.length === 0) return true;
  const hit = nameSelection.some(v => v.value === a.name);
  return nameInverse ? !hit : hit;
});

// The table does not hold every row? Then it cannot compute a value list,
// and says so rather than guessing from the page it has. Supply one:
//   <BsDatatable distincts={async ({ column, search, signal }) =>
//     (await fetch(\`/api/distincts/\${column}?q=\${search}\`, { signal })).json()} />
// Resolve null for a column to hand that one back to the local path.

<BsDatatable columns={columns} data={rows} onFilterChange={onFilterChange}
  virtualScroll itemSize={40} />`;

// ─── Lazy windowed-fetch demo (real API: 1000 seeded orders) ─────────────────
// One `fetch` callback drives the whole table: the WC calls it for page 1 and
// each window as the user scrolls, reading the grand total from the response.
// No totalRecords prop, no event bridge, no page-1 seeding.

const WINDOWED_PER_PAGE = 25;

interface Order {
  id: number;
  total: number;
  status: string;
  orderDate: string;
}

// The orders endpoint is the query-builder search (the same shape ng-spark
// query-pages use). A match-all = an empty `and` group; the id must be a UUID.
const MATCH_ALL = { kind: 'group', id: '00000000-0000-4000-8000-000000000000', logic: 'and', children: [] };

const ORDER_COLUMNS: DatatableColumnDef[] = [
  { name: 'id',        label: 'Order',  cellRenderer: (r) => `#${(r as Order)?.id}` },
  { name: 'total',     label: 'Total',  cellRenderer: (r) => `€${((r as Order)?.total ?? 0).toFixed(2)}` },
  { name: 'status',    label: 'Status', cellRenderer: (r) => (r as Order)?.status ?? '' },
  { name: 'orderDate', label: 'Date',   cellRenderer: (r) => {
    const d = (r as Order)?.orderDate;
    return d ? new Date(d).toLocaleDateString() : '';
  } },
];

async function fetchOrders(req: DatatableFetchRequest): Promise<DatatableFetchResponse<Order>> {
  const res = await fetch(`${API_BASE}/api/orders/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: MATCH_ALL,
      page: req.page,
      pageSize: req.perPage,
      sort: req.sortColumns.map((s) => ({ field: s.property, direction: s.direction === 'descending' ? 'desc' : 'asc' })),
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return { data: json.items, totalRecords: json.totalCount };
}

const WINDOWED_SOURCE = `// One callback. The WC owns page 1, every window, the total, and the scrollbar.
const fetchOrders = useCallback(
  async (req: DatatableFetchRequest): Promise<DatatableFetchResponse<Order>> => {
    const res = await api.searchOrders(req.page, req.perPage, req.sortColumns);
    return { data: res.items, totalRecords: res.totalCount };
  }, []);

<BsDatatable columns={ORDER_COLUMNS} fetch={fetchOrders} virtualScroll itemSize={40} perPage={25} />`;

// ─── Tree-mode demo ──────────────────────────────────────────────────────────

interface TreeItem {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  headcount: number;
  childCount: number;
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const TREE_COLUMNS: DatatableColumnDef[] = [
  { name: 'name',      label: 'Name',      sortable: true, cellRenderer: (r) => (r as TreeItem)?.name ?? '' },
  { name: 'code',      label: 'Code',      sortable: true, cellRenderer: (r) => (r as TreeItem)?.code ?? '' },
  { name: 'headcount', label: 'Headcount', sortable: true, cellRenderer: (r) => String((r as TreeItem)?.headcount ?? '') },
];

async function fetchTreeItems(parentId: number | null, page: number, perPage: number): Promise<PagedResult<TreeItem>> {
  const url = parentId == null
    ? `${API_BASE}/api/treeItems?page=${page}&perPage=${perPage}`
    : `${API_BASE}/api/treeItems/${parentId}/children?page=${page}&perPage=${perPage}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const TREE_SOURCE = `// Same single callback; it branches on req.parentId for roots vs children.
// The WC lazily paginates roots AND loads children on expand.
const fetchTree = useCallback(
  async (req: DatatableFetchRequest): Promise<DatatableFetchResponse<TreeItem>> => {
    const r = await treeApi.list(req.parentId, req.page, req.perPage);
    return { data: r.items, totalRecords: r.totalCount };
  }, []);

<BsDatatable
  columns={TREE_COLUMNS}
  fetch={fetchTree}
  virtualScroll itemSize={40}
  tree idKey="id" childCountKey="childCount"
  selectionMode="multiple" selectionStrategy="cascading"
  onSelectionChange={(e) => setSelected(e.detail.selectedRows)}
/>`;

export function DatatablePage() {
  const [fetchedPages, setFetchedPages] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<TreeItem[]>([]);

  // Real orders source (1000 seeded rows) + a live fetch log.
  const fetchWindowed = useCallback(
    async (req: DatatableFetchRequest): Promise<DatatableFetchResponse<Order>> => {
      setFetchedPages((prev) => (prev.includes(req.page) ? prev : [...prev, req.page].sort((a, b) => a - b)));
      return fetchOrders(req);
    },
    [],
  );

  const fetchTree = useCallback(
    async (req: DatatableFetchRequest): Promise<DatatableFetchResponse<TreeItem>> => {
      const r = await fetchTreeItems(req.parentId as number | null, req.page, req.perPage);
      return { data: r.items, totalRecords: r.totalCount };
    },
    [],
  );

  const onSelectionChange = useCallback((e: CustomEvent<SelectionChangeEventDetail>) => {
    setSelectedRows(e.detail.selectedRows as TreeItem[]);
  }, []);

  // ─── Column filters ───────────────────────────────────────────────────────
  // The component holds no filter state and defines no predicate model: it
  // collects a selection and emits it. The master copy, the predicate,
  // `filterActive` and `filterSummary` are all this page's.
  const [showFilters, setShowFilters] = useState(true);
  const [nameSelection, setNameSelection] = useState<DistinctValue[]>([]);
  const [nameInverse, setNameInverse] = useState(false);
  const [minFounded, setMinFounded] = useState<number | null>(null);

  // ARTISTS is the UNFILTERED master copy. `data` gets the filtered view, and
  // the value lists are computed from the rows the element holds — so filtering
  // the source would remove the values needed to widen the filter again.
  const filteredArtists = ARTISTS.filter(
    (a) =>
      (nameSelection.length === 0
        ? true
        : nameInverse
          ? !nameSelection.some((v) => v.value === a.name)
          : nameSelection.some((v) => v.value === a.name)) &&
      (minFounded === null ? true : a.founded >= minFounded),
  );

  const nameSummary =
    nameSelection.length === 0
      ? undefined
      : nameSelection.length === 1
        ? nameSelection[0].label
        : `${nameSelection.length} selected`;

  const onFilterChange = useCallback((e: CustomEvent<FilterChangeDetail>) => {
    if (e.detail.column !== 'name') return;
    setNameSelection(e.detail.selected);
    setNameInverse(e.detail.inverse);
  }, []);

  // An override panel. `filterRenderer` returns a DOM Node — the same contract
  // all three frameworks see — so it is built imperatively rather than as JSX,
  // and it must return a STABLE node: the element mounts it once per open, so
  // repainting it is this function's job, not the element's.
  const foundedPanel = useRef<HTMLElement | null>(null);
  const foundedPanelNode = (): Node => {
    if (foundedPanel.current) return foundedPanel.current;
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'form-label small mb-1';
    label.textContent = 'Founded after';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-control form-control-sm';
    label.htmlFor = input.id = 'react-filter-founded';
    input.addEventListener('input', () =>
      setMinFounded(input.value.trim() === '' ? null : Number(input.value)),
    );
    wrap.append(label, input);
    foundedPanel.current = wrap;
    return wrap;
  };

  const filterColumns: DatatableColumnDef[] = COLUMNS.map((col) => {
    if (!showFilters) return col;
    // No filterRenderer: the built-in panel renders. That is the whole opt-in.
    if (col.name === 'name') {
      return {
        ...col,
        filterable: true,
        filterActive: nameSelection.length > 0,
        filterSummary: nameSummary,
      };
    }
    if (col.name === 'founded') {
      return {
        ...col,
        filterable: true,
        filterActive: minFounded !== null,
        filterSummary: minFounded === null ? undefined : `≥ ${minFounded}`,
        filterRenderer: foundedPanelNode,
      };
    }
    return col;
  });

  return (
    <div className="demo-page">
      <h1>Datatable</h1>

      <details className="mt-3 mb-4">
          <summary>Styling — this component renders in the light DOM</summary>
          <p className="mt-2">
              It has no shadow root. Anything you render into it — row templates, node
              templates, cell renderers — stays in the document, so your app's stylesheet,
              your own component styles and Bootstrap's utility classes reach it normally.
          </p>
          <p>
              Its own CSS is scoped at build time onto a <code>data-mps</code> attribute, the
              same device Angular uses for <code>_ngcontent</code>, so it cannot leak out onto
              your markup.
          </p>
          <p className="mb-0">
              The trade-off runs the other way: page CSS now reaches this component's
              internals, exactly as emulated encapsulation behaves everywhere else.
              <code>::part()</code> and <code>::slotted()</code> no longer address it — use
              ordinary CSS selectors instead.
          </p>
      </details>

      <section>
        <h2>Simple in-memory table</h2>
        <BsDatatable columns={COLUMNS} data={ARTISTS} />
        <BsCodeSnippet code={SIMPLE_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Virtual scrolling &mdash; lazy windowed fetch</h2>
        <p>
          Set one <code>fetch</code> callback and the web component owns the
          whole loop: it loads page 1, derives the total from the response, and
          fetches each window only as its rows scroll into view. This list is
          the 1000 seeded orders from <code>apps/api</code>; scroll it and watch
          the fetch log — it never drains every page. No <code>totalRecords</code>{' '}
          prop, no event bridge.
        </p>
        <p className="text-body-secondary">
          <small>
            Pages fetched: <code>{fetchedPages.join(', ') || '—'}</code>{' '}
            ({fetchedPages.length} so far)
          </small>
        </p>

        <BsDatatable
          className="windowed-table"
          columns={ORDER_COLUMNS}
          fetch={fetchWindowed}
          virtualScroll
          itemSize={40}
          perPage={WINDOWED_PER_PAGE}
          rowKey={(row: unknown) => String((row as Order).id)}
        />

        <BsCodeSnippet code={WINDOWED_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Tree mode &mdash; expandable rows</h2>
        <p>
          The same single <code>fetch</code> callback, branching on{' '}
          <code>req.parentId</code> for roots vs. children. The WC paginates
          roots lazily and loads children on expand; selected row objects arrive
          on <code>onSelectionChange</code> as <code>detail.selectedRows</code>.
        </p>

        <BsDatatable
          className="windowed-table"
          columns={TREE_COLUMNS}
          fetch={fetchTree}
          virtualScroll
          itemSize={40}
          tree
          idKey="id"
          childCountKey="childCount"
          rowKey={(row: unknown) => String((row as TreeItem).id)}
          selectionMode="multiple"
          selectionStrategy="cascading"
          onSelectionChange={onSelectionChange}
        />
        {selectedRows.length > 0 && (
          <small className="text-body-secondary">Selected {selectedRows.length} item(s).</small>
        )}

        <BsCodeSnippet code={TREE_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Column filters</h2>
        <p>
          Mark a column <code>filterable</code> and the table grows a second
          header row with a dropdown trigger in that column. Columns without it
          get an empty, correctly-sized cell, so the row stays aligned. Drop them
          all and the row is not rendered at all &mdash; toggle the checkbox to
          see it.
        </p>
        <p>
          A filterable column gets a <strong>built-in panel</strong> for free: a
          search box, an include/exclude toggle, a checkbox list of the column's
          distinct values, and a clear button. It lives in the web component, so
          there is no React code behind it at all &mdash; the <em>Artist</em>{' '}
          column below just sets <code>filterable</code>.
        </p>
        <p>
          When a column needs something else, give it a{' '}
          <code>filterRenderer</code> &mdash; <em>Founded</em> does, because a
          range is not a set of values to tick. It returns a DOM{' '}
          <code>Node</code> (the same contract all three frameworks see) and must
          return a <strong>stable</strong> one: the element mounts it once per
          open, so repainting it is the renderer's job.
        </p>
        <p>
          The panel opens in an overlay at the document root, so it is not
          clipped by the scroll container and not hidden behind the sticky
          header &mdash; this demo runs in virtual-scroll mode, where both would
          otherwise happen.
        </p>
        <p>
          <strong>The component decides nothing about what a filter means.</strong>{' '}
          It collects a selection and emits it on{' '}
          <code>onFilterChange</code>; this page holds the unfiltered master
          copy, applies the selection, and sets <code>filterActive</code> and{' '}
          <code>filterSummary</code> back on the column.
        </p>
        <p className="text-body-secondary small">
          <strong>Keyboard:</strong> <kbd>Tab</kbd> reaches each trigger,{' '}
          <kbd>Enter</kbd>/<kbd>Space</kbd> opens the panel and moves focus to
          its search box, <kbd>Tab</kbd> cycles inside it, <kbd>Esc</kbd> closes
          and returns focus to the trigger. Clearing a filter moves focus back to
          the search box, because the clear button disables itself.
        </p>

        <label className="d-block mb-3">
          <input
            type="checkbox"
            checked={showFilters}
            onChange={(e) => setShowFilters(e.target.checked)}
          />{' '}
          Show the filter row
        </label>

        <BsDatatable
          className="windowed-table"
          columns={filterColumns}
          data={filteredArtists}
          virtualScroll
          itemSize={40}
          rowKey={(row: unknown) => String((row as Artist).id)}
          onFilterChange={onFilterChange}
        />
        <small className="text-body-secondary">
          Showing {filteredArtists.length} of {ARTISTS.length} artists.
        </small>

        <BsCodeSnippet code={FILTER_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

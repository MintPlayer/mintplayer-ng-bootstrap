import { useCallback, useState } from 'react';
import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type {
  DatatableColumnDef,
  DatatableFetchRequest,
  DatatableFetchResponse,
  SelectionChangeEventDetail,
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

  return (
    <div className="demo-page">
      <h1>Datatable</h1>

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
    </div>
  );
}

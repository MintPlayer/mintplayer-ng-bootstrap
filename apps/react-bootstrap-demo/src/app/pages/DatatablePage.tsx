import { useCallback, useState, type ReactNode } from 'react';
import { BsDatatable, cellText } from '@mintplayer/react-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type {
  DatatableColumnDef,
  DatatableFetchRequest,
  DatatableFetchResponse,
  SelectionChangeEventDetail,
  RowEventDetail,
  DatatableFetch,
  DatatableFilter,
  DatatableFilters,
  DistinctValue,
  DistinctValues,
  DistinctsRequest,
  FilterContext,
  FilterOperator,
} from '@mintplayer/react-bootstrap/datatable';
import './DatatablePage.css';

// In dev, /api is proxied to localhost:5000 by vite.config.mts — for the
// browser; the server render (a `stateKey` table's prefetch) has no proxy and
// no origin, so it calls the API directly. In prod we hit the api subdomain
// (CORS-allowed in apps/api/Program.cs).
const API_BASE = import.meta.env.PROD ? 'https://api.bootstrap.mintplayer.com' : import.meta.env.SSR ? 'http://localhost:5000' : '';

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

/** Mirrors the component's operator glyphs for the trigger summary. */
const OPERATOR_SYMBOLS: Record<FilterOperator, string> = {
  eq: '=', neq: '≠', lt: '<', lte: '≤', gt: '>', gte: '≥',
};

// ─── Server-side filters (#448): the apps/api customers endpoints ───────────
interface Customer {
  id: number;
  name: string;
  country: string;
  email: string;
  createdAt: string;
}
type CustomerParams = { search: string };

const postJson = async <T,>(path: string, body: unknown, signal: AbortSignal): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
};

// The request is the API's body as-is: page, perPage, sortColumns, filters, params.
const fetchCustomers: DatatableFetch<Customer, CustomerParams> = ({ signal, ...req }) =>
  postJson('/api/customers/table', req, signal);
const distinctsCustomers = ({ signal, ...req }: DistinctsRequest<CustomerParams>) =>
  postJson<DistinctValues>('/api/customers/distincts', req, signal);

const COUNTRIES: DistinctValue[] = ['BE', 'NL', 'FR', 'DE', 'IT'].map((value) => ({ value, label: value }));
const BENELUX = COUNTRIES.filter((c) => c.value === 'BE' || c.value === 'NL');

function valuesSummary(filter: DatatableFilter | undefined): string | undefined {
  if (!filter?.values.length) return undefined;
  const list = filter.values.length <= 2 ? filter.values.join(', ') : `${filter.values.length} selected`;
  return filter.inverse ? `not ${list}` : list;
}

// A fixed locale and timezone: the server render and the browser must print the
// same text, or hydration fails (and a server's timezone is rarely the reader's).
const INSTANT_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const formatInstant = (iso: string) => `${INSTANT_FORMAT.format(new Date(iso))} UTC`;

function comparisonSummary(filter: DatatableFilter | undefined): string | undefined {
  if (!filter?.operator || filter.operand == null) return undefined;
  return `${OPERATOR_SYMBOLS[filter.operator]} ${formatInstant(String(filter.operand))}`;
}

const SIMPLE_SOURCE = `<BsDatatable columns={COLUMNS} data={ARTISTS} />`;

// Column resizing: the actions column has an icon-only header, so `label`
// names it in the generated strings, and `resizable: false` drops its handle.
const RESIZE_COLUMNS: DatatableColumnDef[] = [
  { name: 'name',    label: 'Name' },
  { name: 'genre',   label: 'Genre' },
  { name: 'actions', label: 'Actions', sortable: false, resizable: false },
];

// The header and cell slots render every column; the others keep their text.
const resizeHeader = ({ column }: { column: DatatableColumnDef }): ReactNode =>
  column.name === 'actions' ? <span aria-hidden="true">⋯</span> : column.label;

const resizeCell = ({ row, column, rowIndex }: { row: unknown; column: DatatableColumnDef; rowIndex: number }): ReactNode =>
  column.name === 'actions'
    ? <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={`Details for ${(row as Artist).name}`}>Details</button>
    : cellText(row, column, rowIndex);

const RESIZE_SOURCE = `const RESIZE_COLUMNS: DatatableColumnDef[] = [
  { name: 'name',  label: 'Name' },
  { name: 'genre', label: 'Genre' },
  // Icon-only header: label names it; resizable: false drops its handle.
  { name: 'actions', label: 'Actions', sortable: false, resizable: false },
];

<BsDatatable
  columns={RESIZE_COLUMNS}
  data={ARTISTS}
  header={({ column }) => column.name === 'actions' ? <span aria-hidden="true">⋯</span> : column.label}
  cell={({ row, column, rowIndex }) => column.name === 'actions'
    ? <button type="button" className="btn btn-sm btn-outline-secondary">Details</button>
    : cellText(row, column, rowIndex)}
/>`;

// Enough rows to overflow a tile-sized parent.
const FILL_ROWS: Artist[] = Array.from({ length: 40 }, (_, i) => ({
  ...ARTISTS[i % ARTISTS.length],
  id: i + 1,
}));

const FILL_SOURCE = `// The parent needs a definite height.
<div style={{ height: 225 }}>
  <BsDatatable fill pagination perPage={20} columns={COLUMNS} data={rows} />
</div>`;

// Enough rows that virtual scroll has something to window: 10k is the S4
// measurement (tools/e2e-shared/virtual-window-suites.ts).
const FILL_VIRTUAL_ROWS: Artist[] = Array.from({ length: 10_000 }, (_, i) => ({
  ...ARTISTS[i % ARTISTS.length],
  id: i + 1,
}));

const FILL_VIRTUAL_SOURCE = `// The parent's height replaces the default virtual viewport.
<div style={{ height: 225 }}>
  <BsDatatable fill virtualScroll itemSize={40} columns={COLUMNS} data={rows} />
</div>`;

const FILTER_SOURCE = `// The table owns the filter UI and the filters model; the SERVER filters.
const [filters, setFilters] = useState<DatatableFilters>({
  Country: { values: ['BE', 'NL'], inverse: false },
});
const [search, setSearch] = useState('');

const columns: DatatableColumnDef[] = [
  // A checkbox list of the column's distinct values, from \`distincts\`.
  { name: 'name', filterable: true },
  { name: 'country', filterable: true, filterMode: 'custom' },
  // Local time in the box, a UTC instant on the wire.
  { name: 'createdAt', filterable: true, filterMode: 'comparison',
    filterInputType: 'datetime', filterOperators: ['gte', 'lt'] },
];

// The API takes { page, perPage, sortColumns, filters, params } as-is.
const fetchCustomers: DatatableFetch<Customer, Params> = ({ signal, ...req }) =>
  postJson('/api/customers/table', req, signal);
// Faceted: computed over the OTHER columns' filters.
const distincts = ({ signal, ...req }: DistinctsRequest<Params>) =>
  postJson<DistinctValues>('/api/customers/distincts', req, signal);

// stateKey + <MpTransferStateProvider> in the entries: the server render
// fetches page 1 and the browser hydrates with it, fetching nothing.
<BsDatatable pagination stateKey="customers"
  columns={columns} fetch={fetchCustomers} distincts={distincts}
  filters={filters} onFiltersChange={setFilters}
  fetchParams={{ search }}
  filter={({ ctx }) => (
    <button type="button" onClick={() => ctx.apply(BENELUX, false)}>Benelux</button>
  )} />`;

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
  { name: 'id',        label: 'Order',  format: (r) => `#${(r as Order)?.id}` },
  { name: 'total',     label: 'Total',  format: (r) => `€${((r as Order)?.total ?? 0).toFixed(2)}` },
  { name: 'status',    label: 'Status' },
  { name: 'orderDate', label: 'Date',   format: (r) => {
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

const WINDOWED_SOURCE = `// One callback. The table owns page 1, every window, the total, and the scrollbar.
const fetchOrders = useCallback(
  async (req: DatatableFetchRequest): Promise<DatatableFetchResponse<Order>> => {
    const res = await api.searchOrders(req.page, req.perPage, req.sortColumns);
    return { data: res.items, totalRecords: res.totalCount };
  }, []);

<BsDatatable columns={ORDER_COLUMNS} fetch={fetchOrders} virtualScroll itemSize={40} perPage={25} />`;

// ─── Row selection: 'checkbox' mode ──────────────────────────────────────────
// A row click only opens the row; the checkbox cell alone selects. The
// selection is keyed by rowKey (stable — required with `fetch`), so it
// survives paging and sorting.

const orderRowKey = (row: unknown) => String((row as Order).id);
const orderRowLabel = (row: unknown) => `order #${(row as Order).id}`;

const SELECTION_SOURCE = `<BsDatatable
  columns={ORDER_COLUMNS}
  fetch={fetchOrders}          // stable: module-level or useCallback
  perPage={10}
  selectionMode="checkbox"     // row click opens; the checkbox cell selects
  rowKey={(row) => String(row.id)}       // stable identity, required with fetch
  rowLabel={(row) => \`order #\${row.id}\`} // "Select order #12"
  onRowClick={(d) => setOpened(d.row)}
  onSelectedIdsChange={setSelectedIds}
/>`;

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
  { name: 'name',      label: 'Name',      sortable: true },
  { name: 'code',      label: 'Code',      sortable: true },
  { name: 'headcount', label: 'Headcount', sortable: true },
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
  onSelectionChanged={(d) => setSelected(d.selectedRows)}
/>`;

export function DatatablePage() {
  const [fetchedPages, setFetchedPages] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<TreeItem[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [openedOrder, setOpenedOrder] = useState<Order | null>(null);

  const onOrderRowClick = useCallback((d: RowEventDetail) => {
    setOpenedOrder(d.row as Order);
  }, []);

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

  const onSelectionChange = useCallback((d: SelectionChangeEventDetail) => {
    setSelectedRows(d.selectedRows as TreeItem[]);
  }, []);

  // ─── Column filters (server-side, #448) ───────────────────────────────────
  // The table owns the filter UI and the `filters` model, never the filtering:
  // `fetch` sends the model to the API, which turns it into SQL. The page only
  // says what a filter is called (`filterSummary`).
  const [showFilters, setShowFilters] = useState(true);
  // Seeded, so the server render already filters.
  const [customerFilters, setCustomerFilters] = useState<DatatableFilters>({ country: { values: ['BE', 'NL'], inverse: false } });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTotal, setCustomerTotal] = useState<number | null>(null);
  const fetchCustomersCounted = useCallback<DatatableFetch<Customer, CustomerParams>>(
    (req) =>
      fetchCustomers(req).then((response) => {
        setCustomerTotal(response.totalRecords);
        return response;
      }),
    [],
  );

  // An override panel, for the case neither built-in question fits: the
  // column sets `filterMode: 'custom'` and the table's `filter` slot renders
  // it, as ordinary JSX. Its commands write the same `filters` model.
  //
  // The classes below are the PAGE's (see DatatablePage.css). Bootstrap's
  // `.form-control` is only styled inside `bs-*` components in this workspace.
  const filterPanel = ({ ctx }: { column: DatatableColumnDef; ctx: FilterContext }): ReactNode => (
    <div className="demo-filter-panel">
      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => ctx.apply(BENELUX, false)}>Benelux</button>
      {COUNTRIES.map((country) => (
        <button key={String(country.value)} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => ctx.apply([country], false)}>
          {country.label}
        </button>
      ))}
      <button type="button" className="btn btn-sm btn-link" onClick={() => ctx.clear()}>Everywhere</button>
    </div>
  );

  const customerColumns: DatatableColumnDef[] = [
    // No filterMode: the built-in value list, listed by the API (`distincts`).
    { name: 'name', label: 'Name', filterable: showFilters, filterSummary: valuesSummary(customerFilters['name']) },
    { name: 'email', label: 'Email', sortable: false },
    { name: 'country', label: 'Country', filterable: showFilters, filterMode: 'custom', filterSummary: valuesSummary(customerFilters['country']) },
    // A datetime comparison: typed in local time, sent as a UTC instant.
    {
      name: 'createdAt',
      label: 'Created',
      filterable: showFilters,
      filterMode: 'comparison',
      filterInputType: 'datetime',
      filterOperators: ['gte', 'lt'],
      format: (row) => formatInstant((row as Customer).createdAt),
      filterSummary: comparisonSummary(customerFilters['createdAt']),
    },
  ];

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
        <h2>Column resizing</h2>
        <p>
          Drag the line at the right edge of a header, or focus it and use the
          keyboard. A tap or click on it, without dragging, opens the resize
          options instead.
        </p>
        <ul>
          <li><kbd>Tab</kbd> reaches each column's resize handle.</li>
          <li><kbd>&larr;</kbd> / <kbd>&rarr;</kbd> make the column 10&nbsp;px narrower or wider.</li>
          <li><kbd>Enter</kbd> opens the resize options: narrower, wider, fit to content, reset. <kbd>Esc</kbd> closes them.</li>
        </ul>
        <BsDatatable columns={RESIZE_COLUMNS} data={ARTISTS} header={resizeHeader} cell={resizeCell} />
        <BsCodeSnippet code={RESIZE_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Fit a sized parent</h2>
        <p>
          With <code>fill</code> the table fits a parent with a fixed height,
          such as a dashboard tile. The header stays at the top and the
          pagination at the bottom; only the rows scroll in between.
          Horizontally the whole table scrolls as one.
        </p>
        <div className="fill-parent border rounded">
          <BsDatatable fill pagination perPage={20} columns={COLUMNS} data={FILL_ROWS} />
        </div>
        <BsCodeSnippet code={FILL_SOURCE} language="tsx" />
        <p>
          <code>fill</code> combines with <code>virtualScroll</code>: the
          parent's height replaces the default virtual viewport, and only the
          rows in view are rendered.
        </p>
        <div className="fill-parent border rounded" data-demo="fill-virtual">
          <BsDatatable fill virtualScroll itemSize={40} columns={COLUMNS} data={FILL_VIRTUAL_ROWS} />
        </div>
        <BsCodeSnippet code={FILL_VIRTUAL_SOURCE} language="tsx" />
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
        <h2>Row selection &mdash; checkbox mode</h2>
        <p>
          With <code>selectionMode="checkbox"</code> a row click only opens the
          row (<code>onRowClick</code>); selecting happens in the checkbox cell
          alone. The selection is keyed by <code>rowKey</code> &mdash; which must
          be stable with <code>fetch</code> &mdash; so it survives paging and
          sorting: tick a row, change page, and the count keeps it.{' '}
          <code>rowLabel</code> names each checkbox for assistive technology.
        </p>
        <p className="text-body-secondary">
          <small>
            Selected {selectedOrderIds.length} order(s) &middot; Opened:{' '}
            {openedOrder ? `#${openedOrder.id}` : '—'}
          </small>
        </p>

        <BsDatatable
          columns={ORDER_COLUMNS}
          fetch={fetchOrders}
          perPage={10}
          selectionMode="checkbox"
          rowKey={orderRowKey}
          rowLabel={orderRowLabel}
          onRowClick={onOrderRowClick}
          selectedIds={selectedOrderIds}
          onSelectedIdsChange={setSelectedOrderIds}
        />

        <p className="text-body-secondary">
          <small>
            <strong>Keyboard, rows:</strong> <kbd>↑</kbd>/<kbd>↓</kbd> move
            between rows; <kbd>→</kbd>/<kbd>←</kbd> expand/collapse a tree row.
            In <code>checkbox</code> mode <kbd>Enter</kbd> opens the row and{' '}
            <kbd>Space</kbd> toggles its checkbox. In the default{' '}
            <code>multiple</code> mode <kbd>Enter</kbd> or <kbd>Space</kbd>{' '}
            selects the row and then opens it, with <kbd>Ctrl</kbd> toggling and{' '}
            <kbd>Shift</kbd> selecting a range &mdash; the same modifiers as a
            click.
          </small>
        </p>

        <BsCodeSnippet code={SELECTION_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Tree mode &mdash; expandable rows</h2>
        <p>
          The same single <code>fetch</code> callback, branching on{' '}
          <code>req.parentId</code> for roots vs. children. The WC paginates
          roots lazily and loads children on expand; selected row objects arrive
          on <code>onSelectionChanged</code> as <code>detail.selectedRows</code>.
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
          onSelectionChanged={onSelectionChange}
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
          distinct values, and a clear button. It lives in the shared core, so
          there is no React code behind it at all &mdash; the <em>Name</em>{' '}
          column below just sets <code>filterable</code>, with its values listed
          by the server (<code>distincts</code>).
        </p>
        <p>
          A checkbox list is the wrong question for a quantity, so a column can
          ask a different one: <code>filterMode: 'comparison'</code> renders an
          operator (=, &ne;, &lt;, &le;, &gt;, &ge;) and a single input, with{' '}
          <code>filterInputType</code> choosing <code>number</code> (the
          default), <code>date</code> (a calendar day) or <code>datetime</code>{' '}
          (local time in, a UTC instant out) &mdash; the <em>Created</em> column
          below. Still the built-in panel: no slot, no styling of your own.
          Narrow the list with <code>filterOperators</code> when only some
          operators make sense.
        </p>
        <p>
          Quantities only &mdash; there is no <code>text</code> input type and no{' '}
          <code>contains</code> operator. Comparing strings is either exact
          match, which the value list already does better, or a lexicographic{' '}
          <code>&gt;</code>, which is almost never what anyone means.{' '}
          <strong>A free-text filter is a nest-your-own case</strong>, below.
        </p>
        <p>
          You pick the mode per column and the component never infers it: a
          numeric column is often an enum and a string column is often ordinal,
          so any guess would be wrong about half the time.
        </p>
        <p>
          When neither built-in question fits, set{' '}
          <code>filterMode: 'custom'</code> on the column and render the panel
          in the table's <code>filter</code> slot &mdash; <em>Country</em> does.
          The slot receives the column and a context with the loaded values and
          the search, apply and clear commands.{' '}
          <strong>That markup is yours, so you style it</strong> &mdash;
          Bootstrap's <code>.form-control</code> is only styled inside{' '}
          <code>bs-*</code> components here.
        </p>
        <p>
          The panel is a native popover in the top layer, so it is not clipped
          by the scroll container and not hidden behind the sticky header.
        </p>
        <p>
          <strong>Filtering happens on the server.</strong> The table keeps the
          active filters in a two-way <code>filters</code> /{' '}
          <code>onFiltersChange</code> model and sends them, with your own{' '}
          <code>fetchParams</code>, in every <code>fetch</code> and{' '}
          <code>distincts</code> request; it never filters rows itself. With{' '}
          <code>stateKey</code> and an <code>MpTransferStateProvider</code>, the
          server render fetches the first page and the browser hydrates with it.
        </p>
        <p>
          Because the browser skips <code>fetch</code> for that first page,
          anything else your <code>fetch</code> reads off its response (the
          columns a server query decides, say) belongs in the response&apos;s{' '}
          <code>extra</code>, which must be JSON. <code>onPageLoad</code> hands it
          back for every page the table applies, with <code>seeded: true</code>{' '}
          for the page that came from the server. Record it in{' '}
          <code>fetch</code> too: <code>onPageLoad</code> fires in the browser
          only.
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

        <label className="form-label" htmlFor="react-customer-search">
          Name contains (sent as <code>fetchParams</code>)
        </label>
        <input
          id="react-customer-search"
          type="search"
          className="form-control mb-3"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
        />

        <BsDatatable
          pagination
          stateKey="customers"
          perPage={10}
          columns={customerColumns}
          fetch={fetchCustomersCounted}
          distincts={distinctsCustomers}
          filters={customerFilters}
          onFiltersChange={setCustomerFilters}
          fetchParams={{ search: customerSearch }}
          rowKey={(row: unknown) => String((row as Customer).id)}
          filter={filterPanel}
        />
        <small className="text-body-secondary">
          {customerTotal ?? '…'} customer(s) match. The model: <code>{JSON.stringify(customerFilters)}</code>
        </small>

        <BsCodeSnippet code={FILTER_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

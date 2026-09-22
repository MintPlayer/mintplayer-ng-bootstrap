<script setup lang="ts">
import { computed, ref } from 'vue';
import { BsDatatable } from '@mintplayer/vue-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type {
  DatatableColumnDef,
  DatatableFetchRequest,
  DatatableFetchResponse,
  SelectionChangeEventDetail,
} from '@mintplayer/web-components/datatable';

// Dev: /api is proxied to localhost:5000 by vite.config; prod hits the API
// subdomain (CORS-allowed in apps/api/Program.cs).
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

const SIMPLE_SOURCE = `<BsDatatable :columns="COLUMNS" :data="ARTISTS" />`;

// ─── Column filters ─────────────────────────────────────────────────────────
// The filter values live in this view, not in the table. `filterRenderer`
// returns a DOM Node — the same contract the Angular and React wrappers
// satisfy — so it is built imperatively rather than as a template.
const showFilters = ref(true);
const nameFilter = ref('');
const minFounded = ref<number | null>(null);
const artistRowKey = (row: unknown) => String((row as Artist).id);

const filteredArtists = computed(() =>
  ARTISTS.filter(
    (a) =>
      (nameFilter.value ? a.name.toLowerCase().includes(nameFilter.value.toLowerCase()) : true) &&
      (minFounded.value === null ? true : a.founded >= minFounded.value),
  ),
);

function textFilterNode(value: string, label: string, onInput: (v: string) => void): Node {
  const wrap = document.createElement('div');
  const lbl = document.createElement('label');
  lbl.className = 'form-label small mb-1';
  lbl.textContent = label;
  const input = document.createElement('input');
  input.className = 'form-control form-control-sm';
  input.value = value;
  input.id = lbl.htmlFor = `filter-${label.replace(/\W+/g, '-').toLowerCase()}`;
  input.addEventListener('input', () => onInput(input.value));
  wrap.append(lbl, input);
  return wrap;
}

const filterColumns = computed<DatatableColumnDef[]>(() =>
  COLUMNS.map((col) => {
    if (!showFilters.value) return col;
    if (col.name === 'name') {
      return {
        ...col,
        filterable: true,
        filterActive: nameFilter.value.length > 0,
        filterRenderer: () =>
          textFilterNode(nameFilter.value, 'Name contains', (v) => (nameFilter.value = v)),
      };
    }
    if (col.name === 'founded') {
      return {
        ...col,
        filterable: true,
        filterActive: minFounded.value !== null,
        filterRenderer: () =>
          textFilterNode(minFounded.value === null ? '' : String(minFounded.value), 'Founded after', (v) => {
            minFounded.value = v.trim() === '' ? null : Number(v);
          }),
      };
    }
    return col;
  }),
);

const FILTER_SOURCE = `<!-- The filter row follows the column defs: no column carries a
     filterRenderer, no second header row is rendered. -->
<BsDatatable :columns="filterColumns" :data="filteredArtists" virtualScroll :itemSize="40" />

<script setup lang="ts">
const nameFilter = ref('');

// filterRenderer returns a DOM Node, so it is built imperatively.
const filterColumns = computed<DatatableColumnDef[]>(() =>
  COLUMNS.map(col => col.name === 'name'
    ? { ...col,
        filterable: true,
        filterActive: nameFilter.value.length > 0,  // visual only; meaning is yours
        filterRenderer: () => {
          const input = document.createElement('input');
          input.className = 'form-control form-control-sm';
          input.value = nameFilter.value;
          input.addEventListener('input', () => (nameFilter.value = input.value));
          return input;
        } }
    : col),
);

// The table holds no filter state and defines no predicate model.
const filteredArtists = computed(() =>
  ARTISTS.filter(a => a.name.toLowerCase().includes(nameFilter.value.toLowerCase())));
<\/script>`;

// ─── Lazy windowed-fetch demo (real API: 1000 seeded orders) ──────────────
// One `fetch` callback drives the whole table: the WC calls it for page 1 and
// each window as the user scrolls, reading the grand total from the response.
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

const fetchedPages = ref<number[]>([]);

async function fetchWindowed(req: DatatableFetchRequest): Promise<DatatableFetchResponse<Order>> {
  if (!fetchedPages.value.includes(req.page)) {
    fetchedPages.value = [...fetchedPages.value, req.page].sort((a, b) => a - b);
  }
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

const WINDOWED_SOURCE = `<!-- One callback; the WC owns page 1, every window, the total + scrollbar. -->
<BsDatatable :columns="ORDER_COLUMNS" :fetch="fetchWindowed" :virtualScroll="true" :itemSize="40" :perPage="25" />`;

// ─── Tree-mode demo ──────────────────────────────────────────────────────

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

async function fetchTree(req: DatatableFetchRequest): Promise<DatatableFetchResponse<TreeItem>> {
  const r = await fetchTreeItems(req.parentId as number | null, req.page, req.perPage);
  return { data: r.items, totalRecords: r.totalCount };
}

const rowKey = (row: unknown) => String((row as TreeItem).id);
const selectedRows = ref<TreeItem[]>([]);

function onSelectionChange(detail: SelectionChangeEventDetail) {
  selectedRows.value = detail.selectedRows as TreeItem[];
}

const TREE_SOURCE = `<!-- The same callback, branching on req.parentId for roots vs children. -->
<BsDatatable
  :columns="TREE_COLUMNS"
  :fetch="fetchTree"
  :virtualScroll="true" :itemSize="40"
  :tree="true" idKey="id" childCountKey="childCount"
  selectionMode="multiple" selectionStrategy="cascading"
  @selectionChange="onSelectionChange"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Datatable</h1>

    <details class="mt-3 mb-4">
        <summary>Styling — this component renders in the light DOM</summary>
        <p class="mt-2">
            It has no shadow root. Anything you render into it — row templates, node
            templates, cell renderers — stays in the document, so your app's stylesheet,
            your own component styles and Bootstrap's utility classes reach it normally.
        </p>
        <p>
            Its own CSS is scoped at build time onto a <code>data-mps</code> attribute, the
            same device Angular uses for <code>_ngcontent</code>, so it cannot leak out onto
            your markup.
        </p>
        <p class="mb-0">
            The trade-off runs the other way: page CSS now reaches this component's
            internals, exactly as emulated encapsulation behaves everywhere else.
            <code>::part()</code> and <code>::slotted()</code> no longer address it — use
            ordinary CSS selectors instead.
        </p>
    </details>

    <section>
      <h2>Simple in-memory table</h2>
      <BsDatatable :columns="COLUMNS" :data="ARTISTS" />
      <BsCodeSnippet :code="SIMPLE_SOURCE" language="html" />
    </section>

    <section>
      <h2>Virtual scrolling &mdash; lazy windowed fetch</h2>
      <p>
        Set one <code>fetch</code> callback and the web component owns the whole
        loop: it loads page 1, derives the total from the response, and fetches
        each window only as its rows scroll into view. This list is the 1000
        seeded orders from <code>apps/api</code>; scroll it and watch the fetch
        log — it never drains every page. No <code>totalRecords</code> prop, no
        event bridge.
      </p>
      <p class="text-body-secondary">
        <small>
          Pages fetched: <code>{{ fetchedPages.join(', ') || '—' }}</code>
          ({{ fetchedPages.length }} so far)
        </small>
      </p>

      <BsDatatable
        class="windowed-table"
        :columns="ORDER_COLUMNS"
        :fetch="fetchWindowed"
        :virtualScroll="true"
        :itemSize="40"
        :perPage="WINDOWED_PER_PAGE"
        :rowKey="rowKey"
      />

      <BsCodeSnippet :code="WINDOWED_SOURCE" language="html" />
    </section>

    <section>
      <h2>Tree mode &mdash; expandable rows</h2>
      <p>
        The same single <code>fetch</code> callback, branching on
        <code>req.parentId</code> for roots vs. children. The WC paginates roots
        lazily and loads children on expand; selected row objects arrive on
        <code>@selectionChange</code> as <code>detail.selectedRows</code>.
      </p>

      <BsDatatable
        class="windowed-table"
        :columns="TREE_COLUMNS"
        :fetch="fetchTree"
        :virtualScroll="true"
        :itemSize="40"
        :tree="true"
        idKey="id"
        childCountKey="childCount"
        :rowKey="rowKey"
        selectionMode="multiple"
        selectionStrategy="cascading"
        @selectionChange="onSelectionChange"
      />
      <small v-if="selectedRows.length" class="text-body-secondary">
        Selected {{ selectedRows.length }} item(s).
      </small>

      <BsCodeSnippet :code="TREE_SOURCE" language="html" />
    </section>

    <section>
      <h2>Column filters</h2>
      <p>
        Give a column a <code>filterRenderer</code> and the table grows a second
        header row with a dropdown trigger in that column. Columns without one
        get an empty, correctly-sized cell, so the row stays aligned. Drop them
        all and the row is not rendered at all &mdash; toggle the checkbox to
        see it.
      </p>
      <p>
        The panel opens in an overlay at the document root, so it is not clipped
        by the scroll container and not hidden behind the sticky header &mdash;
        this demo runs in virtual-scroll mode, where both would otherwise
        happen.
      </p>
      <p>
        <strong>The component decides nothing about what a filter means.</strong>
        There is no predicate model and no filter state: this view owns the
        values below and simply re-filters its own data.
      </p>
      <p class="text-body-secondary small">
        <strong>Keyboard:</strong> <kbd>Tab</kbd> reaches each trigger,
        <kbd>Enter</kbd>/<kbd>Space</kbd> opens the panel and moves focus into
        it, <kbd>Tab</kbd> cycles inside it, <kbd>Esc</kbd> closes and returns
        focus to the trigger.
      </p>

      <label class="d-block mb-3">
        <input type="checkbox" v-model="showFilters" />
        Show the filter row
      </label>

      <BsDatatable
        class="windowed-table"
        :columns="filterColumns"
        :data="filteredArtists"
        virtualScroll
        :itemSize="40"
        :rowKey="artistRowKey"
      />
      <small class="text-body-secondary">
        Showing {{ filteredArtists.length }} of {{ ARTISTS.length }} artists.
      </small>

      <BsCodeSnippet :code="FILTER_SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
/* Bounded viewport so the windowed-fetch datatable demo actually scrolls. */
.windowed-table {
  display: block;
  height: 360px;
}
</style>

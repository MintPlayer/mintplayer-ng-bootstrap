<script setup lang="ts">
import { ref } from 'vue';
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
  </div>
</template>

<style scoped>
/* Bounded viewport so the windowed-fetch datatable demo actually scrolls. */
.windowed-table {
  display: block;
  height: 360px;
}
</style>

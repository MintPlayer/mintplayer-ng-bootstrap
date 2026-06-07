<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { BsDatatable } from '@mintplayer/vue-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type {
  DatatableColumnDef,
  TreeFetchRequestDetail,
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
  { id: 1, name: 'Radiohead',     genre: 'Alternative', founded: 1985 },
  { id: 2, name: 'Daft Punk',     genre: 'Electronic',  founded: 1993 },
  { id: 3, name: 'Tame Impala',   genre: 'Psychedelic', founded: 2007 },
  { id: 4, name: 'Pink Floyd',    genre: 'Progressive', founded: 1965 },
];

const SIMPLE_SOURCE = `<BsDatatable :columns="COLUMNS" :data="ARTISTS" />`;

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
  { name: 'name',      label: 'Name',      sortable: true,
    cellRenderer: (row) => (row as TreeItem)?.name ?? '' },
  { name: 'code',      label: 'Code',      sortable: true,
    cellRenderer: (row) => (row as TreeItem)?.code ?? '' },
  { name: 'headcount', label: 'Headcount', sortable: true,
    cellRenderer: (row) => String((row as TreeItem)?.headcount ?? '') },
];

async function fetchTreeItems(parentId: number | null, page = 1, perPage = 100): Promise<PagedResult<TreeItem>> {
  const url = parentId == null
    ? `${API_BASE}/api/treeItems?page=${page}&perPage=${perPage}`
    : `${API_BASE}/api/treeItems/${parentId}/children?page=${page}&perPage=${perPage}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// The WC's perPage must equal the fetch perPage, or its root-page math
// misaligns with the loaded rows. One constant drives both.
const TREE_PER_PAGE = 100;

const roots = ref<TreeItem[]>([]);
const rootTotal = ref(0);
const expandedIds = ref<Set<unknown>>(new Set());
const selectedIds = ref<string[]>([]);
const tableRef = ref<InstanceType<typeof BsDatatable> | null>(null);

onMounted(async () => {
  try {
    const result = await fetchTreeItems(null, 1, TREE_PER_PAGE);
    roots.value = result.items;
    rootTotal.value = result.totalCount; // enables lazy root windowing past page 1
  } catch {
    // Best-effort demo — surfaces the empty table if the api isn't up.
  }
});

// Fires for tree children (non-null parentId) AND lazy root windows (parentId
// null, page ≥ 2). Page 1 is seeded by onMounted, so only pages ≥ 2 reach here
// for the root level. Key on the REQUESTED page (detail.page).
async function onFetchRequest(detail: TreeFetchRequestDetail) {
  try {
    const result = await fetchTreeItems(detail.parentId as number | null, detail.page, detail.perPage);
    tableRef.value?.setFetchResponse(detail.parentId, {
      data: result.items,
      totalRecords: result.totalCount,
      page: detail.page,
      perPage: result.pageSize,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[BsDatatable] tree fetch failed', e);
  }
}

const rowKey = (row: unknown) => String((row as TreeItem).id);

// ─── Lazy windowed-fetch demo ────────────────────────────────────────────
// A large synthetic dataset with simulated latency so the windowing is
// visible: only the pages near the viewport are fetched, with placeholder
// rows holding the scroll position until each window arrives. The Vue wrapper
// is a thin passthrough, so the consumer orchestrates: seed page 1 into
// `data`, bridge `@fetchRequest` (parentId null = a flat window), and call
// `invalidateData()` on the ref to drop the cache.

interface WindowedArtist { id: number; name: string; genre: string; founded: number; }

const WINDOWED_TOTAL = 5000;
const WINDOWED_PER_PAGE = 25;
const GENRES = ['Alternative', 'Electronic', 'Psychedelic', 'Progressive', 'Jazz', 'Hip-Hop'];

const WINDOWED_COLUMNS: DatatableColumnDef[] = [
  { name: 'name',    label: 'Name',    cellRenderer: (row) => (row as WindowedArtist)?.name ?? '' },
  { name: 'genre',   label: 'Genre',   cellRenderer: (row) => (row as WindowedArtist)?.genre ?? '' },
  { name: 'founded', label: 'Founded', cellRenderer: (row) => String((row as WindowedArtist)?.founded ?? '') },
];

function makeWindowedRow(id: number): WindowedArtist {
  return { id, name: `Artist #${id}`, genre: GENRES[id % GENRES.length], founded: 1960 + (id % 60) };
}

async function fetchWindowedPage(page: number, perPage: number): Promise<PagedResult<WindowedArtist>> {
  await new Promise((resolve) => setTimeout(resolve, 400)); // simulated server latency
  const start = (page - 1) * perPage;
  const items = Array.from(
    { length: Math.max(0, Math.min(perPage, WINDOWED_TOTAL - start)) },
    (_, i) => makeWindowedRow(start + i + 1),
  );
  return { items, totalCount: WINDOWED_TOTAL, page, pageSize: perPage };
}

const windowedPage1 = ref<WindowedArtist[]>([]);
const windowedTotal = ref(0);
const fetchedPages = ref<number[]>([]);
const windowedRef = ref<InstanceType<typeof BsDatatable> | null>(null);
const windowedTotalPages = Math.ceil(WINDOWED_TOTAL / WINDOWED_PER_PAGE);

async function loadWindowedPage1() {
  fetchedPages.value = [1];
  const result = await fetchWindowedPage(1, WINDOWED_PER_PAGE);
  windowedPage1.value = result.items;
  windowedTotal.value = result.totalCount;
}

onMounted(loadWindowedPage1);

// Flat window fetch-request (parentId null, page >= 2). Key setFetchResponse
// on the REQUESTED page so a normalising server can't deadlock the window.
async function onWindowedFetchRequest(detail: TreeFetchRequestDetail) {
  if (detail.parentId != null || detail.page <= 1) return;
  if (!fetchedPages.value.includes(detail.page)) {
    fetchedPages.value = [...fetchedPages.value, detail.page].sort((a, b) => a - b);
  }
  const result = await fetchWindowedPage(detail.page, detail.perPage);
  windowedRef.value?.setFetchResponse(null, {
    data: result.items,
    totalRecords: result.totalCount,
    page: detail.page,
    perPage: result.pageSize,
  });
}

function refreshWindowed() {
  windowedRef.value?.invalidateData(); // drop the cached pages…
  void loadWindowedPage1();             // …and re-seed page 1
}

const WINDOWED_SOURCE = `<!-- Flat virtual + windowed fetch. The wrapper is a passthrough, so the
     consumer seeds page 1, bridges the flat fetch-request, and invalidates. -->
<BsDatatable
  ref="windowedRef"
  :columns="WINDOWED_COLUMNS"
  :data="windowedPage1"
  :totalRecords="windowedTotal"
  :virtualScroll="true"
  :itemSize="40"
  :perPage="25"
  :rowKey="rowKey"
  @fetchRequest="onWindowedFetchRequest"
/>

// In <script setup>: parentId === null is a flat window (page >= 2). Key
// setFetchResponse on the REQUESTED page (detail.page), not the server-echoed
// page, so a normalising server can't deadlock the window.
async function onWindowedFetchRequest(detail) {
  if (detail.parentId != null || detail.page <= 1) return;
  const r = await fetchPage(detail.page, detail.perPage);
  windowedRef.value?.setFetchResponse(null, {
    data: r.items, totalRecords: r.totalCount, page: detail.page, perPage: r.pageSize,
  });
}`;

const TREE_SOURCE = `<!-- Tree mode: virtual scroll + lazy children + cascading selection. -->
<BsDatatable
  ref="tableRef"
  :columns="TREE_COLUMNS"
  :data="roots"
  :virtualScroll="true"
  :itemSize="40"
  :tree="true"
  idKey="id"
  childCountKey="childCount"
  :rowKey="rowKey"
  v-model:expandedIds="expandedIds"
  selectionMode="multiple"
  selectionStrategy="cascading"
  v-model:selectedIds="selectedIds"
  @fetchRequest="onFetchRequest"
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
        With <code>virtualScroll</code> + a server-paged source the table
        fetches only the pages whose rows are in (or near) the viewport.
        Scroll through this {{ WINDOWED_TOTAL }}-row list and watch the fetch
        log: it never drains all {{ windowedTotalPages }} pages up front
        &mdash; placeholder rows hold the scroll position until each window
        arrives. The Vue wrapper is a thin passthrough, so the consumer seeds
        page 1, bridges <code>@fetchRequest</code> for flat windows
        (<code>parentId === null</code>), and calls <code>invalidateData()</code>
        on the ref to drop the cache.
      </p>

      <p class="text-body-secondary">
        <small>
          Pages fetched: <code>{{ fetchedPages.join(', ') || '—' }}</code>
          ({{ fetchedPages.length }} of {{ windowedTotalPages }})
        </small>
        <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="refreshWindowed">
          Refresh (invalidateData)
        </button>
      </p>

      <BsDatatable
        ref="windowedRef"
        class="windowed-table"
        :columns="WINDOWED_COLUMNS"
        :data="windowedPage1"
        :totalRecords="windowedTotal"
        :virtualScroll="true"
        :itemSize="40"
        :perPage="WINDOWED_PER_PAGE"
        :rowKey="rowKey"
        @fetchRequest="onWindowedFetchRequest"
      />

      <BsCodeSnippet :code="WINDOWED_SOURCE" language="html" />
    </section>

    <section>
      <h2>Tree mode &mdash; expandable rows</h2>
      <p>
        Click a chevron to expand a row. Children load lazily on first
        expand and stay cached for subsequent collapse/expand cycles.
        Placeholder rows reserve viewport space while the fetch is in
        flight so the scrollbar stays accurate. Cascading selection:
        checking a parent selects all currently-loaded descendants.
      </p>

      <BsDatatable
        ref="tableRef"
        :columns="TREE_COLUMNS"
        :data="roots"
        :totalRecords="rootTotal"
        :perPage="TREE_PER_PAGE"
        :virtualScroll="true"
        :itemSize="40"
        :tree="true"
        idKey="id"
        childCountKey="childCount"
        :rowKey="rowKey"
        v-model:expandedIds="expandedIds"
        selectionMode="multiple"
        selectionStrategy="cascading"
        v-model:selectedIds="selectedIds"
        @fetchRequest="onFetchRequest"
        style="height: 480px; display: block"
      />
      <small v-if="selectedIds.length" class="text-body-secondary">
        Selected {{ selectedIds.length }} item(s).
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

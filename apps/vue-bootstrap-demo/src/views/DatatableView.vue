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

const roots = ref<TreeItem[]>([]);
const expandedIds = ref<Set<unknown>>(new Set());
const selectedIds = ref<string[]>([]);
const tableRef = ref<InstanceType<typeof BsDatatable> | null>(null);

onMounted(async () => {
  try {
    const result = await fetchTreeItems(null);
    roots.value = result.items;
  } catch {
    // Best-effort demo — surfaces the empty table if the api isn't up.
  }
});

async function onFetchRequest(detail: TreeFetchRequestDetail) {
  if (detail.parentId == null) return; // root fetch handled by onMounted above
  try {
    const result = await fetchTreeItems(detail.parentId as number, detail.page, detail.perPage);
    tableRef.value?.setFetchResponse(detail.parentId, {
      data: result.items,
      totalRecords: result.totalCount,
      page: result.page,
      perPage: result.pageSize,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[BsDatatable] tree fetch failed', e);
  }
}

const rowKey = (row: unknown) => String((row as TreeItem).id);

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

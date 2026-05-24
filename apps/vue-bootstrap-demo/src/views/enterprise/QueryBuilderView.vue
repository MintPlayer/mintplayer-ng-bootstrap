<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { BsQueryBuilder } from '@mintplayer/vue-bootstrap/query-builder';
import { BsDatatable } from '@mintplayer/vue-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import {
  emptyGroup,
  type EntitySchema,
  type Expression,
  type SortDescriptor,
} from '@mintplayer/web-components/query-builder';
import type { DatatableColumnDef } from '@mintplayer/web-components/datatable';

// In dev, /api is proxied to localhost:5000 by vite.config.mts. In prod we
// POST cross-origin to the API subdomain (CORS-allowed in apps/api/Program.cs).
const API_BASE = import.meta.env.PROD ? 'https://api.bootstrap.mintplayer.com' : '';

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const schema = ref<EntitySchema[]>([]);
const rootEntity = ref('orders');
const query = ref<Expression>(emptyGroup());
const selectedFields = ref<string[]>([]);
const sortBy = ref<SortDescriptor[]>([]);
const results = ref<Record<string, unknown>[]>([]);
const totalCount = ref(0);
const busy = ref(false);
const error = ref<string | null>(null);

async function refreshSchema() {
  try {
    const r = await fetch(`${API_BASE}/api/${rootEntity.value}/schema`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    schema.value = await r.json();
  } catch {
    error.value = 'Could not fetch schema. Is apps/api running on :5000?';
  }
}

onMounted(refreshSchema);
watch(rootEntity, refreshSchema);

const columns = computed<DatatableColumnDef[]>(() => {
  const entity = schema.value.find((s) => s.name === rootEntity.value);
  if (!entity) return [];
  const projectable = entity.fields.filter((f) => f.type !== 'relation');
  const visible = selectedFields.value.length === 0
    ? projectable
    : projectable.filter((f) => selectedFields.value.includes(f.name));
  return visible.map((f) => ({ name: f.name, label: f.label, sortable: true }));
});

// 250 ms debounce + AbortController cancel-prior. Same shape as the
// React demo so editing a condition value coalesces fast typing into
// one network round-trip and a stale request never overwrites fresh
// results.
let abortCtl: AbortController | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function runSearch(signal: AbortSignal) {
  busy.value = true;
  error.value = null;
  try {
    const body = {
      query: query.value,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page: 1,
      pageSize: 50,
      sort: sortBy.value.length ? sortBy.value : undefined,
    };
    const r = await fetch(`${API_BASE}/api/${rootEntity.value}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!r.ok) {
      const detail = await r.json().catch(() => null);
      throw new Error(detail?.code ? `${detail.code}: ${detail.detail ?? ''}` : `HTTP ${r.status}`);
    }
    const data: PagedResult<Record<string, unknown>> = await r.json();
    results.value = data.items;
    totalCount.value = data.totalCount;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    error.value = e instanceof Error ? e.message : 'Request failed';
    results.value = [];
    totalCount.value = 0;
  } finally {
    busy.value = false;
  }
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    abortCtl?.abort();
    abortCtl = new AbortController();
    void runSearch(abortCtl.signal);
  }, 250);
}

watch([query, rootEntity, sortBy], scheduleSearch, { deep: true });
onMounted(scheduleSearch);

const SOURCE = `<BsQueryBuilder
  v-model="query"
  :schema="schema"
  :root-entity="rootEntity"
  multi-entity-picker-enabled
  :selected-fields="selectedFields"
  :sort-by="sortBy"
  show-preview
  show-saved-queries
/>
<!-- watch([query, rootEntity, sortBy], ...) auto-fires the search. -->
<BsDatatable :columns="columns" :data="results" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Query builder</h1>
    <p class="text-body-secondary">
      Visual filter builder over a typed entity schema. Builds a JSON
      expression tree, POSTs it to <code>/api/&lt;entity&gt;/search</code>,
      renders results in a <code>&lt;BsDatatable&gt;</code>. The frontend
      ships only the JSON wire format — SQL/OData translation lives in
      <code>apps/api</code>.
    </p>

    <section>
      <h2>Orders schema</h2>
      <BsQueryBuilder
        v-model="query"
        :schema="schema"
        :root-entity="rootEntity"
        multi-entity-picker-enabled
        :selected-fields="selectedFields"
        :sort-by="sortBy"
        show-preview
        show-saved-queries
        @root-entity-change="(e: CustomEvent<{ rootEntity: string }>) => rootEntity = e.detail.rootEntity"
        @selected-fields-change="(e: CustomEvent<{ selectedFields: string[] }>) => selectedFields = e.detail.selectedFields"
        @sort-by-change="(e: CustomEvent<{ sortBy: SortDescriptor[] }>) => sortBy = e.detail.sortBy"
      />

      <div class="d-flex gap-2 align-items-center my-3">
        <span v-if="busy" class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true" />
        <span class="text-secondary">
          {{ totalCount }} match{{ totalCount === 1 ? '' : 'es' }}
        </span>
        <span v-if="error" class="text-danger ms-2">⚠ {{ error }}</span>
      </div>

      <BsDatatable :columns="columns" :data="results" />

      <details class="mt-3">
        <summary>Current expression tree</summary>
        <pre class="mb-0"><code>{{ JSON.stringify(query, null, 2) }}</code></pre>
      </details>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

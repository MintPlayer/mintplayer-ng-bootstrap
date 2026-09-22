<script setup lang="ts">
import { computed, ref } from 'vue';
import { BsDatatable } from '@mintplayer/vue-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type {
  DatatableColumnDef,
  DatatableFetchRequest,
  DatatableFetchResponse,
  SelectionChangeEventDetail,
  DistinctValue,
  FilterChangeDetail,
  FilterOperator,
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
// The component holds no filter state and defines no predicate model: it
// collects a selection and emits it. The master copy, the predicate,
// `filterActive` and `filterSummary` all live in this view.
const showFilters = ref(true);
const nameSelection = ref<DistinctValue[]>([]);
const nameInverse = ref(false);
const foundedOperator = ref<FilterOperator>('gte');
const foundedOperand = ref<number | null>(null);
const genreStartsWith = ref('');
const artistRowKey = (row: unknown) => String((row as Artist).id);

/** Mirrors the component's operator glyphs for the trigger summary. */
const OPERATOR_SYMBOLS: Record<FilterOperator, string> = {
  eq: '=', neq: '≠', lt: '<', lte: '≤', gt: '>', gte: '≥',
};

function compare(value: number, operator: FilterOperator, operand: number): boolean {
  switch (operator) {
    case 'eq': return value === operand;
    case 'neq': return value !== operand;
    case 'lt': return value < operand;
    case 'lte': return value <= operand;
    case 'gt': return value > operand;
    case 'gte': return value >= operand;
  }
}

// ARTISTS is the UNFILTERED master copy. `:data` gets the filtered view, and
// the value lists are computed from the rows the element holds — so filtering
// the source would remove the values needed to widen the filter again.
const filteredArtists = computed(() =>
  ARTISTS.filter(
    (a) =>
      (nameSelection.value.length === 0
        ? true
        : nameInverse.value
          ? !nameSelection.value.some((v) => v.value === a.name)
          : nameSelection.value.some((v) => v.value === a.name)) &&
      (foundedOperand.value === null
        ? true
        : compare(a.founded, foundedOperator.value, foundedOperand.value)) &&
      (genreStartsWith.value === ''
        ? true
        : a.genre.toLowerCase().startsWith(genreStartsWith.value.toLowerCase())),
  ),
);

const nameSummary = computed(() => {
  const selected = nameSelection.value;
  if (selected.length === 0) return undefined;
  if (selected.length === 1) return selected[0].label;
  return `${selected.length} selected`;
});

// One handler, one discriminated union: switching on `mode` means the
// comparison branch cannot read `selected` and the values branch cannot read
// `operand` — the compiler enforces the real runtime shape.
function onFilterChange(detail: FilterChangeDetail) {
  if (detail.mode === 'values' && detail.column === 'name') {
    nameSelection.value = detail.selected;
    nameInverse.value = detail.inverse;
    return;
  }
  if (detail.mode === 'comparison' && detail.column === 'founded') {
    foundedOperator.value = detail.operator;
    foundedOperand.value = detail.operand === null ? null : Number(detail.operand);
  }
}

// An override panel, for the case neither built-in question fits.
// `filterRenderer` returns a DOM Node — the same contract all three frameworks
// see — and it must return a STABLE one: the element mounts it once per open,
// so repainting it is this function's job.
//
// The classes below are styled in a NON-scoped <style> block on purpose: Vue's
// `scoped` works by stamping `data-v-*` onto nodes it renders from the
// template, and this node is built imperatively, so a scoped rule would match
// nothing. Bootstrap's `.form-control` would not help either — it is only
// styled inside `bs-*` components in this workspace.
let genrePanel: HTMLElement | null = null;
function genrePanelNode(): Node {
  if (genrePanel) return genrePanel;
  const wrap = document.createElement('div');
  wrap.className = 'demo-filter-panel';
  const lbl = document.createElement('label');
  lbl.className = 'demo-filter-label';
  lbl.textContent = 'Genre starts with';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'demo-filter-input';
  input.id = lbl.htmlFor = 'vue-filter-genre';
  input.addEventListener('input', () => {
    genreStartsWith.value = input.value;
  });
  wrap.append(lbl, input);
  genrePanel = wrap;
  return wrap;
}

const filterColumns = computed<DatatableColumnDef[]>(() =>
  COLUMNS.map((col) => {
    if (!showFilters.value) return col;
    // No filterRenderer and no filterMode: the built-in value list renders.
    // That is the whole opt-in.
    if (col.name === 'name') {
      return {
        ...col,
        filterable: true,
        filterActive: nameSelection.value.length > 0,
        filterSummary: nameSummary.value,
      };
    }
    // Comparison mode: still the built-in panel, asking a different question.
    if (col.name === 'founded') {
      return {
        ...col,
        filterable: true,
        filterMode: 'comparison' as const,
        filterInputType: 'number' as const,
        filterActive: foundedOperand.value !== null,
        filterSummary:
          foundedOperand.value === null
            ? undefined
            : `${OPERATOR_SYMBOLS[foundedOperator.value]} ${foundedOperand.value}`,
      };
    }
    if (col.name === 'genre') {
      return {
        ...col,
        filterable: true,
        filterActive: genreStartsWith.value !== '',
        filterSummary: genreStartsWith.value || undefined,
        filterRenderer: genrePanelNode,
      };
    }
    return col;
  }),
);

const FILTER_SOURCE = `<!-- filterable is the whole opt-in: with no filterRenderer the
     built-in panel renders (search, include/exclude, a checkbox list of
     the column's distinct values, clear). No Vue code behind it. -->
<BsDatatable :columns="filterColumns" :data="filteredArtists"
  @filterChange="onFilterChange" virtualScroll :itemSize="40" />

<script setup lang="ts">
const nameSelection = ref<DistinctValue[]>([]);
const nameInverse = ref(false);

// One handler, one discriminated union: switching on \`mode\` means the
// comparison branch cannot read \`selected\`, and vice versa.
function onFilterChange(detail: FilterChangeDetail) {
  if (detail.mode === 'values' && detail.column === 'name') {
    nameSelection.value = detail.selected;   // [] when the user clears
    nameInverse.value = detail.inverse;      // the include/exclude toggle
  } else if (detail.mode === 'comparison' && detail.column === 'founded') {
    foundedOperator.value = detail.operator; // 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte'
    foundedOperand.value = detail.operand as number | null;   // null = cleared
  }
}

// A column asking a different question — still the built-in panel, no renderer.
const founded = { ...col, filterable: true,
  filterMode: 'comparison', filterInputType: 'number' };

const filterColumns = computed<DatatableColumnDef[]>(() =>
  COLUMNS.map(col => col.name === 'name'
    ? { ...col,
        filterable: true,
        filterActive: nameSelection.value.length > 0,  // visual only; meaning is yours
        filterSummary: nameSummary.value }
    : col),
);

// ARTISTS is the UNFILTERED master copy: the value lists are computed from
// the rows the element holds, so filtering the source would remove the
// values needed to widen the filter again.
const filteredArtists = computed(() => ARTISTS.filter(a => {
  if (nameSelection.value.length === 0) return true;
  const hit = nameSelection.value.some(v => v.value === a.name);
  return nameInverse.value ? !hit : hit;
}));

// The table does not hold every row? Then it cannot compute a value list,
// and says so rather than guessing from the page it has. Supply one with
// :distincts, and resolve null for a column to hand it back to the local path.
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
        there is no Vue code behind it at all &mdash; the <em>Name</em> column
        below just sets <code>filterable</code>.
      </p>
      <p>
        A checkbox list is the wrong question for a quantity, so a column can ask
        a different one: <code>filterMode: 'comparison'</code> renders an
        operator (=, &ne;, &lt;, &le;, &gt;, &ge;) and a single input, with
        <code>filterInputType</code> choosing <code>number</code> (the default)
        or <code>date</code> &mdash; the <em>Founded</em> column below. Still the
        built-in panel: no renderer, no styling of your own. Narrow the list with
        <code>filterOperators</code> when only some operators make sense.
      </p>
      <p>
        Quantities only &mdash; there is no <code>text</code> input type and no
        <code>contains</code> operator. Comparing strings is either exact match,
        which the value list already does better, or a lexicographic
        <code>&gt;</code>, which is almost never what anyone means.
        <strong>A free-text filter is a nest-your-own case</strong>, below.
      </p>
      <p>
        You pick the mode per column and the component never infers it: a numeric
        column is often an enum and a string column is often ordinal, so any
        guess would be wrong about half the time.
      </p>
      <p>
        When neither built-in question fits, give the column a
        <code>filterRenderer</code> &mdash; <em>Genre</em> does. It returns a DOM
        <code>Node</code> (the same contract all three frameworks see) and must
        return a <strong>stable</strong> one: the element mounts it once per
        open, so repainting it is the renderer's job.
        <strong>That markup is yours, so you style it</strong> &mdash; and in Vue
        it needs a <em>non-scoped</em> rule, because an imperatively built node
        never gets the <code>data-v-*</code> attribute <code>scoped</code>
        matches on.
      </p>
      <p>
        The panel opens in an overlay at the document root, so it is not clipped
        by the scroll container and not hidden behind the sticky header &mdash;
        this demo runs in virtual-scroll mode, where both would otherwise
        happen.
      </p>
      <p>
        <strong>The component decides nothing about what a filter means.</strong>
        It collects a selection and emits it on <code>filterChange</code>; this
        view holds the unfiltered master copy, applies the selection, and sets
        <code>filterActive</code> and <code>filterSummary</code> back on the
        column.
      </p>
      <p class="text-body-secondary small">
        <strong>Keyboard:</strong> <kbd>Tab</kbd> reaches each trigger,
        <kbd>Enter</kbd>/<kbd>Space</kbd> opens the panel and moves focus to its
        search box, <kbd>Tab</kbd> cycles inside it, <kbd>Esc</kbd> closes and
        returns focus to the trigger. Clearing a filter moves focus back to the
        search box, because the clear button disables itself.
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
        @filterChange="onFilterChange"
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

<!--
  NOT scoped, deliberately. `scoped` works by stamping `data-v-*` onto the nodes
  Vue renders from this template; the override filter panel is built
  imperatively in the script above, so it carries no such attribute and a scoped
  rule would match nothing. The panel also renders into the document-root
  overlay, outside this component's DOM entirely.

  The spacing mirrors the built-in panel's, so the two do not read as different
  widgets when a user opens them one after the other.
-->
<style>
.demo-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 12rem;
  padding: 0.25rem;
}

.demo-filter-label {
  margin: 0;
  font-size: 0.875em;
  color: var(--bs-secondary-color, #6c757d);
}

.demo-filter-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 0.25rem 0.5rem;
  background-color: var(--bs-body-bg, #fff);
  color: inherit;
  border: 1px solid var(--bs-border-color, rgba(0, 0, 0, 0.125));
  border-radius: 0.25rem;
  font: inherit;
}

.demo-filter-input:focus-visible {
  outline: 2px solid var(--bs-focus-ring-color, #0d6efd);
  outline-offset: 1px;
}
</style>

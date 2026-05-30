<script setup lang="ts">
import { ref } from 'vue';
import {
  BsTreeSelect,
  InMemoryTreeSelectProvider,
} from '@mintplayer/vue-bootstrap/tree-select';
import type {
  TreeNode,
  TreeSelectProvider,
  NodePage,
  NodeRequest,
} from '@mintplayer/vue-bootstrap/tree-select';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

// Dev: /api is proxied to localhost:5000 by vite.config; prod hits the API
// subdomain (CORS-allowed in apps/api/Program.cs).
const API_BASE = import.meta.env.PROD ? 'https://api.bootstrap.mintplayer.com' : '';

// ─── HTTP provider (server search + lazy children) ───────────────────────────

interface TreeItemDto {
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

const PER_PAGE = 50;

const toNode = (dto: TreeItemDto): TreeNode => ({
  id: String(dto.id),
  label: dto.name,
  lazy: dto.childCount > 0,
  meta: { code: dto.code },
});

const toPage = (result: PagedResult<TreeItemDto>): NodePage => ({
  nodes: result.items.map(toNode),
  hasMore: result.page * result.pageSize < result.totalCount,
});

const pageFor = (req: NodeRequest) => Math.floor((req.offset ?? 0) / PER_PAGE) + 1;

async function fetchPage(url: string, req: NodeRequest): Promise<NodePage> {
  const r = await fetch(url, { signal: req.signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return toPage(await r.json());
}

const httpProvider: TreeSelectProvider = {
  loadRoots: (req) =>
    fetchPage(`${API_BASE}/api/treeItems?page=${pageFor(req)}&perPage=${PER_PAGE}`, req),
  loadChildren: (parentId, req) =>
    fetchPage(
      `${API_BASE}/api/treeItems/${parentId}/children?page=${pageFor(req)}&perPage=${PER_PAGE}`,
      req,
    ),
  search: (query, req) =>
    fetchPage(
      `${API_BASE}/api/treeItems/search?q=${encodeURIComponent(query)}&page=${pageFor(req)}&perPage=${PER_PAGE}`,
      req,
    ),
};

// ─── In-memory sample tree (multiple / checkbox demos) ───────────────────────

const SAMPLE_TREE: TreeNode[] = [
  {
    id: 'eng', label: 'Engineering', children: [
      { id: 'eng-fe', label: 'Frontend', children: [
        { id: 'eng-fe-web', label: 'Web' },
        { id: 'eng-fe-mobile', label: 'Mobile' },
      ]},
      { id: 'eng-be', label: 'Backend', children: [
        { id: 'eng-be-api', label: 'API' },
        { id: 'eng-be-data', label: 'Data' },
      ]},
    ],
  },
  {
    id: 'design', label: 'Design', children: [
      { id: 'design-ux', label: 'UX' },
      { id: 'design-brand', label: 'Brand' },
    ],
  },
  { id: 'ops', label: 'Operations' },
];

const inMemoryProvider = new InMemoryTreeSelectProvider(SAMPLE_TREE, { pageSize: 50 });

// ─── v-model refs ────────────────────────────────────────────────────────────

const singleValue = ref<TreeNode | TreeNode[] | null>(null);
const multipleValue = ref<TreeNode | TreeNode[] | null>([]);
const checkboxValue = ref<TreeNode | TreeNode[] | null>([]);
const buttonValue = ref<TreeNode | TreeNode[] | null>(null);

// ─── source snippets ─────────────────────────────────────────────────────────

const SINGLE_SOURCE = `<BsTreeSelect
  v-model="value"
  :provider="httpProvider"
  mode="single"
  placeholder="Search departments…"
/>`;

const MULTIPLE_SOURCE = `<BsTreeSelect
  v-model="value"
  :provider="inMemoryProvider"
  mode="multiple"
  placeholder="Pick teams…"
/>`;

const CHECKBOX_SOURCE = `<BsTreeSelect
  v-model="value"
  :provider="inMemoryProvider"
  mode="checkbox"
  :cascade-select="true"
  placeholder="Select with cascade…"
/>`;

const BUTTON_SOURCE = `<BsTreeSelect
  v-model="value"
  :provider="inMemoryProvider"
  mode="single"
  variant="button"
  :show-clear="true"
  placeholder="Choose a department"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Tree select</h1>
    <p class="text-body-secondary">
      A hierarchical, async, searchable select. Data is supplied through a
      <code>TreeSelectProvider</code> (HTTP or in-memory); selection is held as
      full <code>TreeNode</code> objects bound with <code>v-model</code>.
    </p>

    <section>
      <h2>Single &mdash; server search</h2>
      <p class="text-body-secondary">
        Roots, lazy children and search are fetched from
        <code>/api/treeItems</code>. Type to search server-side.
      </p>
      <BsTreeSelect
        v-model="singleValue"
        :provider="httpProvider"
        mode="single"
        placeholder="Search departments…"
      />
      <p class="text-body-secondary mt-2">
        Selected:
        <code>{{ (singleValue as TreeNode | null)?.label ?? '—' }}</code>
      </p>
      <BsCodeSnippet :code="SINGLE_SOURCE" language="html" />
    </section>

    <section>
      <h2>Multiple &mdash; chips</h2>
      <p class="text-body-secondary">
        <code>mode="multiple"</code> renders each selection as a removable chip.
        Backed by an in-memory sample tree.
      </p>
      <BsTreeSelect
        v-model="multipleValue"
        :provider="inMemoryProvider"
        mode="multiple"
        placeholder="Pick teams…"
      />
      <p class="text-body-secondary mt-2">
        Selected:
        <code>{{ (multipleValue as TreeNode[]).map((n) => n.label).join(', ') || '—' }}</code>
      </p>
      <BsCodeSnippet :code="MULTIPLE_SOURCE" language="html" />
    </section>

    <section>
      <h2>Checkbox &mdash; cascade</h2>
      <p class="text-body-secondary">
        <code>mode="checkbox"</code> with <code>:cascade-select="true"</code>:
        checking a parent selects its loaded descendants, and a parent becomes
        indeterminate when only some children are selected.
      </p>
      <BsTreeSelect
        v-model="checkboxValue"
        :provider="inMemoryProvider"
        mode="checkbox"
        :cascade-select="true"
        placeholder="Select with cascade…"
      />
      <p class="text-body-secondary mt-2">
        Selected:
        <code>{{ (checkboxValue as TreeNode[]).map((n) => n.label).join(', ') || '—' }}</code>
      </p>
      <BsCodeSnippet :code="CHECKBOX_SOURCE" language="html" />
    </section>

    <section>
      <h2>Button variant &mdash; clearable</h2>
      <p class="text-body-secondary">
        <code>variant="button"</code> opens a panel with an inline search box;
        <code>:show-clear="true"</code> adds a clear affordance once a value is
        selected.
      </p>
      <BsTreeSelect
        v-model="buttonValue"
        :provider="inMemoryProvider"
        mode="single"
        variant="button"
        :show-clear="true"
        placeholder="Choose a department"
      />
      <p class="text-body-secondary mt-2">
        Selected:
        <code>{{ (buttonValue as TreeNode | null)?.label ?? '—' }}</code>
      </p>
      <BsCodeSnippet :code="BUTTON_SOURCE" language="html" />
    </section>
  </div>
</template>

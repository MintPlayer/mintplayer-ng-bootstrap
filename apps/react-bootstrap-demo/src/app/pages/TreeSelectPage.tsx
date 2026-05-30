import { useMemo, useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import {
  BsTreeSelect,
  InMemoryTreeSelectProvider,
} from '@mintplayer/react-bootstrap/tree-select';
import type {
  NodePage,
  NodeRequest,
  TreeNode,
  TreeSelectProvider,
} from '@mintplayer/react-bootstrap/tree-select';

// In dev, /api is proxied to localhost:5000 by vite.config.mts. In prod we
// hit the api subdomain (CORS-allowed in apps/api/Program.cs). Mirrors
// DatatablePage's tree-mode demo.
const API_BASE = import.meta.env.PROD ? 'https://api.bootstrap.mintplayer.com' : '';

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

function toNode(dto: TreeItemDto): TreeNode {
  return {
    id: String(dto.id),
    label: dto.name,
    lazy: dto.childCount > 0,
    meta: { code: dto.code },
  };
}

function toPage(result: PagedResult<TreeItemDto>): NodePage {
  return {
    nodes: result.items.map(toNode),
    hasMore: result.page * result.pageSize < result.totalCount,
  };
}

/**
 * A {@link TreeSelectProvider} that talks to the demo `.NET` `/api/treeItems`
 * endpoints. Each level is lazy-loaded; search hits the server-side endpoint.
 * `req.signal` is forwarded to `fetch` so stale requests abort.
 */
class HttpTreeSelectProvider implements TreeSelectProvider {
  private async get(url: string, req: NodeRequest): Promise<NodePage> {
    const res = await fetch(url, { signal: req.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return toPage((await res.json()) as PagedResult<TreeItemDto>);
  }

  private pageOf(req: NodeRequest): number {
    return Math.floor((req.offset ?? 0) / PER_PAGE) + 1;
  }

  loadRoots(req: NodeRequest): Promise<NodePage> {
    return this.get(`${API_BASE}/api/treeItems?page=${this.pageOf(req)}&perPage=${PER_PAGE}`, req);
  }

  loadChildren(parentId: string, req: NodeRequest): Promise<NodePage> {
    return this.get(
      `${API_BASE}/api/treeItems/${parentId}/children?page=${this.pageOf(req)}&perPage=${PER_PAGE}`,
      req,
    );
  }

  search(query: string, req: NodeRequest): Promise<NodePage> {
    return this.get(
      `${API_BASE}/api/treeItems/search?q=${encodeURIComponent(query)}&page=${this.pageOf(req)}&perPage=${PER_PAGE}`,
      req,
    );
  }
}

// ─── In-memory sample tree (multiple / checkbox / button demos) ─────────────

const SAMPLE_TREE: TreeNode[] = [
  {
    id: 'eng', label: 'Engineering', children: [
      { id: 'eng/web', label: 'Web', children: [
        { id: 'eng/web/react', label: 'React' },
        { id: 'eng/web/angular', label: 'Angular' },
        { id: 'eng/web/vue', label: 'Vue' },
      ]},
      { id: 'eng/api', label: 'API', children: [
        { id: 'eng/api/dotnet', label: '.NET' },
        { id: 'eng/api/node', label: 'Node' },
      ]},
    ],
  },
  {
    id: 'design', label: 'Design', children: [
      { id: 'design/ux', label: 'UX' },
      { id: 'design/brand', label: 'Brand' },
    ],
  },
  { id: 'ops', label: 'Operations' },
];

function nodeLabels(value: TreeNode | TreeNode[] | null): string {
  if (!value) return '—';
  const list = Array.isArray(value) ? value : [value];
  return list.length ? list.map((n) => n.label).join(', ') : '—';
}

// ─── Source snippets ────────────────────────────────────────────────────────

const SINGLE_SOURCE = `// Server-backed provider: each level lazy-loads, search hits /api/treeItems/search.
const provider = useMemo(() => new HttpTreeSelectProvider(), []);
const [value, setValue] = useState<TreeNode | null>(null);

<BsTreeSelect
  provider={provider}
  mode="single"
  placeholder="Search the org…"
  value={value}
  onValueChange={e => setValue(e.detail.value as TreeNode | null)}
/>`;

const MULTIPLE_SOURCE = `const provider = useMemo(() => new InMemoryTreeSelectProvider(SAMPLE_TREE), []);
const [value, setValue] = useState<TreeNode[]>([]);

<BsTreeSelect
  provider={provider}
  mode="multiple"
  placeholder="Pick teams…"
  value={value}
  onValueChange={e => setValue(e.detail.value as TreeNode[])}
/>`;

const CHECKBOX_SOURCE = `<BsTreeSelect
  provider={provider}
  mode="checkbox"
  cascadeSelect
  placeholder="Pick teams…"
  value={value}
  onValueChange={e => setValue(e.detail.value as TreeNode[])}
/>`;

const BUTTON_SOURCE = `<BsTreeSelect
  provider={provider}
  mode="single"
  variant="button"
  showClear
  placeholder="Choose a department"
  value={value}
  onValueChange={e => setValue(e.detail.value as TreeNode | null)}
/>`;

export function TreeSelectPage() {
  const httpProvider = useMemo(() => new HttpTreeSelectProvider(), []);
  const memProvider = useMemo(() => new InMemoryTreeSelectProvider(SAMPLE_TREE), []);

  const [singleValue, setSingleValue] = useState<TreeNode | null>(null);
  const [multipleValue, setMultipleValue] = useState<TreeNode[]>([]);
  const [checkboxValue, setCheckboxValue] = useState<TreeNode[]>([]);
  const [buttonValue, setButtonValue] = useState<TreeNode | null>(null);

  return (
    <div className="demo-page">
      <h1>Tree select</h1>
      <p className="text-body-secondary">
        Hierarchical, async, searchable select. Data flows through a{' '}
        <code>TreeSelectProvider</code> (lazy roots / children / server search);
        selection is held as full <code>TreeNode</code> objects. Bind{' '}
        <code>value</code> and update it from <code>onValueChange</code>.
      </p>

      <section data-demo="single">
        <h2>Single + server search</h2>
        <BsTreeSelect
          provider={httpProvider}
          mode="single"
          placeholder="Search the org…"
          value={singleValue}
          onValueChange={(e) => setSingleValue(e.detail.value as TreeNode | null)}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{nodeLabels(singleValue)}</code>
        </p>
        <BsCodeSnippet code={SINGLE_SOURCE} language="tsx" />
      </section>

      <section data-demo="multiple">
        <h2>Multiple (chips)</h2>
        <BsTreeSelect
          provider={memProvider}
          mode="multiple"
          placeholder="Pick teams…"
          value={multipleValue}
          onValueChange={(e) => setMultipleValue(e.detail.value as TreeNode[])}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{nodeLabels(multipleValue)}</code>
        </p>
        <BsCodeSnippet code={MULTIPLE_SOURCE} language="tsx" />
      </section>

      <section data-demo="checkbox">
        <h2>Checkbox + cascade</h2>
        <BsTreeSelect
          provider={memProvider}
          mode="checkbox"
          cascadeSelect
          placeholder="Pick teams…"
          value={checkboxValue}
          onValueChange={(e) => setCheckboxValue(e.detail.value as TreeNode[])}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{nodeLabels(checkboxValue)}</code>
        </p>
        <BsCodeSnippet code={CHECKBOX_SOURCE} language="tsx" />
      </section>

      <section data-demo="button">
        <h2>Button variant + clear</h2>
        <BsTreeSelect
          provider={memProvider}
          mode="single"
          variant="button"
          showClear
          placeholder="Choose a department"
          value={buttonValue}
          onValueChange={(e) => setButtonValue(e.detail.value as TreeNode | null)}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{nodeLabels(buttonValue)}</code>
        </p>
        <BsCodeSnippet code={BUTTON_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

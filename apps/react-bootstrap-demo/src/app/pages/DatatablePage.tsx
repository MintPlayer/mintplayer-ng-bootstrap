import { useCallback, useEffect, useRef, useState } from 'react';
import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type {
  DatatableColumnDef,
  MpDatatable,
  TreeFetchRequestDetail,
  TreeExpandedIdsChangeDetail,
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
  { id: 1, name: 'Radiohead',     genre: 'Alternative', founded: 1985 },
  { id: 2, name: 'Daft Punk',     genre: 'Electronic',  founded: 1993 },
  { id: 3, name: 'Tame Impala',   genre: 'Psychedelic', founded: 2007 },
  { id: 4, name: 'Pink Floyd',    genre: 'Progressive', founded: 1965 },
];

const SIMPLE_SOURCE = `<BsDatatable columns={COLUMNS} data={ARTISTS} />`;

// ─── Tree-mode demo ────────────────────────────────────────────────────────

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

async function fetchTreeItems(parentId: number | null | undefined, page = 1, perPage = 100): Promise<PagedResult<TreeItem>> {
  const url = parentId == null
    ? `${API_BASE}/api/treeItems?page=${page}&perPage=${perPage}`
    : `${API_BASE}/api/treeItems/${parentId}/children?page=${page}&perPage=${perPage}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const TREE_SOURCE = `// Tree mode: virtual scroll + lazy children + cascading selection.
// The WC fires \`onFetchRequest\` when a row is expanded without cached
// children; the consumer resolves it and calls \`setFetchResponse(parentId, response)\`
// on the element ref. \`childCount\` on each row drives chevron visibility
// AND placeholder reservation for not-yet-loaded subtrees.
<BsDatatable
  ref={datatableRef}
  columns={TREE_COLUMNS}
  data={roots}
  virtualScroll
  itemSize={40}
  tree
  idKey="id"
  childCountKey="childCount"
  rowKey={(row) => String((row as TreeItem).id)}
  expandedIds={expandedIds}
  selectionMode="multiple"
  selectionStrategy="cascading"
  selectedIds={selectedIds}
  onFetchRequest={onFetchRequest}
  onExpandedIdsChange={onExpandedIdsChange}
  onSelectionChange={onSelectionChange}
/>`;

export function DatatablePage() {
  // Tree mode state
  const [roots, setRoots] = useState<TreeItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<unknown>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const datatableRef = useRef<MpDatatable | null>(null);

  // Initial root fetch.
  useEffect(() => {
    let cancelled = false;
    fetchTreeItems(null)
      .then((result) => { if (!cancelled) setRoots(result.items); })
      .catch(() => { /* surfaced via the page when needed; demo is best-effort */ });
    return () => { cancelled = true; };
  }, []);

  // Bridge `mp-datatable-fetch-request` → fetch + setFetchResponse.
  const onFetchRequest = useCallback(async (e: CustomEvent<TreeFetchRequestDetail>) => {
    const detail = e.detail;
    if (detail.parentId == null) return; // root fetch is handled by the useEffect above
    try {
      const result = await fetchTreeItems(detail.parentId as number, detail.page, detail.perPage);
      datatableRef.current?.setFetchResponse(detail.parentId, {
        data: result.items,
        totalRecords: result.totalCount,
        page: result.page,
        perPage: result.pageSize,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[BsDatatable] tree fetch failed', err);
    }
  }, []);

  const onExpandedIdsChange = useCallback((e: CustomEvent<TreeExpandedIdsChangeDetail>) => {
    setExpandedIds(new Set(e.detail.expandedIds));
  }, []);

  const onSelectionChange = useCallback((e: CustomEvent<SelectionChangeEventDetail>) => {
    setSelectedIds(e.detail.selectedIds);
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
        <h2>Tree mode &mdash; expandable rows</h2>
        <p>
          Click a chevron to expand a row. Children load lazily on first
          expand and stay cached for subsequent collapse/expand cycles.
          Placeholder rows reserve viewport space while the fetch is in
          flight so the scrollbar stays accurate. Cascading selection:
          checking a parent selects all currently-loaded descendants.
        </p>

        <BsDatatable
          ref={datatableRef}
          columns={TREE_COLUMNS}
          data={roots}
          virtualScroll
          itemSize={40}
          tree
          idKey="id"
          childCountKey="childCount"
          rowKey={(row: unknown) => String((row as TreeItem).id)}
          expandedIds={expandedIds}
          selectionMode="multiple"
          selectionStrategy="cascading"
          selectedIds={selectedIds}
          onFetchRequest={onFetchRequest}
          onExpandedIdsChange={onExpandedIdsChange}
          onSelectionChange={onSelectionChange}
          style={{ height: 480, display: 'block' }}
        />
        {selectedIds.length > 0 && (
          <small className="text-body-secondary">Selected {selectedIds.length} item(s).</small>
        )}

        <BsCodeSnippet code={TREE_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

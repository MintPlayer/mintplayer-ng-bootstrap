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

// The WC's perPage must equal the fetch perPage, or its root-page math
// misaligns with the loaded rows. One constant drives both.
const TREE_PER_PAGE = 100;

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

// ─── Lazy windowed-fetch demo ───────────────────────────────────────────────
// A large synthetic dataset with simulated latency so the windowing is visible:
// only the pages near the viewport are fetched, with placeholder rows holding
// the scroll position until each window arrives. The React wrapper is a thin
// passthrough, so the consumer orchestrates: seed page 1 into `data`, bridge
// `onFetchRequest` (parentId null = a flat window) to setFetchResponse, and
// call invalidateData() on the ref to drop the cache.

const WINDOWED_TOTAL = 5000;
const WINDOWED_PER_PAGE = 25;
const GENRES = ['Alternative', 'Electronic', 'Psychedelic', 'Progressive', 'Jazz', 'Hip-Hop'];

const WINDOWED_COLUMNS: DatatableColumnDef[] = [
  { name: 'name',    label: 'Name',    cellRenderer: (row) => (row as Artist)?.name ?? '' },
  { name: 'genre',   label: 'Genre',   cellRenderer: (row) => (row as Artist)?.genre ?? '' },
  { name: 'founded', label: 'Founded', cellRenderer: (row) => String((row as Artist)?.founded ?? '') },
];

function makeWindowedRow(id: number): Artist {
  return { id, name: `Artist #${id}`, genre: GENRES[id % GENRES.length], founded: 1960 + (id % 60) };
}

async function fetchWindowedPage(page: number, perPage: number): Promise<PagedResult<Artist>> {
  await new Promise((resolve) => setTimeout(resolve, 400)); // simulated server latency
  const start = (page - 1) * perPage;
  const items = Array.from(
    { length: Math.max(0, Math.min(perPage, WINDOWED_TOTAL - start)) },
    (_, i) => makeWindowedRow(start + i + 1),
  );
  return { items, totalCount: WINDOWED_TOTAL, page, pageSize: perPage };
}

const WINDOWED_SOURCE = `// Flat virtual + windowed fetch. The wrapper is a passthrough, so the
// consumer seeds page 1, bridges the flat fetch-request, and invalidates.
const ref = useRef<MpDatatable | null>(null);
const [page1, setPage1] = useState<Artist[]>([]);
const [total, setTotal] = useState(0);

useEffect(() => {
  fetchPage(1, 25).then((r) => { setPage1(r.items); setTotal(r.totalCount); });
}, []);

// parentId === null is a flat window (page >= 2). Key setFetchResponse on the
// REQUESTED page (detail.page), not the server-echoed page, so a normalising
// server can't leave the placeholder unresolved.
const onFetchRequest = useCallback((e: CustomEvent<TreeFetchRequestDetail>) => {
  const { parentId, page, perPage } = e.detail;
  if (parentId != null || page <= 1) return;
  fetchPage(page, perPage).then((r) =>
    ref.current?.setFetchResponse(null, {
      data: r.items, totalRecords: r.totalCount, page, perPage: r.pageSize,
    }),
  );
}, []);

<BsDatatable
  ref={ref}
  columns={COLUMNS}
  data={page1}
  totalRecords={total}
  virtualScroll
  itemSize={40}
  perPage={25}
  rowKey={(row) => String((row as Artist).id)}
  onFetchRequest={onFetchRequest}
/>`;

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
  const [rootTotal, setRootTotal] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<unknown>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const datatableRef = useRef<MpDatatable | null>(null);

  // Windowed-fetch state
  const [windowedPage1, setWindowedPage1] = useState<Artist[]>([]);
  const [windowedTotal, setWindowedTotal] = useState(0);
  const [fetchedPages, setFetchedPages] = useState<number[]>([]);
  const windowedRef = useRef<MpDatatable | null>(null);
  const windowedTotalPages = Math.ceil(WINDOWED_TOTAL / WINDOWED_PER_PAGE);

  const loadWindowedPage1 = useCallback(async () => {
    setFetchedPages([1]);
    const result = await fetchWindowedPage(1, WINDOWED_PER_PAGE);
    setWindowedPage1(result.items);
    setWindowedTotal(result.totalCount);
  }, []);

  useEffect(() => { void loadWindowedPage1(); }, [loadWindowedPage1]);

  // Bridge the flat window fetch-request (parentId null, page >= 2) to the
  // page fetch, keyed by the REQUESTED page so a normalising server can't
  // deadlock the window.
  const onWindowedFetchRequest = useCallback(async (e: CustomEvent<TreeFetchRequestDetail>) => {
    const { parentId, page, perPage } = e.detail;
    if (parentId != null || page <= 1) return;
    setFetchedPages((prev) => (prev.includes(page) ? prev : [...prev, page].sort((a, b) => a - b)));
    const result = await fetchWindowedPage(page, perPage);
    windowedRef.current?.setFetchResponse(null, {
      data: result.items,
      totalRecords: result.totalCount,
      page,
      perPage: result.pageSize,
    });
  }, []);

  const refreshWindowed = useCallback(() => {
    windowedRef.current?.invalidateData(); // drop the cached pages…
    void loadWindowedPage1();               // …and re-seed page 1
  }, [loadWindowedPage1]);

  // Initial root page-1 fetch. `rootTotal` enables lazy root windowing when
  // there are more roots than one page.
  useEffect(() => {
    let cancelled = false;
    fetchTreeItems(null, 1, TREE_PER_PAGE)
      .then((result) => {
        if (cancelled) return;
        setRoots(result.items);
        setRootTotal(result.totalCount);
      })
      .catch(() => { /* surfaced via the page when needed; demo is best-effort */ });
    return () => { cancelled = true; };
  }, []);

  // Bridge `mp-datatable-fetch-request` → fetch + setFetchResponse. This fires
  // for tree children (non-null parentId) AND lazy root windows (parentId
  // null, page ≥ 2). Page 1 is seeded by the effect above, so only pages ≥ 2
  // reach here for the root level. Key on the REQUESTED page (detail.page).
  const onFetchRequest = useCallback(async (e: CustomEvent<TreeFetchRequestDetail>) => {
    const detail = e.detail;
    try {
      const result = await fetchTreeItems(detail.parentId as number | null, detail.page, detail.perPage);
      datatableRef.current?.setFetchResponse(detail.parentId, {
        data: result.items,
        totalRecords: result.totalCount,
        page: detail.page,
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
        <h2>Virtual scrolling &mdash; lazy windowed fetch</h2>
        <p>
          With <code>virtualScroll</code> + a server-paged source the table
          fetches only the pages whose rows are in (or near) the viewport.
          Scroll through this {WINDOWED_TOTAL}-row list and watch the fetch
          log: it never drains all {windowedTotalPages} pages up front &mdash;
          placeholder rows hold the scroll position until each window arrives.
          The React wrapper is a thin passthrough, so the consumer seeds page 1,
          bridges <code>onFetchRequest</code> for flat windows
          (<code>parentId === null</code>), and calls{' '}
          <code>invalidateData()</code> on the ref to drop the cache.
        </p>

        <p className="text-body-secondary">
          <small>
            Pages fetched: <code>{fetchedPages.join(', ') || '—'}</code>{' '}
            ({fetchedPages.length} of {windowedTotalPages}){' '}
          </small>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refreshWindowed}>
            Refresh (invalidateData)
          </button>
        </p>

        <BsDatatable
          ref={windowedRef}
          className="windowed-table"
          columns={WINDOWED_COLUMNS}
          data={windowedPage1}
          totalRecords={windowedTotal}
          virtualScroll
          itemSize={40}
          perPage={WINDOWED_PER_PAGE}
          rowKey={(row: unknown) => String((row as Artist).id)}
          onFetchRequest={onWindowedFetchRequest}
        />

        <BsCodeSnippet code={WINDOWED_SOURCE} language="tsx" />
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
          totalRecords={rootTotal}
          perPage={TREE_PER_PAGE}
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

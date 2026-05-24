import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BsQueryBuilder } from '@mintplayer/react-bootstrap/query-builder';
import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
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

const SOURCE = `<BsQueryBuilder
  schema={schema}
  rootEntity={rootEntity}
  multiEntityPickerEnabled
  selectedFields={selectedFields}
  sortBy={sortBy}
  query={query}
  showPreview
  showSavedQueries
  onQueryChange={e => setQuery(e.detail.tree)}
/>
{/* useEffect on [query, rootEntity, selectedFields, sortBy] auto-fires search. */}
<BsDatatable columns={columns} data={results} />`;

export function QueryBuilderPage() {
  const [schema, setSchema] = useState<EntitySchema[]>([]);
  const [rootEntity, setRootEntity] = useState('orders');
  const [query, setQuery] = useState<Expression>(() => emptyGroup());
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortDescriptor[]>([]);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch schema on mount + whenever rootEntity changes.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/${rootEntity}/schema`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((s: EntitySchema[]) => { if (!cancelled) setSchema(s); })
      .catch(() => { if (!cancelled) setError('Could not fetch schema. Is apps/api running on :5000?'); });
    return () => { cancelled = true; };
  }, [rootEntity]);

  // Build datatable columns from the current schema + selectedFields.
  const columns = useMemo<DatatableColumnDef[]>(() => {
    const entity = schema.find((s) => s.name === rootEntity);
    if (!entity) return [];
    const projectable = entity.fields.filter((f) => f.type !== 'relation');
    const visible = selectedFields.length === 0
      ? projectable
      : projectable.filter((f) => selectedFields.includes(f.name));
    return visible.map((f) => ({ name: f.name, label: f.label, sortable: true }));
  }, [schema, rootEntity, selectedFields]);

  const search = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        query,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        page: 1,
        pageSize: 50,
        sort: sortBy.length ? sortBy : undefined,
      };
      const r = await fetch(`${API_BASE}/api/${rootEntity}/search`, {
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
      setResults(data.items);
      setTotalCount(data.totalCount);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Request failed');
      setResults([]);
      setTotalCount(0);
    } finally {
      setBusy(false);
    }
  }, [query, rootEntity, sortBy]);

  // Auto-search whenever query / entity / sort changes. 250 ms debounce so
  // rapid edits inside a condition value-editor coalesce into one network
  // round-trip. AbortController cancels the prior request if a new search
  // is scheduled while one is in-flight.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      void search(ctrl.signal);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="demo-page">
      <h1>Query builder</h1>
      <p className="text-body-secondary">
        Visual filter builder over a typed entity schema. Builds a JSON
        expression tree, POSTs it to <code>/api/&lt;entity&gt;/search</code>,
        renders results in a <code>&lt;BsDatatable&gt;</code>. The frontend
        ships only the JSON wire format — SQL/OData translation lives in
        <code> apps/api</code>.
      </p>

      <section>
        <h2>Orders schema</h2>
        <BsQueryBuilder
          schema={schema}
          query={query}
          onQueryChange={(e: CustomEvent<{ tree: Expression }>) => setQuery(e.detail.tree)}
          onRootEntityChange={(e: CustomEvent<{ rootEntity: string }>) => setRootEntity(e.detail.rootEntity)}
          onSelectedFieldsChange={(e: CustomEvent<{ selectedFields: string[] }>) => setSelectedFields(e.detail.selectedFields)}
          onSortByChange={(e: CustomEvent<{ sortBy: SortDescriptor[] }>) => setSortBy(e.detail.sortBy)}
          {...{
            rootEntity,
            multiEntityPickerEnabled: true,
            selectedFields,
            sortBy,
            showPreview: true,
            showSavedQueries: true,
          } as React.ComponentProps<typeof BsQueryBuilder>}
        />

        <div className="d-flex gap-2 align-items-center my-3">
          {busy ? (
            <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true" />
          ) : null}
          <span className="text-secondary">
            {totalCount} match{totalCount === 1 ? '' : 'es'}
          </span>
          {error ? <span className="text-danger ms-2">⚠ {error}</span> : null}
        </div>

        <BsDatatable columns={columns} data={results} />

        <details className="mt-3">
          <summary>Current expression tree</summary>
          <BsCodeSnippet code={JSON.stringify(query, null, 2)} language="json" />
        </details>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

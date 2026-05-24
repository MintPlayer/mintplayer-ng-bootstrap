import { useState } from 'react';
import { BsQueryBuilder } from '@mintplayer/react-bootstrap/query-builder';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import {
  emptyGroup,
  type EntitySchema,
  type Expression,
} from '@mintplayer/web-components/query-builder';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'id', label: 'ID', type: 'number' },
      { name: 'customer', label: 'Customer', type: 'string' },
      { name: 'placed_at', label: 'Placed at', type: 'date' },
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'fulfilled', label: 'Fulfilled', type: 'boolean' },
    ],
  },
];

const SOURCE = `<BsQueryBuilder
  schema={SCHEMA}
  query={query}
  onQueryChange={e => setQuery(e.detail.tree)}
/>`;

export function QueryBuilderPage() {
  const [query, setQuery] = useState<Expression>(() => emptyGroup());

  return (
    <div className="demo-page">
      <h1>Query builder</h1>
      <p className="text-body-secondary">
        Visual filter builder over a typed entity schema. Emits a JSON
        expression tree on every change — no SQL or OData serialization
        is shipped from the frontend.
      </p>

      <section>
        <h2>Orders schema</h2>
        <BsQueryBuilder
          schema={SCHEMA}
          query={query}
          onQueryChange={(e: CustomEvent<{ tree: Expression }>) => setQuery(e.detail.tree)}
        />
        <details className="mt-3">
          <summary>Current expression tree</summary>
          <pre className="mb-0"><code>{JSON.stringify(query, null, 2)}</code></pre>
        </details>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

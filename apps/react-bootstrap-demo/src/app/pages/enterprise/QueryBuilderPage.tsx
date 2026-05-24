import { useState } from 'react';
import { BsQueryBuilder } from '@mintplayer/react-bootstrap/query-builder';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import {
  emptyGroup,
  type EntitySchema,
  type Expression,
  type SortDescriptor,
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
  rootEntity={rootEntity}
  multiEntityPickerEnabled
  selectedFields={selectedFields}
  sortBy={sortBy}
  query={query}
  showPreview
  showSavedQueries
  onQueryChange={e => setQuery(e.detail.tree)}
/>`;

export function QueryBuilderPage() {
  // `rootEntity` drives the entity-picker strip at the top; without it the
  // "Add condition" / "Add group" buttons have no entity to add against
  // and silently no-op. Initialise from the schema so the demo is
  // interactive on first paint. `selectedFields` and `sortBy` are the
  // two-way bindings for the field-projection + sort strips.
  const [rootEntity, setRootEntity] = useState('orders');
  const [query, setQuery] = useState<Expression>(() => emptyGroup());
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortDescriptor[]>([]);

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
          onRootEntityChange={(e: CustomEvent<string>) => setRootEntity(e.detail)}
          onSelectedFieldsChange={(e: CustomEvent<string[]>) => setSelectedFields(e.detail)}
          onSortByChange={(e: CustomEvent<SortDescriptor[]>) => setSortBy(e.detail)}
          {...{
            rootEntity,
            multiEntityPickerEnabled: true,
            selectedFields,
            sortBy,
            showPreview: true,
            showSavedQueries: true,
          } as React.ComponentProps<typeof BsQueryBuilder>}
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

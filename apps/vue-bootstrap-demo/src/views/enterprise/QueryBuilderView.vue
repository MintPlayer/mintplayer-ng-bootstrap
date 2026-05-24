<script setup lang="ts">
import { ref } from 'vue';
import { BsQueryBuilder } from '@mintplayer/vue-bootstrap/query-builder';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
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

// `rootEntity` drives the entity-picker strip at the top; without it the
// "Add condition" / "Add group" buttons have no entity to add against and
// silently no-op. Initialise from the schema so the demo is interactive
// on first paint. `selectedFields` and `sortBy` two-way-bind to the
// field-projection + sort strips.
const rootEntity = ref('orders');
const query = ref<Expression>(emptyGroup());
const selectedFields = ref<string[]>([]);
const sortBy = ref<SortDescriptor[]>([]);

const SOURCE = `<BsQueryBuilder
  v-model="query"
  :schema="SCHEMA"
  :root-entity="rootEntity"
  multi-entity-picker-enabled
  :selected-fields="selectedFields"
  :sort-by="sortBy"
  show-preview
  show-saved-queries
  @root-entity-change="(e: CustomEvent<string>) => rootEntity = e.detail"
  @selected-fields-change="(e: CustomEvent<string[]>) => selectedFields = e.detail"
  @sort-by-change="(e: CustomEvent<SortDescriptor[]>) => sortBy = e.detail"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Query builder</h1>
    <p class="text-body-secondary">
      Visual filter builder over a typed entity schema. Emits a JSON
      expression tree on every change — no SQL or OData serialization
      is shipped from the frontend.
    </p>

    <section>
      <h2>Orders schema</h2>
      <BsQueryBuilder
        v-model="query"
        :schema="SCHEMA"
        :root-entity="rootEntity"
        multi-entity-picker-enabled
        :selected-fields="selectedFields"
        :sort-by="sortBy"
        show-preview
        show-saved-queries
        @root-entity-change="(e: CustomEvent<string>) => rootEntity = e.detail"
        @selected-fields-change="(e: CustomEvent<string[]>) => selectedFields = e.detail"
        @sort-by-change="(e: CustomEvent<SortDescriptor[]>) => sortBy = e.detail"
      />
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

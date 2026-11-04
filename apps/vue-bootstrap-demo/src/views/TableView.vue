<script setup lang="ts">
import { ref } from 'vue';
import { BsTable } from '@mintplayer/vue-bootstrap/table';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const striped = ref(true);
const bordered = ref(false);
const ROWS = [
  { id: 1, first: 'Mark', last: 'Otto', handle: '@mdo' },
  { id: 2, first: 'Jacob', last: 'Thornton', handle: '@fat' },
  { id: 3, first: 'Larry', last: 'Bird', handle: '@twitter' },
];

const SOURCE = `<script setup lang="ts">
import { BsTable } from '@mintplayer/vue-bootstrap/table';
<\/script>

<template>
  <BsTable striped hover responsive aria-label="People">
    <thead><tr><th>#</th><th>First</th><th>Last</th></tr></thead>
    <tbody><tr v-for="r in rows" :key="r.id"><td>{{ r.id }}</td><td>{{ r.first }}</td><td>{{ r.last }}</td></tr></tbody>
  </BsTable>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Table</h1>
    <p class="text-body-secondary">
      A real <code>&lt;table&gt;</code> around your rows. <code>responsive</code> scrolls inline
      instead of wrapping; <code>striped</code>, <code>hover</code> and <code>bordered</code> are
      Bootstrap's variants. Your <code>aria-*</code> (such as <code>aria-rowcount</code>) land on
      the <code>&lt;table&gt;</code>.
    </p>

    <section>
      <h2>Basic usage</h2>
      <div class="d-flex gap-3 mb-2">
        <label class="form-check"><input v-model="striped" type="checkbox" class="form-check-input" /> Striped</label>
        <label class="form-check"><input v-model="bordered" type="checkbox" class="form-check-input" /> Bordered</label>
      </div>
      <BsTable :striped="striped" :bordered="bordered" hover responsive aria-label="People">
        <thead>
          <tr><th>#</th><th>First</th><th>Last</th><th>Handle</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in ROWS" :key="r.id"><td>{{ r.id }}</td><td>{{ r.first }}</td><td>{{ r.last }}</td><td>{{ r.handle }}</td></tr>
        </tbody>
      </BsTable>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

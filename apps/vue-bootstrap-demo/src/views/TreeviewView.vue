<script setup lang="ts">
import { ref } from 'vue';
import { BsTreeview } from '@mintplayer/vue-bootstrap/treeview';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { TreeNode } from '@mintplayer/web-components/treeview';

const items = ref<TreeNode[]>([
  {
    id: 'src', label: 'src', children: [
      { id: 'src/app', label: 'app', children: [
        { id: 'src/app/main.ts', label: 'main.ts' },
        { id: 'src/app/app.module.ts', label: 'app.module.ts' },
      ]},
      { id: 'src/assets', label: 'assets', children: [
        { id: 'src/assets/logo.svg', label: 'logo.svg' },
      ]},
    ],
  },
  { id: 'package.json', label: 'package.json' },
  { id: 'README.md', label: 'README.md' },
]);

const selectedIds = ref<string[]>([]);

const SOURCE = `<BsTreeview
  :items="items"
  selection-mode="single"
  v-model:selectedIds="selectedIds"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Treeview</h1>
    <p class="text-body-secondary">
      Hierarchical tree with keyboard navigation, expand/collapse state
      synchronisation, and pluggable node rendering. Bind <code>items</code>
      as a JS array; the WC owns the visible tree.
    </p>

    <section>
      <h2>File system</h2>
      <BsTreeview
        :items="items"
        selection-mode="single"
        v-model:selectedIds="selectedIds"
      />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ selectedIds.length ? selectedIds.join(', ') : '—' }}</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

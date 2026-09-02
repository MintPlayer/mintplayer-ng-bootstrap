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

    <details class="mt-3 mb-4">
        <summary>Styling — this component renders in the light DOM</summary>
        <p class="mt-2">
            It has no shadow root. Anything you render into it — row templates, node
            templates, cell renderers — stays in the document, so your app's stylesheet,
            your own component styles and Bootstrap's utility classes reach it normally.
        </p>
        <p>
            Its own CSS is scoped at build time onto a <code>data-mps</code> attribute, the
            same device Angular uses for <code>_ngcontent</code>, so it cannot leak out onto
            your markup.
        </p>
        <p class="mb-0">
            The trade-off runs the other way: page CSS now reaches this component's
            internals, exactly as emulated encapsulation behaves everywhere else.
            <code>::part()</code> and <code>::slotted()</code> no longer address it — use
            ordinary CSS selectors instead.
        </p>
    </details>

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

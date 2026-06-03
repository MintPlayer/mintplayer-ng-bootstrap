<script setup lang="ts">
import { ref } from 'vue';
import {
  BsDropdownMenu,
  BsDropdownItem,
  BsDropdownDivider,
  BsDropdownHeader,
} from '@mintplayer/vue-bootstrap/dropdown-menu';
import type { DropdownSelectEventDetail } from '@mintplayer/vue-bootstrap/dropdown-menu';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const selected = ref<string>('—');

function onSelect(detail: DropdownSelectEventDetail) {
  selected.value = (detail.value as string) ?? detail.item.textContent?.trim() ?? '—';
}

const SOURCE = `<BsDropdownMenu @select="onSelect">
  <BsDropdownHeader>Actions</BsDropdownHeader>
  <BsDropdownItem value="new">New file</BsDropdownItem>
  <BsDropdownItem value="open" selected>Open…</BsDropdownItem>
  <BsDropdownItem value="save">Save</BsDropdownItem>
  <BsDropdownItem value="export" disabled>Export (Pro)</BsDropdownItem>
  <BsDropdownDivider />
  <BsDropdownItem value="delete">Delete</BsDropdownItem>
</BsDropdownMenu>`;
</script>

<template>
  <div class="demo-page">
    <h1>Dropdown menu</h1>
    <p class="text-body-secondary">
      A keyboard-navigable menu of items, dividers and headers. Items carry an
      opaque <code>value</code>; activating one fires <code>select</code> with the
      item element and its value.
    </p>

    <section>
      <h2>Menu</h2>
      <p class="text-body-secondary">
        One item is <code>selected</code> and one is <code>disabled</code>. Use
        the arrow keys, Enter or Space to activate.
      </p>
      <BsDropdownMenu @select="onSelect">
        <BsDropdownHeader>Actions</BsDropdownHeader>
        <BsDropdownItem value="new">New file</BsDropdownItem>
        <BsDropdownItem value="open" selected>Open…</BsDropdownItem>
        <BsDropdownItem value="save">Save</BsDropdownItem>
        <BsDropdownItem value="export" disabled>Export (Pro)</BsDropdownItem>
        <BsDropdownDivider />
        <BsDropdownItem value="delete">Delete</BsDropdownItem>
      </BsDropdownMenu>
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ selected }}</code>
      </p>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

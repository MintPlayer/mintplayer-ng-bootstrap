<script setup lang="ts">
import { ref } from 'vue';
import type { DropdownSelectEventDetail } from '@mintplayer/ui-core/dropdown';
import { BsContextMenu } from '@mintplayer/vue-bootstrap/context-menu';
import { BsDropdownDivider, BsDropdownItem, BsDropdownMenu } from '@mintplayer/vue-bootstrap/dropdown';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const chosen = ref<string | null>(null);
const choose = ({ value }: DropdownSelectEventDetail) => (chosen.value = String(value));

const SOURCE = `<BsContextMenu v-slot="{ props }">
  <div tabindex="0" v-bind="props">Right-click here</div>
  <template #content>
    <BsDropdownMenu @itemselect="({ value }) => (chosen = value)">
      <BsDropdownItem value="cut">Cut</BsDropdownItem>
      <BsDropdownItem value="copy">Copy</BsDropdownItem>
      <BsDropdownItem value="paste">Paste</BsDropdownItem>
    </BsDropdownMenu>
  </template>
</BsContextMenu>`;
</script>

<template>
  <div class="demo-page">
    <h1>Context menu</h1>
    <p class="text-body-secondary">
      <code>BsContextMenu</code> replaces the browser's context menu on the element its <code>props</code> are bound
      to. A right-click opens the <code>content</code> slot at the pointer; Shift+F10 and the ContextMenu key open it
      at the element. Escape, a click elsewhere, scrolling or choosing an item closes it, and focus returns.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsContextMenu v-slot="{ props }">
        <div
          class="border rounded p-5 text-center"
          tabindex="0"
          role="group"
          aria-label="Context menu demo area (Shift+F10 opens the menu)"
          v-bind="props"
        >
          Right-click here
        </div>
        <template #content>
          <BsDropdownMenu @itemselect="choose">
            <BsDropdownItem value="cut">Cut</BsDropdownItem>
            <BsDropdownItem value="copy">Copy</BsDropdownItem>
            <BsDropdownItem value="paste">Paste</BsDropdownItem>
            <BsDropdownDivider />
            <BsDropdownItem value="delete" disabled>Delete</BsDropdownItem>
          </BsDropdownMenu>
        </template>
      </BsContextMenu>
      <p class="mt-2" data-testid="chosen">Chosen: {{ chosen ?? 'nothing yet' }}</p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

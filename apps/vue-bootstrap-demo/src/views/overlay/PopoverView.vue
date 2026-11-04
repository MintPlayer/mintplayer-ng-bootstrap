<script setup lang="ts">
import type { AnchorSide } from '@mintplayer/ui-core/overlay';
import { BsPopover } from '@mintplayer/vue-bootstrap/popover';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SIDES: readonly AnchorSide[] = ['start', 'top', 'bottom', 'end'];

const SOURCE = `<BsPopover position="top" title="Popover title">
  <template #default="{ props }">
    <button type="button" class="btn btn-primary" v-bind="props">Click me</button>
  </template>
  <template #content>Any content here.</template>
</BsPopover>`;
</script>

<template>
  <div class="demo-page">
    <h1>Popover</h1>
    <p class="text-body-secondary">
      <code>BsPopover</code> renders nothing itself: bind its <code>props</code> on the trigger, and a click (or
      Enter / Space) toggles a non-modal dialog with its <code>content</code> slot at the end of
      <code>&lt;body&gt;</code>. Its <code>title</code> names the dialog. Escape (focus returns to the trigger), a
      click outside or tabbing out closes it.
    </p>

    <section>
      <h2>Basic usage</h2>
      <div class="d-flex flex-wrap gap-2 overflow-hidden">
        <BsPopover v-for="side in SIDES" :key="side" :position="side" title="Popover title">
          <template #default="{ props }">
            <button type="button" class="btn btn-primary" v-bind="props">{{ side }}</button>
          </template>
          <template #content>And here's some amazing content. It's very engaging. Right?</template>
        </BsPopover>
      </div>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

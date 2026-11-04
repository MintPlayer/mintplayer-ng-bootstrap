<script setup lang="ts">
import type { AnchorSide } from '@mintplayer/ui-core/overlay';
import { BsTooltip } from '@mintplayer/vue-bootstrap/tooltip';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SIDES: readonly AnchorSide[] = ['start', 'top', 'bottom', 'end'];

const SOURCE = `<BsTooltip position="top">
  <template #default="{ props }">
    <button type="button" class="btn btn-primary" v-bind="props">Hover me</button>
  </template>
  <template #content>Hello <b>world</b></template>
</BsTooltip>`;
</script>

<template>
  <div class="demo-page">
    <h1>Tooltip</h1>
    <p class="text-body-secondary">
      <code>BsTooltip</code> renders nothing itself: bind its <code>props</code> on the trigger, and its
      <code>content</code> slot shows at the end of <code>&lt;body&gt;</code>, so no <code>overflow: hidden</code>
      ancestor clips it. It shows on hover and on focus, flips to the other side when there is no room, and Escape
      dismisses it. While it shows, the trigger's <code>aria-describedby</code> names it.
    </p>

    <section>
      <h2>Basic usage</h2>
      <div class="d-flex flex-wrap gap-2 overflow-hidden">
        <BsTooltip v-for="side in SIDES" :key="side" :position="side">
          <template #default="{ props }">
            <button type="button" class="btn btn-primary" v-bind="props">{{ side }}</button>
          </template>
          <template #content><span class="text-nowrap">Hello <b>world</b></span></template>
        </BsTooltip>
      </div>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

<script setup lang="ts">
// The code snippet's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectCodeSnippet().
//
// Everything inside the pre is written without whitespace between tags: Vue
// keeps whitespace inside a pre, and a stray text node in a row would land in
// the copied text. The stylesheet also sets white-space: normal on everything
// but the line text, for the fronts that indent their output.
import type { CodeSnippetView } from '@mintplayer/ui-core/code-snippet';

defineProps<{ view: CodeSnippetView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <button v-bind="view.copy">{{ view.copyText }}</button>
  <pre v-bind="view.pre"><code v-bind="view.code"><span v-for="row in view.rows" :key="row.number" v-bind="row.row"><a v-if="row.link" v-bind="row.link" :href="row.href">{{ row.number }}</a><span v-else-if="row.gutter" v-bind="row.gutter">{{ row.number }}</span><span v-if="row.mark" v-bind="row.mark">{{ row.markText }}</span><span v-if="row.secondary" v-bind="row.secondary">{{ row.secondaryText }}</span><span v-bind="row.text" v-html="row.html"></span><span v-if="row.description" v-bind="row.description">{{ row.descriptionText }}</span></span></code></pre>
  <div v-if="view.keymap" v-bind="view.keymap">{{ view.keymapText }}</div>
  <div v-bind="view.toast">{{ view.toastText }}</div>
  <div v-bind="view.live">{{ view.liveText }}</div>
  </div>
</template>

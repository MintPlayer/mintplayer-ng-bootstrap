<script setup lang="ts">
// The list of sections beside the content; the core builds the entries from the content's DOM.
import type { ScrollspyView } from '@mintplayer/ui-core/scrollspy';

defineProps<{ view: ScrollspyView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <nav mp-attrs v-bind="view.nav">
      <ul v-bind="view.list">
        <li v-for="entry in view.entries" :key="entry.key"><button v-bind="entry.button">{{ entry.text }}</button></li>
      </ul>
    </nav>
    <div v-bind="view.content"><slot /></div>
  </div>
</template>

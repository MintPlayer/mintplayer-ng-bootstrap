<script setup lang="ts">
// The tab control (#458 M4): one native radio per page, then the strip (after the
// panes when bottom), then the panes. Each page is a declaration: its header renders
// in the strip's label and its body in the pane (<content-slot>). The trailing
// <slot> keeps the pages themselves in the tree; they render nothing.
import type { TabControlComponentView } from '@mintplayer/ui-core/tab-control';

defineProps<{ view: TabControlComponentView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <input v-for="e in view.entries" :key="e.key" v-bind="e.radio" :checked.prop="e.checked" />
    <div v-if="!view.bottom" v-bind="view.strip">
      <ul v-bind="view.list">
        <li v-for="(e, i) in view.entries" :key="e.key" v-bind="view.item">
          <label v-bind="e.tab"><content-slot query="pages" name="header" :index="i" /></label>
        </li>
      </ul>
    </div>
    <div v-bind="view.content">
      <div v-for="(e, i) in view.entries" :key="e.key" v-bind="e.pane"><content-slot query="pages" :index="i" /></div>
    </div>
    <div v-if="view.bottom" v-bind="view.strip">
      <ul v-bind="view.list">
        <li v-for="(e, i) in view.entries" :key="e.key" v-bind="view.item">
          <label v-bind="e.tab"><content-slot query="pages" name="header" :index="i" /></label>
        </li>
      </ul>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
// The app shell (#458 M4): one native checkbox per viewport mode is the open
// state, so every rule is CSS and the server-rendered page works with JS off.
import type { ShellComponentView } from '@mintplayer/ui-core/shell';

defineProps<{ view: ShellComponentView }>();
defineSlots<{ default?: () => unknown; topbar?: () => unknown; sidebar?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <a v-bind="view.skip" :href="view.skipHref">{{ view.skipText }}</a>
    <input v-for="t in view.toggles" :key="t.mode" v-bind="t.input" />
    <div v-bind="view.topbar">
      <label v-for="t in view.toggles" :key="t.mode" v-bind="t.label">{{ view.hamburgerText }}</label>
      <slot name="topbar"></slot>
    </div>
    <div v-bind="view.sidebarRoot" :style="view.sizeStyle">
      <aside v-bind="view.sidebar"><slot name="sidebar"></slot></aside>
      <div v-bind="view.content"><slot></slot></div>
    </div>
  </div>
</template>

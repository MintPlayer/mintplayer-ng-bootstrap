<script setup lang="ts">
// The resizable box (#458 M7), compiled into the Angular, React, Vue and Lit fronts.
// `view` comes from connectResizable(): the instance sheet holds the geometry, the glyphs
// render once hydrated, and the consumer's content follows them.
import type { ResizableView } from '@mintplayer/ui-core/resizable';

defineProps<{ view: ResizableView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <instance-style :name="view.cssName" :css="view.css" />
    <div v-for="glyph in view.glyphs" :key="glyph.key" v-bind="glyph.attrs"></div>
    <slot></slot>
  </div>
</template>

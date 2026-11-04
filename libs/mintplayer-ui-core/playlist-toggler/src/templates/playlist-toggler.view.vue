<script setup lang="ts">
// The playlist toggle: a real button with three bars.
import type { PlaylistTogglerView } from '@mintplayer/ui-core/playlist-toggler';

defineProps<{ view: PlaylistTogglerView }>();
</script>

<template>
  <span mp-host ref="root" v-bind="view.root">
    <button mp-attrs v-bind="view.button"><span v-bind="view.line"></span><span v-bind="view.line"></span><span v-bind="view.line"></span></button>
  </span>
</template>

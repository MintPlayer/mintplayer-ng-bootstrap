<script setup lang="ts">
import '@mintplayer/web-components/tile-manager';
import { MintTileManagerElement } from '@mintplayer/web-components/tile-manager';
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

// Pass-through SFC wrapper. The tile-manager's primary contract is its
// `layout-change` event (a discriminated description of every move /
// resize) and its slotted `<mp-tile>` children — both work end-to-end
// without a Vue-side defineModel here. Consumers wanting reactive
// layout state can listen for `@layout-change` directly.
const el = ref<MintTileManagerElement | null>(null);
</script>

<template>
  <mp-tile-manager ref="el" v-bind="$attrs">
    <slot />
  </mp-tile-manager>
</template>

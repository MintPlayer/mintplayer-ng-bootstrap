<script setup lang="ts">
import '@mintplayer/web-components/navbar';
import type { MpNavbarItem } from '@mintplayer/web-components/navbar';
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    /** Marks the link as the current page (boolean attribute). */
    active?: boolean;
    /** Disables the link (boolean attribute). */
    disabled?: boolean;
  }>(),
  {
    active: false,
    disabled: false,
  },
);

const el = ref<MpNavbarItem | null>(null);
</script>

<template>
  <!-- Slot a light-DOM <a href> child; the WC styles it as a .nav-link. -->
  <mp-navbar-item
    ref="el"
    v-bind="$attrs"
    :active="active ? '' : undefined"
    :disabled="disabled ? '' : undefined"
  >
    <slot />
  </mp-navbar-item>
</template>

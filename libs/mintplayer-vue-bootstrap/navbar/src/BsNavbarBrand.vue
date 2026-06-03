<script setup lang="ts">
import '@mintplayer/web-components/navbar';
import type { MpNavbarBrand } from '@mintplayer/web-components/navbar';
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

const el = ref<MpNavbarBrand | null>(null);
</script>

<template>
  <!-- Place on the BsNavbar via slot="brand"; slot an <a>/text child. -->
  <mp-navbar-brand ref="el" v-bind="$attrs">
    <slot />
  </mp-navbar-brand>
</template>

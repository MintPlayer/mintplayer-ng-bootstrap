<script setup lang="ts">
// A rule between menu entries (PRD #437 D10).
import type { RibbonBag } from '@mintplayer/ui-core/ribbon';

defineProps<{ root: RibbonBag }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"></div>
</template>

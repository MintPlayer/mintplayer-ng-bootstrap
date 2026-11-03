<script setup lang="ts">
import type { CoreBag } from '@mintplayer/ui-core/component';

defineProps<{ root: CoreBag }>();
</script>

<template>
  <div mp-host ref="root" v-bind="root"></div>
</template>

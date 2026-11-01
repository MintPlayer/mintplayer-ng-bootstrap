<script setup lang="ts">
import { installBootstrap, bootstrapCard } from '@mintplayer/ui-core/bootstrap';
// #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
installBootstrap(bootstrapCard);
defineOptions({ inheritAttrs: false });

defineProps<{ href?: string }>();
</script>

<template>
  <a data-mps="card" class="card-link" :href="href" v-bind="$attrs">
    <slot />
  </a>
</template>

<script setup lang="ts">
import { installBootstrap, bootstrapCard } from '@mintplayer/ui-core/bootstrap';
// #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
installBootstrap(bootstrapCard);
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div data-mps="card" class="card-body" v-bind="$attrs">
    <slot />
  </div>
</template>

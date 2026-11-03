<script setup lang="ts">
import { installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';
// #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
installBootstrap(bootstrapCard);
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div data-mps="card" class="card-group" v-bind="$attrs">
    <slot />
  </div>
</template>

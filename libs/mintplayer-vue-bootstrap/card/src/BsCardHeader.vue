<script setup lang="ts">
import { installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';
// A nav inside the header takes Bootstrap's own card-header-tabs /
// card-header-pills class, written on the nav.
import { computed } from 'vue';
import { capColorClasses, type CardColor } from '@mintplayer/ui-core/card';

// #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
installBootstrap(bootstrapCard);

defineOptions({ inheritAttrs: false });

const props = defineProps<{ color?: CardColor }>();

const classes = computed(() => ['card-header', ...capColorClasses(props.color)]);
</script>

<template>
  <div data-mps="card" :class="classes" v-bind="$attrs">
    <slot />
  </div>
</template>

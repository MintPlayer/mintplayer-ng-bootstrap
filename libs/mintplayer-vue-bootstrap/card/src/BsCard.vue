<script setup lang="ts">
import { installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';
// The card root (PRD #437 wave A): a plain div.card, no custom element and
// no core, so SSR emits the finished card and the card part (#452) styles it.
import { computed } from 'vue';
import { cardColorClasses, type CardColor } from '@mintplayer/ui-core/card';

// #452: the card partial ships with this component, scoped to the elements it stamps (data-mps="card").
installBootstrap(bootstrapCard);

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{ color?: CardColor; outline?: boolean }>(), { outline: false });

const classes = computed(() => ['card', ...cardColorClasses(props.color, props.outline)]);
</script>

<template>
  <div data-mps="card" :class="classes" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
// The card root (PRD #437 wave A): a plain div.card, no custom element and
// no core, so SSR emits the finished card and the page baseline styles it.
import { computed } from 'vue';
import { cardColorClasses, type CardColor } from '@mintplayer/ui-core/card';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{ color?: CardColor; outline?: boolean }>(), { outline: false });

const classes = computed(() => ['card', ...cardColorClasses(props.color, props.outline)]);
</script>

<template>
  <div :class="classes" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup lang="ts">
// A nav inside the header takes Bootstrap's own card-header-tabs /
// card-header-pills class, written on the nav.
import { computed } from 'vue';
import { capColorClasses, type CardColor } from '@mintplayer/ui-core/card';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ color?: CardColor }>();

const classes = computed(() => ['card-header', ...capColorClasses(props.color)]);
</script>

<template>
  <div :class="classes" v-bind="$attrs">
    <slot />
  </div>
</template>

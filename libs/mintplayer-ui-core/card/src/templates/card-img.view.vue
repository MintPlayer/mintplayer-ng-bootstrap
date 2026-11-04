<script setup lang="ts">
// The card image: a positioned box around the <img>, and for `overlay` the content laid over it.
import type { CardImgView } from '@mintplayer/ui-core/card';

defineProps<{ view: CardImgView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <img mp-attrs v-bind="view.img" :src="view.src" />
    <div v-if="view.overlay" v-bind="view.overlay"><slot /></div>
  </div>
</template>

<script setup lang="ts">
// A native radio in Bootstrap's canonical markup: root, input, then a <label for>.
import type { RadioView } from '@mintplayer/ui-core/radio';

defineProps<{ view: RadioView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <input mp-attrs v-bind="view.input" :checked.prop="view.checked" />
    <label v-bind="view.label"><slot /></label>
    <div v-if="view.feedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  </div>
</template>

<script setup lang="ts">
// A native checkbox in Bootstrap's canonical markup: root, input, then a <label for>.
// The toggle button renders this template too.
import type { CheckboxView } from '@mintplayer/ui-core/checkbox';

defineProps<{ view: CheckboxView }>();
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <input mp-attrs v-bind="view.input" :checked.prop="view.checked" :indeterminate.prop="view.indeterminate" />
    <label v-bind="view.label"><slot /></label>
    <div v-if="view.feedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  </div>
</template>

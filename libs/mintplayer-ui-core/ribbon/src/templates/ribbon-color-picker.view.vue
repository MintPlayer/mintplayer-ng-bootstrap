<script setup lang="ts">
// A ribbon colour picker (PRD #437 D10): a native colour input named by its label.
import type { RibbonItemView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonItemView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <label v-bind="view.wrap">
      <input v-bind="view.control" :value.prop="view.value" />
      <span v-if="view.label" v-bind="view.parts.fieldLabel">{{ view.label }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
// A ribbon combo box (PRD #437 D10): a native select; each option says whether it is selected.
import type { RibbonItemView, RibbonOptionView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonItemView; options: readonly RibbonOptionView[] }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <select v-bind="view.control">
      <option v-for="option in options" :key="option.key" v-bind="option.bag">{{ option.label }}</option>
    </select>
  </div>
</template>

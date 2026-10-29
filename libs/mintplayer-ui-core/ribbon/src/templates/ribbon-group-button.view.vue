<script setup lang="ts">
// A ribbon group button (PRD #437 D10): a radio group of buttons.
import type { RibbonItemView, RibbonRadioView } from '@mintplayer/ui-core/ribbon';

defineProps<{ view: RibbonItemView; radios: readonly RibbonRadioView[] }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.control">
      <button v-for="radio in radios" :key="radio.key" v-bind="radio.bag">
        <span v-if="radio.icon" v-bind="view.parts.radioIcon">{{ radio.icon }}</span>
        <span v-if="radio.label" v-bind="view.parts.radioLabel">{{ radio.label }}</span>
      </button>
    </div>
  </div>
</template>

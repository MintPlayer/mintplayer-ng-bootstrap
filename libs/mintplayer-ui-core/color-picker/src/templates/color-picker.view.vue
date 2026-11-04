<script setup lang="ts">
// The color picker: the wheel (a focusable slider the core drives) over native range sliders.
// The sliders' live values and the switch's checked state are properties.
import type { ColorPickerView } from '@mintplayer/ui-core/color-picker';

defineProps<{ view: ColorPickerView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.frame" :style="view.frameStyle">
      <div v-bind="view.wheel"><div class="color-picker-darken"></div><div class="color-picker-marker"></div></div>
      <input v-bind="view.brightness.attrs" :value.prop="view.brightness.value" />
      <input v-if="view.alpha" v-bind="view.alpha.attrs" :value.prop="view.alpha.value" />
      <div v-if="view.toggle" v-bind="view.toggle.wrapper"><input v-bind="view.toggle.input" :checked.prop="view.toggle.checked" /><label v-bind="view.toggle.label">{{ view.toggle.text }}</label></div>
      <input v-if="view.hue" v-bind="view.hue.attrs" :value.prop="view.hue.value" />
      <input v-if="view.saturation" v-bind="view.saturation.attrs" :value.prop="view.saturation.value" />
    </div>
  </div>
</template>

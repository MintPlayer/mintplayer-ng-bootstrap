<script setup lang="ts">
import { ref } from 'vue';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import { BsColorPicker } from '@mintplayer/vue-bootstrap/color-picker';

const color = ref('#0000ff');
const alpha = ref(1);

const SOURCE = `<BsColorPicker :size="200" v-model:value="color" v-model:alpha="alpha" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Color picker</h1>
    <p class="text-body-secondary">
      A hue/saturation wheel over native brightness and alpha sliders. The wheel is a focusable slider: the left
      and right arrows turn the hue (Page Up/Down by 30°), up and down change the saturation, Home and End jump to
      full and no saturation, Shift makes each step finer. The switch below reveals plain hue and saturation
      sliders, so every channel has a one-dimensional control. <code>v-model:value</code> is a hex,
      <code>v-model:alpha</code> runs from 0 to 1.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsColorPicker :size="200" v-model:value="color" v-model:alpha="alpha" />
      <p class="mt-3 d-flex align-items-center gap-2">
        Value: <code>{{ color }}</code>, alpha: <code>{{ alpha.toFixed(2) }}</code>. The native picker follows:
        <input v-model="color" type="color" aria-label="Native color picker" />
      </p>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

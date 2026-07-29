<script setup lang="ts">
import { ref } from 'vue';
import { BsRadio } from '@mintplayer/vue-bootstrap/radio';
import { BsRadioGroup } from '@mintplayer/vue-bootstrap/radio-group';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

// <BsRadioGroup> (the mp-radio-group WC) owns what shadow roots keep the
// platform from providing: one-of-N exclusivity, role="radiogroup", the
// roving tab stop and arrow move-and-select. v-model is the selected
// radio's value; keyboard selection is covered too (it produces no
// per-radio change event, only the group's group-change). Same rule for
// BOTH the form-check variant AND the toggle_button variant, since
// they're both <mp-radio>s under the hood.
const color = ref<string | null>('green');
const size = ref<string | null>('m');

const SOURCE = `<BsRadioGroup v-model="color" name="color" aria-label="Color">
  <BsRadio value="red">Red</BsRadio>
  <BsRadio value="green">Green</BsRadio>
</BsRadioGroup>`;
</script>

<template>
  <div class="demo-page">
    <h1>Radio</h1>

    <section>
      <h2>With labels</h2>
      <BsRadioGroup v-model="color" name="color" aria-label="Color">
        <BsRadio value="red">Red</BsRadio>
        <BsRadio value="green">Green</BsRadio>
        <BsRadio value="blue">Blue</BsRadio>
      </BsRadioGroup>
      <p>Selected: {{ color }}</p>
    </section>

    <section>
      <h2>Toggle-button variant</h2>
      <BsRadioGroup v-model="size" name="size" aria-label="Size">
        <BsRadio type="toggle_button" value="s" color="outline-primary">Small</BsRadio>
        <BsRadio type="toggle_button" value="m" color="outline-primary">Medium</BsRadio>
        <BsRadio type="toggle_button" value="l" color="outline-primary">Large</BsRadio>
      </BsRadioGroup>
      <p>Selected: {{ size }}</p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

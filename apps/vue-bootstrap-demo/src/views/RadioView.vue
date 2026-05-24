<script setup lang="ts">
import { ref } from 'vue';
import { BsRadio } from '@mintplayer/vue-bootstrap/radio';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

// Each <mp-radio> is in its own shadow root, so the browser's native
// one-of-N (auto-unchecking siblings) can't cross WC boundaries. Use a
// single value() ref + per-radio :checked + @change handlers to mirror
// the [bsRadioGroup] coordination pattern. Same rule applies to BOTH
// the form-check variant AND the toggle_button variant, since they're
// both <mp-radio>s under the hood.
const color = ref<'red' | 'green' | 'blue'>('green');
const size = ref<'s' | 'm' | 'l'>('m');

function pick(c: 'red' | 'green' | 'blue', e: CustomEvent<{ checked: boolean }>) {
  if (e.detail?.checked) color.value = c;
}

function pickSize(s: 's' | 'm' | 'l', e: CustomEvent<{ checked: boolean }>) {
  if (e.detail?.checked) size.value = s;
}

const SOURCE = `<BsRadio name="color" :checked="color === 'red'"
          @change="e => pick('red', e)">Red</BsRadio>
<BsRadio name="color" :checked="color === 'green'"
          @change="e => pick('green', e)">Green</BsRadio>`;
</script>

<template>
  <div class="demo-page">
    <h1>Radio</h1>

    <section>
      <h2>With labels</h2>
      <BsRadio name="color" value="red"   :checked="color === 'red'"   @change="(e: CustomEvent<{ checked: boolean }>) => pick('red', e)">Red</BsRadio>
      <BsRadio name="color" value="green" :checked="color === 'green'" @change="(e: CustomEvent<{ checked: boolean }>) => pick('green', e)">Green</BsRadio>
      <BsRadio name="color" value="blue"  :checked="color === 'blue'"  @change="(e: CustomEvent<{ checked: boolean }>) => pick('blue', e)">Blue</BsRadio>
    </section>

    <section>
      <h2>Toggle-button variant</h2>
      <BsRadio name="size" type="toggle_button" value="s" color="outline-primary" :checked="size === 's'" @change="(e: CustomEvent<{ checked: boolean }>) => pickSize('s', e)">Small</BsRadio>
      <BsRadio name="size" type="toggle_button" value="m" color="outline-primary" :checked="size === 'm'" @change="(e: CustomEvent<{ checked: boolean }>) => pickSize('m', e)">Medium</BsRadio>
      <BsRadio name="size" type="toggle_button" value="l" color="outline-primary" :checked="size === 'l'" @change="(e: CustomEvent<{ checked: boolean }>) => pickSize('l', e)">Large</BsRadio>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BsRange } from '@mintplayer/vue-bootstrap/range';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const value = ref(2.5);
const disabled = ref(false);
const SOURCE = `<BsRange v-model:value="value" :min="0" :max="5" :step="0.5" label="Rating" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Range</h1>
    <p class="text-body-secondary">
      A native slider (<code>.form-range</code>): the browser owns its role, value and keys (arrows,
      Page Up/Down, Home/End). <code>v-model:value</code> binds it; <code>label</code> names it when
      no <code>&lt;label for&gt;</code> does.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsRange v-model:value="value" :min="0" :max="5" :step="0.5" :disabled="disabled" label="Rating" />
      <p>Value: {{ value }}</p>
      <label class="form-check"><input v-model="disabled" type="checkbox" class="form-check-input" /> Disabled</label>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

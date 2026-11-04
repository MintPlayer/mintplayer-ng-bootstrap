<script setup lang="ts">
import { ref } from 'vue';
import { BsPlaceholder } from '@mintplayer/vue-bootstrap/placeholder';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const loading = ref(true);
const LINES = ['Cras justo odio', 'Dapibus ac facilisis in', 'Morbi leo risus'];

const SOURCE = `<script setup lang="ts">
import { BsPlaceholder } from '@mintplayer/vue-bootstrap/placeholder';
<\/script>

<template>
  <BsPlaceholder :loading="loading">
    <h5 data-placeholder-field>Featured</h5>
    <p data-placeholder-field>{{ text }}</p>
  </BsPlaceholder>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Placeholders</h1>
    <p class="text-body-secondary">
      While <code>loading</code>, every element marked <code>data-placeholder-field</code> renders
      as a glowing skeleton bar and the region is <code>aria-busy</code>; when loading ends,
      <code>loadedText</code> is announced once.
    </p>

    <section>
      <h2>Basic usage</h2>
      <div class="form-check form-switch mb-2">
        <input id="placeholder-loading" v-model="loading" class="form-check-input" type="checkbox" role="switch" />
        <label class="form-check-label" for="placeholder-loading">Loading</label>
      </div>
      <BsPlaceholder :loading="loading">
        <h5 data-placeholder-field>Featured</h5>
        <p v-for="line in LINES" :key="line" class="mb-1"><span data-placeholder-field>{{ line }}</span></p>
      </BsPlaceholder>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

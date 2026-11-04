<script setup lang="ts">
import { ref } from 'vue';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import { BsRating } from '@mintplayer/vue-bootstrap/rating';

const value = ref(3);
const preview = ref<number | null>(null);

const SOURCE = `<BsRating :maximum="10" v-model:value="value" @previewchange="preview = $event" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Rating</h1>
    <p class="text-body-secondary">
      A star rating as native radios in a radiogroup: <code>value</code> (0 for none) out of
      <code>maximum</code>. Arrow keys move between the stars, the value submits with a form under
      <code>name</code>, and it works without JavaScript. <code>@previewchange</code> reports the star under the
      pointer (null when it leaves); <code>label</code> and <code>starLabel</code> localise the names.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsRating :maximum="10" v-model:value="value" @previewchange="preview = $event" />
      <p class="mt-2">
        Value: <code>{{ value }}</code>, showing: <code>{{ preview ?? value }}</code>
      </p>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

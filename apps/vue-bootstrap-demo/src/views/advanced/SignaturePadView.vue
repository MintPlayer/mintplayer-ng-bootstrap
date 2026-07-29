<script setup lang="ts">
import { ref } from 'vue';
import { BsSignaturePad, type Signature } from '@mintplayer/vue-bootstrap/signature-pad';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const signature = ref<Signature>({ strokes: [] });

const SOURCE = `<BsSignaturePad
  v-model="signature"
  :width="500"
  :height="300"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Signature pad</h1>
    <p class="text-body-secondary">
      Freehand signature capture on a canvas. Drawing has no keyboard
      equivalent, so the pad ships a typed-signature alternative: the text
      input below the canvas renders its value in a script font and stores
      it on <code>Signature.text</code>. Undo and Clear are regular buttons
      in the tab order.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsSignaturePad v-model="signature" :width="500" :height="300" />
      <p class="text-body-secondary mt-2">
        Strokes: <code>{{ signature.strokes.length }}</code>
        <template v-if="signature.text"> · Typed: <code>{{ signature.text }}</code></template>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

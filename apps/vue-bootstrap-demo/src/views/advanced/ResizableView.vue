<script setup lang="ts">
import { ref } from 'vue';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import { BsResizable } from '@mintplayer/vue-bootstrap/resizable';

const TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sit consectetur ipsam qui libero commodi facilis velit ' +
  'voluptatum, ad aliquam soluta, repellat adipisci dignissimos nostrum suscipit fuga autem aut expedita ullam.';

const PRESET = { left: 16, top: 16, width: 320, height: 160 };
const size = ref('');

const INLINE_SOURCE = `<BsResizable>
  <div class="p-2 h-100">Drag any edge, or focus it and use the arrow keys.</div>
</BsResizable>`;

const ABSOLUTE_SOURCE = `<div class="position-relative stage">
  <BsResizable positioning="absolute" :preset-position="{ left: 16, top: 16, width: 320, height: 160 }">
    <div class="p-2 h-100">…</div>
  </BsResizable>
</div>`;
</script>

<template>
  <div class="demo-page">
    <h1>Resizable</h1>
    <p class="text-body-secondary">
      <code>BsResizable</code> wraps any content in a box with draggable edges and corners. Each glyph is also a
      focusable separator: the arrow keys move its edge by 10px, Shift by 1px. Inline positioning grows the box by
      giving back margin, so the content around it stays put; <code>positioning="absolute"</code> writes its own size
      and offset inside a positioned ancestor. <code>labels</code> translates the glyphs' names.
    </p>

    <section>
      <h2>Inline positioning</h2>
      <BsResizable @resized="(g) => (size = g.width === null ? '' : `${g.width}px wide`)">
        <div class="p-2 h-100 resizable-demo-box">
          <p>{{ TEXT }}</p>
        </div>
      </BsResizable>
      <p class="mt-2">Last resize: <code>{{ size || 'none yet' }}</code></p>
      <BsCodeSnippet :code="INLINE_SOURCE" language="html" />
    </section>

    <section>
      <h2>Absolute positioning</h2>
      <div class="position-relative resizable-demo-stage border">
        <BsResizable positioning="absolute" :preset-position="PRESET">
          <div class="p-2 h-100 resizable-demo-box">
            <p>{{ TEXT }}</p>
          </div>
        </BsResizable>
      </div>
      <BsCodeSnippet :code="ABSOLUTE_SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
.resizable-demo-stage {
  height: 18rem;
}

.resizable-demo-box {
  overflow-y: auto;
}
</style>

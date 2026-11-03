<script setup lang="ts">
import { BsStickyFooter, vBsStickyFooterParent } from '@mintplayer/vue-bootstrap/sticky-footer';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = `<div v-bs-sticky-footer-parent>
  …content…
  <BsStickyFooter>© Copyright</BsStickyFooter>
</div>`;
</script>

<template>
  <div v-bs-sticky-footer-parent>
    <div class="demo-page">
      <h1>Sticky footer</h1>
      <p class="text-body-secondary">
        Pure CSS: <code>v-bs-sticky-footer-parent</code> makes the element a flex column at least
        <code>--mp-sticky-footer-min-height</code> tall (default <code>100dvh</code>), and
        <code>BsStickyFooter</code> takes the free space above itself, so the footer sits at the
        bottom of the viewport while the content is short.
      </p>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </div>
    <BsStickyFooter>
      <div class="py-3 px-4 bg-body-tertiary border-top">© Copyright</div>
    </BsStickyFooter>
  </div>
</template>

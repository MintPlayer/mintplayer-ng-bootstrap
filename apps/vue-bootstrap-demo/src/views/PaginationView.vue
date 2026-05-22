<script setup lang="ts">
import { BsPagination } from '@mintplayer/vue-bootstrap/pagination';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsPagination />";
</script>

<template>
  <div class="demo-page">
    <h1>Pagination</h1>
    <section>
      <h2>Default</h2>
      <BsPagination />
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

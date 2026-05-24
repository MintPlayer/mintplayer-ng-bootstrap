<script setup lang="ts">
import { ref } from 'vue';
import { BsPagination } from '@mintplayer/vue-bootstrap/pagination';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const smallPages = [1, 2, 3, 4, 5];
const largePages = Array.from({ length: 30 }, (_, i) => i + 1);
const smallPage = ref(1);
const bigPage = ref(15);

const SOURCE = `<script setup lang="ts">
import { ref } from 'vue';
import { BsPagination } from '@mintplayer/vue-bootstrap/pagination';

const pages = Array.from({ length: 30 }, (_, i) => i + 1);
const page = ref(1);
<\\/script>

<template>
  <BsPagination
    :page-numbers="pages"
    v-model="page"
    :number-of-boxes="9"
  />
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Pagination</h1>
    <p class="text-body-secondary">
      Page selector with first/last anchors, ellipsis gaps, and prev/next
      arrows. The visible budget is capped by <code>numberOfBoxes</code>;
      pass any sorted <code>number[]</code> via <code>pageNumbers</code>.
    </p>

    <section>
      <h2>Small set</h2>
      <BsPagination :page-numbers="smallPages" v-model="smallPage" />
      <small class="text-muted d-block mt-1">Selected: {{ smallPage }}</small>
    </section>

    <section>
      <h2>Capped with ellipsis</h2>
      <BsPagination :page-numbers="largePages" v-model="bigPage" :number-of-boxes="9" />
      <small class="text-muted d-block mt-1">Selected: {{ bigPage }}</small>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const META_SOURCE = `<script setup lang="ts">
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
<\/script>

<template>
  <BsCodeSnippet language="tsx" :code="\`const greet = (n: string) => \\\`hi, \${n}\\\`;\`" />
</template>`;

const SAMPLE_TS = `interface User {
  id: number;
  name: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

export const me: User = { id: 1, name: 'Pieterjan' };`;

const SAMPLE_VUE = `<script setup lang="ts">
import { ref } from 'vue';
const count = ref(0);
<\/script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Code snippet</h1>
    <p class="text-body-secondary">
      Syntax-highlighted source with copy-to-clipboard. Same WC powers the
      snippets across all three framework demos.
    </p>
    <section>
      <h2>TypeScript (auto-detected)</h2>
      <BsCodeSnippet :code="SAMPLE_TS" />
    </section>
    <section>
      <h2>Vue SFC (explicit language)</h2>
      <BsCodeSnippet :code="SAMPLE_VUE" language="html" />
    </section>
    <section>
      <h2>Usage</h2>
      <BsCodeSnippet :code="META_SOURCE" language="html" />
    </section>
  </div>
</template>

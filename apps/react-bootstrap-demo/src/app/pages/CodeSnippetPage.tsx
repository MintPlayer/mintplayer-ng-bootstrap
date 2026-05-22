import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const META_SOURCE = `import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

export function Example() {
  return (
    <BsCodeSnippet language="tsx" code={\`const greet = (n: string) => \\\`hi, \${n}\\\`;\`} />
  );
}`;

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
</script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
</template>`;

export function CodeSnippetPage() {
  return (
    <div className="demo-page">
      <h1>Code snippet</h1>
      <p className="text-body-secondary">
        Syntax-highlighted source with copy-to-clipboard. Same WC powers the
        snippets across all three framework demos.
      </p>
      <section>
        <h2>TypeScript (auto-detected)</h2>
        <BsCodeSnippet code={SAMPLE_TS} />
      </section>
      <section>
        <h2>Vue SFC (explicit language)</h2>
        <BsCodeSnippet code={SAMPLE_VUE} language="html" />
      </section>
      <section>
        <h2>Usage</h2>
        <BsCodeSnippet code={META_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

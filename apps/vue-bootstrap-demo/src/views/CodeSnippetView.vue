<script setup lang="ts">
import { ref } from 'vue';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { CodeLineAnnotation } from '@mintplayer/web-components/code-snippet';

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

/** Coverage-shaped, but `kind` is opaque — this page styles it, not the component. */
const COVERAGE: CodeLineAnnotation[] = [
  { line: 1, kind: 'covered', label: '1×' },
  { line: 2, kind: 'covered', label: '1×' },
  { line: 3, kind: 'covered', label: '1×' },
  { line: 6, kind: 'partial', label: '4×', secondaryLabel: '1/2', description: 'Branches: 1 of 2 taken' },
  { line: 7, kind: 'uncovered', label: '0' },
  { line: 9, kind: 'covered', label: '2×' },
];

const ANNOTATED_SOURCE = `<BsCodeSnippet
  class="coverage"
  :code="source"
  language="ts"
  line-numbers
  :annotations="COVERAGE"
  :active-line="activeLine"
  :line-href="(line: number) => \`#L\${line}\`"
  @line-activate="onLineActivate" />

<!-- kind is opaque — colour it yourself:
     .coverage::part(annotation-uncovered) { background: rgb(220 53 69 / 16%); } -->`;

const activeLine = ref<number | null>(6);
const lineHref = (line: number) => `#L${line}`;

// The event is cancelable; cancel it when you handle activation yourself,
// or the anchor navigates as well.
function onLineActivate(event: CustomEvent<{ line: number }>): void {
  event.preventDefault();
  activeLine.value = event.detail.line;
}
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
      <h2>Line numbers</h2>
      <BsCodeSnippet :code="SAMPLE_TS" language="ts" line-numbers />
    </section>
    <section>
      <h2>Theming</h2>
      <p class="text-body-secondary">
        The block follows the page's <code>data-bs-theme</code> with no wiring.
        Pass <code>theme</code> to pin it instead.
      </p>
      <div class="d-flex gap-3 flex-wrap">
        <div class="flex-grow-1" data-bs-theme="light">
          <BsCodeSnippet :code="SAMPLE_TS" language="ts" label="Light theme example" />
        </div>
        <div class="flex-grow-1" data-bs-theme="dark">
          <BsCodeSnippet :code="SAMPLE_TS" language="ts" label="Dark theme example" />
        </div>
      </div>
    </section>
    <section>
      <h2>Per-line annotations</h2>
      <p class="text-body-secondary">
        Tab reaches the active line, then the arrow keys move between line links and
        Home / End jump to the ends. Each line number is a real link, so middle-click
        still opens it.
      </p>
      <BsCodeSnippet
        class="coverage"
        :code="SAMPLE_TS"
        language="ts"
        line-numbers
        :annotations="COVERAGE"
        :active-line="activeLine"
        :line-href="lineHref"
        label="Coverage report for greet()"
        @line-activate="onLineActivate"
      />
      <BsCodeSnippet :code="ANNOTATED_SOURCE" language="html" />
    </section>
    <section>
      <h2>Usage</h2>
      <BsCodeSnippet :code="META_SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
/*
  Annotation colours belong to the consumer: `kind` is opaque, so the component
  ships no rule for it and `::part(annotation-<kind>)` is the channel.

  The Vue wrapper has no host element of its own — `v-bind="$attrs"` puts the
  class straight onto `<mp-code-snippet>` — so `::part()` matches with no
  descendant step, as in React. (Angular needs `::ng-deep mp-code-snippet`.)
*/
.coverage::part(annotation-covered) {
  background: rgb(25 135 84 / 14%);
}

.coverage::part(annotation-partial) {
  background: rgb(255 193 7 / 20%);
}

.coverage::part(annotation-uncovered) {
  background: rgb(220 53 69 / 16%);
}
</style>

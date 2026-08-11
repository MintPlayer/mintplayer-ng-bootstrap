import { useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type { CodeLineAnnotation } from '@mintplayer/web-components/code-snippet';
import './CodeSnippetPage.css';

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

/** Coverage-shaped, but `kind` is opaque — this page styles it, not the component. */
const COVERAGE: CodeLineAnnotation[] = [
  { line: 1, kind: 'covered', label: '1×' },
  { line: 2, kind: 'covered', label: '1×' },
  { line: 3, kind: 'covered', label: '1×' },
  { line: 6, kind: 'partial', label: '4×', secondaryLabel: '1/2', description: 'Branches: 1 of 2 taken' },
  { line: 7, kind: 'uncovered', label: '0' },
  { line: 9, kind: 'covered', label: '2×' },
];

const ANNOTATED_SOURCE = `const COVERAGE: CodeLineAnnotation[] = [
  { line: 7, kind: 'uncovered', label: '0' },
];

<BsCodeSnippet
  code={source}
  language="ts"
  lineNumbers
  annotations={COVERAGE}
  activeLine={active}
  lineHref={(line) => \`#L\${line}\`}
  onLineActivate={(e) => { e.preventDefault(); setActive(e.detail.line); }}
/>

/* kind is opaque — colour it yourself:
   .coverage::part(annotation-uncovered) { background: rgb(220 53 69 / 16%); } */`;

export function CodeSnippetPage() {
  const [activeLine, setActiveLine] = useState<number | null>(6);

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
        <h2>Line numbers</h2>
        <BsCodeSnippet code={SAMPLE_TS} language="ts" lineNumbers />
      </section>
      <section>
        <h2>Theming</h2>
        <p className="text-body-secondary">
          The block follows the page's <code>data-bs-theme</code> with no wiring.
          Pass <code>theme</code> to pin it instead.
        </p>
        <div className="d-flex gap-3 flex-wrap">
          <div className="flex-grow-1 theme-pane" data-bs-theme="light">
            <BsCodeSnippet code={SAMPLE_TS} language="ts" label="Light theme example" />
          </div>
          <div className="flex-grow-1 theme-pane" data-bs-theme="dark">
            <BsCodeSnippet code={SAMPLE_TS} language="ts" label="Dark theme example" />
          </div>
        </div>
      </section>
      <section>
        <h2>Per-line annotations</h2>
        <p className="text-body-secondary">
          Tab reaches the active line, then the arrow keys move between line links and
          Home / End jump to the ends. Each line number is a real link, so middle-click
          still opens it.
        </p>
        <BsCodeSnippet
          className="coverage"
          code={SAMPLE_TS}
          language="ts"
          lineNumbers
          annotations={COVERAGE}
          activeLine={activeLine}
          lineHref={(line: number) => `#L${line}`}
          label="Coverage report for greet()"
          onLineActivate={(e) => { e.preventDefault(); setActiveLine(e.detail.line); }}
        />
        <BsCodeSnippet code={ANNOTATED_SOURCE} language="tsx" />
      </section>
      <section>
        <h2>Usage</h2>
        <BsCodeSnippet code={META_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

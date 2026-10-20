<script setup lang="ts">
import { ref } from 'vue';
import { BsTypeahead, inMemoryTypeaheadProvider, type TypeaheadRequest } from '@mintplayer/vue-bootstrap/typeahead';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

interface Artist {
  id: number;
  text: string;
  genre: string;
}

const ARTISTS: Artist[] = [
  { id: 1, text: 'Michael Jackson', genre: 'Pop' },
  { id: 2, text: 'Paul Spencer', genre: 'Rock' },
  { id: 3, text: 'Noel Gallagher', genre: 'Britpop' },
  { id: 4, text: 'Chris Martin', genre: 'Alternative' },
  { id: 5, text: 'Michael Bublé', genre: 'Jazz' },
];

const instant = inMemoryTypeaheadProvider(ARTISTS);
const aborted = ref(0);
const selected = ref<Artist | null>(null);
const value = ref('');

/** A slow "server" that honours the abort signal: type "mi", then quickly "mich". */
function slow(term: string, { signal }: TypeaheadRequest): Promise<Artist[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(ARTISTS.filter((a) => a.text.toLowerCase().includes(term.toLowerCase()))), 1500);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
      aborted.value += 1;
    });
  });
}

function parts(text: string, term: string) {
  const t = term.trim();
  const i = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
  if (i < 0) return { before: text, match: '', after: '' };
  return { before: text.slice(0, i), match: text.slice(i, i + t.length), after: text.slice(i + t.length) };
}

const snippet = `<BsTypeahead
  v-model="street"
  :provider="(term, { signal }) => fetch(\`/api/artists?q=\${term}\`, { signal }).then((r) => r.json())"
  :debounce-ms="200"
  :min-length="2"
  input-label="Artist"
  @select="onSelect"
>
  <template #item="{ item, term }">
    <strong>{{ item.text }}</strong> <small>{{ item.genre }}</small>
  </template>
</BsTypeahead>`;
</script>

<template>
  <h1 class="text-center">Typeahead</h1>
  <p>
    A text input with asynchronous suggestions and free text, rendered by Vue from the same headless core as the
    Angular, React and web-component typeaheads. The <code>provider</code> receives an <code>AbortSignal</code>; a
    superseded request is aborted and its answer never shown.
  </p>

  <h2>Slow provider with cancellation</h2>
  <BsTypeahead
    v-model="value"
    :provider="slow"
    :debounce-ms="200"
    :min-length="2"
    input-label="Artist"
    @select="(item: Artist) => (selected = item)"
  />
  <p class="mt-2 small text-secondary">
    Aborted requests: <span data-testid="aborted">{{ aborted }}</span> · Selected:
    <span data-testid="selected">{{ selected?.text ?? '—' }}</span> · Value: {{ value || '—' }}
  </p>

  <h2>Custom row</h2>
  <BsTypeahead :provider="instant" :debounce-ms="0" input-label="Artist, highlighted">
    <template #item="{ item, term }">
      {{ parts((item as Artist).text, term).before }}<mark>{{ parts((item as Artist).text, term).match }}</mark>{{ parts((item as Artist).text, term).after }}
      <small class="text-secondary">{{ (item as Artist).genre }}</small>
    </template>
  </BsTypeahead>

  <BsCodeSnippet :code="snippet" language="html" />

  <h2>Keyboard</h2>
  <table class="table table-sm w-auto">
    <thead><tr><th>Key</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td><kbd>↓</kbd> / <kbd>↑</kbd></td><td>Open the list; move the highlighted suggestion (focus stays in the input)</td></tr>
      <tr><td><kbd>Home</kbd> / <kbd>End</kbd></td><td>First / last suggestion</td></tr>
      <tr><td><kbd>Enter</kbd></td><td>Pick the highlighted suggestion, or submit the text</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Close the list</td></tr>
      <tr><td><kbd>Tab</kbd></td><td>Close the list and move on</td></tr>
    </tbody>
  </table>
</template>

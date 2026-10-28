<script setup lang="ts">
import { ref } from 'vue';
import { BsCalendar } from '@mintplayer/vue-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const selectedDate = ref<Date | null>(new Date());
const SOURCE = '<BsCalendar v-model:selected-date="selectedDate" />';
</script>

<template>
  <div class="demo-page">
    <h1>Calendar</h1>
    <p class="text-body-secondary">
      Accessible month-grid date picker with full keyboard navigation, generated
      from one source for Angular, React, Vue and Lit.
    </p>

    <details class="mb-2">
      <summary>Keyboard shortcuts</summary>
      <ul class="mb-0">
        <li><kbd>Tab</kbd> — focus previous-month → grid → next-month</li>
        <li><kbd>←</kbd> / <kbd>→</kbd> — previous / next day</li>
        <li><kbd>↑</kbd> / <kbd>↓</kbd> — previous / next week</li>
        <li><kbd>Home</kbd> / <kbd>End</kbd> — first / last day of the focused week</li>
        <li><kbd>PageUp</kbd> / <kbd>PageDown</kbd> — previous / next month</li>
        <li><kbd>Ctrl</kbd> + <kbd>PageUp</kbd> / <kbd>Ctrl</kbd> + <kbd>PageDown</kbd> — previous / next year</li>
        <li><kbd>Enter</kbd> / <kbd>Space</kbd> — select the focused day</li>
      </ul>
    </details>

    <section>
      <h2>Default</h2>
      <BsCalendar v-model:selected-date="selectedDate" />
      <p class="text-body-secondary mt-2">
        Selected: <code>{{ selectedDate?.toDateString() }}</code>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

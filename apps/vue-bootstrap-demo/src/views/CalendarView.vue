<script setup lang="ts">
import { BsCalendar } from '@mintplayer/vue-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsCalendar />";
</script>

<template>
  <div class="demo-page">
    <h1>Calendar</h1>
    <p class="text-body-secondary">
      Accessible month-grid date picker with full keyboard navigation. The
      same WC drives the Angular and React demos.
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
      <BsCalendar />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

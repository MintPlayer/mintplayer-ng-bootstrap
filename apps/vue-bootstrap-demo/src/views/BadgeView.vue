<script setup lang="ts">
import { BsBadge } from '@mintplayer/vue-bootstrap/badge';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const COLORS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'] as const;

const SOURCE = `<script setup lang="ts">
import { BsBadge } from '@mintplayer/vue-bootstrap/badge';
<\/script>

<template>
  <h2>Inbox <BsBadge color="primary" unit="unread messages">5</BsBadge></h2>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Badge</h1>
    <p class="text-body-secondary">
      An inline Bootstrap badge for counters and status labels. <code>unit</code> says what a
      number counts, visually hidden; <code>decorative</code> takes a badge out of the
      accessibility tree.
    </p>

    <section>
      <h2>In a heading</h2>
      <h3>Inbox <BsBadge color="primary" unit="unread messages">5</BsBadge></h3>
    </section>

    <section>
      <h2>Colours</h2>
      <p class="d-flex flex-wrap gap-2">
        <BsBadge v-for="color in COLORS" :key="color" :color="color">{{ color }}</BsBadge>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

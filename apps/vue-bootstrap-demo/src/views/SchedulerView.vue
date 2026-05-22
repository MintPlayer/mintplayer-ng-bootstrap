<script setup lang="ts">
import { BsScheduler } from '@mintplayer/vue-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
const SOURCE = `<script setup lang="ts">
import { BsScheduler } from '@mintplayer/vue-bootstrap/scheduler';
<\/script>

<template>
  <BsScheduler view="week" />
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Scheduler</h1>
    <p class="text-body-secondary">
      Resource-grid scheduler with day / week / month views and
      drag-to-reschedule.
    </p>
    <section>
      <h2>Default week view</h2>
      <div style="height: 500px; border: 1px solid var(--bs-border-color); border-radius: 0.375rem;">
        <BsScheduler />
      </div>
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

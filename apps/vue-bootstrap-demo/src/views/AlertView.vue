<script setup lang="ts">
import { ref } from 'vue';
import { BsAlert } from '@mintplayer/vue-bootstrap/alert';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const warning = ref(true);
const danger = ref(true);

function showAll() {
  warning.value = true;
  danger.value = true;
}

const SOURCE = `<script setup lang="ts">
import { ref } from 'vue';
import { BsAlert } from '@mintplayer/vue-bootstrap/alert';
const visible = ref(true);
<\/script>

<template>
  <BsAlert color="warning" dismissible v-model:visible="visible">Heads up.</BsAlert>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Alert</h1>
    <p class="text-body-secondary">
      A contextual banner. <code>visible</code> is two-way; <code>dismissible</code> adds a close
      button (named by <code>closeLabel</code>) that hides the alert and moves focus to the next
      control; <code>announce</code> opts in to <code>role="alert"</code> for dynamic alerts.
    </p>

    <section>
      <h2>Colours</h2>
      <BsAlert color="info">A static, informational banner.</BsAlert>
      <BsAlert color="success">Saved.</BsAlert>
    </section>

    <section>
      <h2>Dismissible</h2>
      <BsAlert color="warning" dismissible v-model:visible="warning">Heads up.</BsAlert>
      <BsAlert color="danger" dismissible close-label="Dismiss error" v-model:visible="danger">Something went wrong.</BsAlert>
      <button type="button" class="btn btn-primary" @click="showAll">Show all alerts again</button>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

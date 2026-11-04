<script setup lang="ts">
import { ref } from 'vue';
import { BsClose } from '@mintplayer/vue-bootstrap/close';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const clicks = ref(0);

const SOURCE = `<script setup lang="ts">
import { BsClose } from '@mintplayer/vue-bootstrap/close';
const emit = defineEmits<{ dismiss: [] }>();
<\/script>

<template>
  <BsClose label="Dismiss notice" @click="emit('dismiss')" />
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Close button</h1>
    <p class="text-body-secondary">
      Bootstrap's dismiss button: a real <code>&lt;button&gt;</code> named by <code>label</code>.
      Listen for its native click.
    </p>

    <section>
      <h2>Basic usage</h2>
      <p class="d-flex align-items-center gap-3">
        <BsClose label="Dismiss notice" @click="clicks++" />
        <span>Clicked {{ clicks }} times</span>
      </p>
      <p class="d-flex align-items-center gap-3">
        <BsClose disabled />
        <span>Disabled</span>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

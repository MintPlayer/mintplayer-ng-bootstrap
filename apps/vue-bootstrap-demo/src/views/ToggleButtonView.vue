<script setup lang="ts">
import { ref } from 'vue';
import { BsToggleButton } from '@mintplayer/vue-bootstrap/toggle-button';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const primary = ref(false);
const success = ref(true);

const SOURCE = `<script setup lang="ts">
import { ref } from 'vue';
import { BsToggleButton } from '@mintplayer/vue-bootstrap/toggle-button';

const on = ref(false);
<\\/script>

<template>
  <BsToggleButton v-model="on" color="primary">
    {{ on ? 'On' : 'Off' }}
  </BsToggleButton>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Toggle button</h1>
    <p class="text-body-secondary">
      On/off button using Bootstrap&apos;s <code>btn-check</code> +
      <code>label.btn</code> pattern. Emits a native-style
      <code>change</code> event with <code>detail.checked</code>.
    </p>

    <section>
      <h2>Default</h2>
      <BsToggleButton v-model="primary" color="primary">
        {{ primary ? 'On' : 'Off' }}
      </BsToggleButton>
    </section>

    <section>
      <h2>Colour variants</h2>
      <BsToggleButton v-model="success" color="outline-success">
        Outline success
      </BsToggleButton>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

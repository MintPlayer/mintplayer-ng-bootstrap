<script setup lang="ts">
import { ref } from 'vue';
import { BsOtpInput } from '@mintplayer/vue-bootstrap/otp-input';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const code = ref('');
const completedCode = ref<string | null>(null);

function onComplete(e: CustomEvent<string>) {
  completedCode.value = e.detail;
}

const SOURCE = `<BsOtpInput
  v-model="code"
  :length="6"
  type="numeric"
  @complete="(e: CustomEvent<string>) => alert('Code: ' + e.detail)"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>OTP input</h1>
    <p class="text-body-secondary">
      Segmented one-time-passcode input. <code>value-change</code> fires
      on every character; <code>complete</code> fires once when every
      slot is filled.
    </p>

    <section>
      <h2>6-digit numeric code</h2>
      <BsOtpInput
        v-model="code"
        :length="6"
        type="numeric"
        @complete="onComplete"
      />
      <p class="text-body-secondary mt-2">
        Current value: <code>{{ code || '—' }}</code>
        <template v-if="completedCode"> · Completed: <code>{{ completedCode }}</code></template>
      </p>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BsOtpInput } from '@mintplayer/vue-bootstrap/otp-input';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const code = ref('');
const completedCode = ref<string | null>(null);

const SOURCE = `<BsOtpInput
  v-model:value="code"
  aria-label="Verification code"
  @complete="(code) => verify(code)"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>OTP input</h1>
    <p class="text-body-secondary">
      Segmented one-time-passcode input. <code>v-model:value</code> follows
      every character; <code>complete</code> fires once when every box is
      filled. With JavaScript off it is a plain text field that submits under
      <code>name</code>.
    </p>

    <section>
      <h2>6-digit numeric code</h2>
      <BsOtpInput v-model:value="code" aria-label="Verification code" @complete="completedCode = $event" />
      <p class="text-body-secondary mt-2">
        Current value: <code>{{ code || '—' }}</code>
        <template v-if="completedCode"> · Completed: <code>{{ completedCode }}</code></template>
      </p>
    </section>

    <section>
      <h2>Product key</h2>
      <BsOtpInput aria-label="Product key" :groups="[5, 5, 5, 5, 5]" type="alphanumeric" />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

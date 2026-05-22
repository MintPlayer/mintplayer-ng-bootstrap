<script setup lang="ts">
import { BsOtpInput } from '@mintplayer/vue-bootstrap/otp-input';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const SOURCE = "<BsOtpInput />";
</script>

<template>
  <div class="demo-page">
    <h1>OTP input</h1>
    <section>
      <h2>Default</h2>
      <BsOtpInput />
    </section>
    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

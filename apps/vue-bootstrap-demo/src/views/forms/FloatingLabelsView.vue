<script setup lang="ts">
import { ref } from 'vue';
import { BsForm } from '@mintplayer/vue-bootstrap/form';
import { BsFloatingLabel } from '@mintplayer/vue-bootstrap/floating-labels';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const sent = ref(0);
const SOURCE = `<BsForm @submitted="sent++">
  <BsFloatingLabel>
    <input type="email" class="form-control" placeholder="name@example.com" />
    <label>Email address</label>
  </BsFloatingLabel>
</BsForm>`;
</script>

<template>
  <div class="demo-page">
    <h1>Floating labels</h1>
    <p class="text-body-secondary">
      <code>BsForm</code> renders a real <code>&lt;form&gt;</code> that styles the Bootstrap form
      classes inside it; <code>@submitted</code> reports a submit (without an <code>action</code>,
      the page reload is cancelled). <code>BsFloatingLabel</code> takes a control and then its
      <code>&lt;label&gt;</code>, and points a label without <code>for</code> at the control.
    </p>

    <section>
      <h2>Basic usage</h2>
      <BsForm @submitted="sent++">
        <BsFloatingLabel class="mb-3">
          <input type="email" class="form-control" placeholder="name@example.com" />
          <label>Email address</label>
        </BsFloatingLabel>
        <BsFloatingLabel class="mb-3">
          <input type="password" class="form-control" placeholder="Password" />
          <label>Password</label>
        </BsFloatingLabel>
        <button type="submit" class="btn btn-primary">Sign in</button>
        <span class="ms-3" role="status">{{ sent ? `Submitted ${sent}×` : '' }}</span>
      </BsForm>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

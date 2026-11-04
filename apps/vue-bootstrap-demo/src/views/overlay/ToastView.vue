<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { ToastQueue } from '@mintplayer/ui-core/toast';
import { BsToast, BsToastBody, BsToaster, BsToastHeader } from '@mintplayer/vue-bootstrap/toast';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const toasts = new ToastQueue<{ message: string }>();
onBeforeUnmount(() => toasts.destroy());

const text = ref('');
const add = () => {
  toasts.push({ message: text.value || 'Hello, world!' });
  text.value = '';
};
const messageOf = (data: unknown) => (data as { message: string }).message;

const SOURCE = `<script setup lang="ts">
const toasts = new ToastQueue<{ message: string }>();   // one per app: toast from anywhere
</` + `script>

<button type="button" class="btn btn-primary" @click="toasts.push({ message: 'Saved!' })">Show toast</button>

<BsToaster :queue="toasts">
  <template #toast="{ toast }">
    <BsToast :visible="toast.visible" @update:visible="toasts.close(toast.id)">
      <BsToastHeader><strong class="me-auto">Notification</strong></BsToastHeader>
      <BsToastBody>{{ toast.data.message }}</BsToastBody>
    </BsToast>
  </template>
</BsToaster>`;
</script>

<template>
  <div class="demo-page">
    <h1>Toast</h1>
    <p class="text-body-secondary">
      A <code>ToastQueue</code> holds the toasts: <code>push(data)</code> queues one and <code>close(id)</code>
      dismisses it. <code>BsToaster</code> renders the queue in a fixed corner, with its <code>toast</code> slot once
      per entry. A toast announces its text when it shows, and hides itself after five seconds unless the pointer or
      focus is on the toasts.
    </p>

    <section>
      <h2>Basic usage</h2>
      <form class="input-group" @submit.prevent="add">
        <input v-model="text" class="form-control" aria-label="Message" />
        <button type="submit" class="btn btn-primary">Add notification</button>
      </form>
      <BsToaster :queue="toasts">
        <template #toast="{ toast }">
          <BsToast :visible="toast.visible" @update:visible="toasts.close(toast.id)">
            <BsToastHeader>
              <strong class="me-auto">Bootstrap</strong>
              <small class="text-body-secondary">just now</small>
            </BsToastHeader>
            <BsToastBody>{{ messageOf(toast.data) }}</BsToastBody>
          </BsToast>
        </template>
      </BsToaster>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

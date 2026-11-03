<script setup lang="ts">
import { ref } from 'vue';
import { BsModal } from '@mintplayer/vue-bootstrap/modal';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const open = ref(false);
const scrollOpen = ref(false);
const paragraphs = Array.from({ length: 30 }, (_, i) => i + 1);

const SOURCE = `<button type="button" class="btn btn-primary" @click="open = true">Show modal</button>
<BsModal v-model:open="open">
  <template #header>Modal title</template>
  Place any content here — forms, lists, embedded components.
  <template #footer>
    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
  </template>
</BsModal>`;
</script>

<template>
  <div class="demo-page">
    <h1>Modal</h1>
    <p class="text-body-secondary">
      The dialog renders at the end of <code>&lt;body&gt;</code>, so no <code>overflow: hidden</code> ancestor clips
      it. It traps focus and returns it on close; Escape, the backdrop and the header's close button close it, and
      <code>v-model:open</code> follows. The <code>header</code> slot names the dialog; any element inside with
      <code>data-bs-dismiss="modal"</code> closes it.
    </p>

    <section>
      <h2>Basic usage</h2>
      <button type="button" class="btn btn-primary" @click="open = true">Show modal</button>
      <BsModal v-model:open="open">
        <template #header>Modal title</template>
        <label class="form-label" for="vue-modal-tags">Search for tags</label>
        <input id="vue-modal-tags" class="form-control" type="text" />
        <template #footer>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </template>
      </BsModal>
    </section>

    <section>
      <h2>Scrollable, centred</h2>
      <button type="button" class="btn btn-primary" @click="scrollOpen = true">Show long modal</button>
      <BsModal v-model:open="scrollOpen" scrollable centered>
        <template #header>Terms</template>
        <p v-for="i in paragraphs" :key="i">Paragraph {{ i }} of a long body that scrolls inside the dialog.</p>
      </BsModal>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

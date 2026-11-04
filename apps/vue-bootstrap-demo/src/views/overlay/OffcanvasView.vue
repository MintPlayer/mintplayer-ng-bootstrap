<script setup lang="ts">
import { ref } from 'vue';
import { BsOffcanvas, type OffcanvasPosition } from '@mintplayer/vue-bootstrap/offcanvas';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const POSITIONS: readonly OffcanvasPosition[] = ['start', 'end', 'top', 'bottom'];
const open = ref(false);
const position = ref<OffcanvasPosition>('start');
function show(next: OffcanvasPosition): void {
  position.value = next;
  open.value = true;
}

const SOURCE = `<button type="button" class="btn btn-primary" @click="open = true">Open</button>
<BsOffcanvas v-model:open="open" position="end">
  <template #header>Offcanvas title</template>
  Place any content here — forms, lists, navigation.
</BsOffcanvas>`;
</script>

<template>
  <div class="demo-page">
    <h1>Offcanvas</h1>
    <p class="text-body-secondary">
      A panel that slides in from a viewport edge (<code>position</code>), rendered at the end of
      <code>&lt;body&gt;</code>. With <code>backdrop</code> (the default) it is modal and traps focus. Escape, the
      backdrop and the header's close button close it; so does any element inside with
      <code>data-bs-dismiss="offcanvas"</code>.
    </p>

    <section>
      <h2>Basic usage</h2>
      <div class="btn-group" role="group" aria-label="Show offcanvas">
        <button v-for="p in POSITIONS" :key="p" type="button" class="btn btn-primary" @click="show(p)">{{ p }}</button>
      </div>
      <BsOffcanvas v-model:open="open" :position="position">
        <template #header>Offcanvas</template>
        <p>Some text as placeholder. In real life you can have the elements you have chosen.</p>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="offcanvas">Close</button>
      </BsOffcanvas>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

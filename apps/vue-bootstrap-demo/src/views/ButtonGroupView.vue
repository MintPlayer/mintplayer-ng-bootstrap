<script setup lang="ts">
import { ref } from 'vue';
import { BsButtonGroup } from '@mintplayer/vue-bootstrap/button-group';
import { BsToggleButton } from '@mintplayer/vue-bootstrap/checkbox';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const bold = ref(true);
const italic = ref(false);
const underline = ref(false);

const SOURCE = `<script setup lang="ts">
import { BsButtonGroup } from '@mintplayer/vue-bootstrap/button-group';
<\/script>

<template>
  <BsButtonGroup label="Text alignment">
    <button type="button" class="btn btn-outline-primary">Left</button>
    <button type="button" class="btn btn-outline-primary">Middle</button>
    <button type="button" class="btn btn-outline-primary">Right</button>
  </BsButtonGroup>
</template>`;
</script>

<template>
  <div class="demo-page">
    <h1>Button group</h1>
    <p class="text-body-secondary">
      Joins a row of buttons into one control, a <code>role="group"</code> named by
      <code>label</code>. Toggle buttons join too, although each renders its button inside its
      own host.
    </p>

    <section>
      <h2>Buttons</h2>
      <BsButtonGroup label="Text alignment">
        <button type="button" class="btn btn-outline-primary">Left</button>
        <button type="button" class="btn btn-outline-primary">Middle</button>
        <button type="button" class="btn btn-outline-primary">Right</button>
      </BsButtonGroup>
    </section>

    <section>
      <h2>Toggle buttons, small</h2>
      <BsButtonGroup label="Text style" size="sm">
        <BsToggleButton v-model:checked="bold" color="outline-secondary">Bold</BsToggleButton>
        <BsToggleButton v-model:checked="italic" color="outline-secondary">Italic</BsToggleButton>
        <BsToggleButton v-model:checked="underline" color="outline-secondary">Underline</BsToggleButton>
      </BsButtonGroup>
    </section>

    <section>
      <h2>Vertical</h2>
      <BsButtonGroup label="Order" vertical>
        <button type="button" class="btn btn-secondary">First</button>
        <button type="button" class="btn btn-secondary">Second</button>
        <button type="button" class="btn btn-secondary">Third</button>
      </BsButtonGroup>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

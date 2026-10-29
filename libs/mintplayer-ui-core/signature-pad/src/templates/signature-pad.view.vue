<script setup lang="ts">
// The signature pad's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectSignaturePad().
import type { SignaturePadView } from '@mintplayer/ui-core/signature-pad';

defineProps<{ view: SignaturePadView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <canvas v-bind="view.canvas"></canvas>
  <div v-bind="view.controls">
    <input v-if="view.typed" v-bind="view.typed" />
    <button v-bind="view.undo">{{ view.undoText }}</button>
    <button v-bind="view.clear">{{ view.clearText }}</button>
  </div>
  <div v-if="view.showFeedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  </div>
</template>

<script setup lang="ts">
// The one-time-code input's markup, compiled into the Angular, React, Vue and
// Lit fronts (PRD #437 D10). `view` comes from connectOtpInput().
import type { OtpInputView } from '@mintplayer/ui-core/otp-input';

defineProps<{ view: OtpInputView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <div v-bind="view.container">
    <input mp-attrs v-bind="view.input">
    <span v-for="box in view.boxes" :key="box.key" v-bind="box.bag"><span v-bind="view.spacer">{{ box.spacer }}</span><span v-bind="view.content">{{ box.content }}</span></span>
  </div>
  <div v-if="view.showFeedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  </div>
</template>

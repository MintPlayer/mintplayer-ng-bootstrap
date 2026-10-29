<script setup lang="ts">
// The time picker's markup, compiled into the Angular, React, Vue and Lit
// fronts (PRD #437 D10). `view` comes from connectTimepicker(). The list is
// time-list.view.vue repeated (a template cannot include another component).
import type { TimepickerView } from '@mintplayer/ui-core/timepicker';

defineProps<{ view: TimepickerView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <div v-bind="view.group">
    <input v-bind="view.input" />
    <input v-if="view.hidden" v-bind="view.hidden" />
    <button v-if="view.trigger" v-bind="view.trigger"></button>
  </div>
  <div v-if="view.showFeedback" v-bind="view.feedback.attrs">{{ view.feedback.text }}</div>
  <div v-bind="view.popup">
    <div v-bind="view.timeList.root">
      <ul v-bind="view.timeList.list">
        <li v-for="slot in view.timeList.slots" :key="slot.key" v-bind="slot.item"><button v-bind="slot.option">{{ slot.text }}</button></li>
      </ul>
    </div>
  </div>
  </div>
</template>

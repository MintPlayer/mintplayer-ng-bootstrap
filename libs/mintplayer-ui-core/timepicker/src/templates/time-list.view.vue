<script setup lang="ts">
// The time list's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectTimeList(). The time picker and the
// datetime picker repeat it; keep them in step.
import type { TimeListView } from '@mintplayer/ui-core/timepicker';

defineProps<{ view: TimeListView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
  <ul v-bind="view.list">
    <li v-for="slot in view.slots" :key="slot.key" v-bind="slot.item"><button v-bind="slot.option">{{ slot.text }}</button></li>
  </ul>
  </div>
</template>

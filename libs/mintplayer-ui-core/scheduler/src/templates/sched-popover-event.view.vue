<script setup lang="ts">
// One event row of the day popover: a partial of scheduler-popover.view.vue.
import type { SchedulerPopoverEvent } from '@mintplayer/ui-core/scheduler';

defineProps<{ event: SchedulerPopoverEvent }>();
</script>

<template>
  <li v-bind="event.row">
    <button v-bind="event.bag">
      <span v-bind="event.swatch" :style="event.swatchStyle"></span>
      <span v-bind="event.titleBag">{{ event.title }}</span>
    </button>
    <button v-if="event.remove" v-bind="event.remove"><span aria-hidden="true">×</span></button>
  </li>
</template>

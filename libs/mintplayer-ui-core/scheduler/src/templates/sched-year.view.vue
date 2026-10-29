<script setup lang="ts">
// The year view: a partial of scheduler.view.vue.
import type { SchedulerYear } from '@mintplayer/ui-core/scheduler';

defineProps<{ year: SchedulerYear }>();
</script>

<template>
  <div v-bind="year.grid">
    <div v-for="m in year.months" :key="m.key" v-bind="m.bag">
      <div v-bind="m.headerBag">{{ m.header }}</div>
      <div v-bind="m.mini">
        <div v-for="h in m.dayHeaders" :key="h.key" v-bind="h.bag">{{ h.text }}</div>
        <div v-for="d in m.days" :key="d.key" v-bind="d.bag">{{ d.text }}</div>
      </div>
    </div>
  </div>
</template>

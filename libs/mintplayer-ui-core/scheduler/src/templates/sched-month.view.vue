<script setup lang="ts">
// The month view: a partial of scheduler.view.vue.
import type { SchedulerMonth } from '@mintplayer/ui-core/scheduler';

defineProps<{ month: SchedulerMonth }>();
</script>

<template>
  <div v-bind="month.headerRow">
    <div v-for="h in month.headers" :key="h.key" v-bind="h.bag">{{ h.text }}</div>
  </div>
  <div v-bind="month.grid">
    <div v-for="w in month.weeks" :key="w.key" v-bind="w.bag">
      <div v-for="d in w.days" :key="d.key" v-bind="d.bag">
        <div v-bind="d.numberBag">{{ d.number }}</div>
        <div v-bind="d.events">
          <div v-for="e in d.items" :key="e.key" v-bind="e.bag" :style="e.style">{{ e.title }}</div>
          <div v-if="d.more" v-bind="d.more.bag">{{ d.more.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

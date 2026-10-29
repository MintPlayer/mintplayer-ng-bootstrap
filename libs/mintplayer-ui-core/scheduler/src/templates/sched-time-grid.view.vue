<script setup lang="ts">
// The week and day views: a partial of scheduler.view.vue.
import type { SchedulerTimeGrid } from '@mintplayer/ui-core/scheduler';

defineProps<{ grid: SchedulerTimeGrid }>();
</script>

<template>
  <div v-bind="grid.headerRow">
    <div v-bind="grid.gutterSpace"></div>
    <div v-for="h in grid.headers" :key="h.key" v-bind="h.bag">
      <div v-bind="h.nameBag">{{ h.name }}</div>
      <div v-bind="h.numberBag">{{ h.number }}</div>
      <div v-if="h.monthYearBag" v-bind="h.monthYearBag">{{ h.monthYear }}</div>
    </div>
  </div>
  <div v-bind="grid.grid">
    <div v-bind="grid.gutter">
      <div v-for="l in grid.labels" :key="l.key" v-bind="l.bag">{{ l.text }}</div>
    </div>
    <div v-bind="grid.days">
      <div v-for="c in grid.columns" :key="c.key" v-bind="c.bag">
        <div v-for="slot in c.slots" :key="slot.key" v-bind="slot.bag"></div>
        <div v-bind="c.events">
          <div v-for="b in c.boxes" :key="b.key" v-bind="b.bag" :style="b.style">
            <div v-bind="b.content">
              <div v-bind="b.titleBag">{{ b.title }}</div>
              <div v-if="b.timeBag" v-bind="b.timeBag">{{ b.time }}</div>
            </div>
            <div v-for="h in b.handles" :key="h.key" v-bind="h.bag">
              <span v-bind="h.glyph"></span>
            </div>
          </div>
          <div v-for="p in c.previews" :key="p.key" v-bind="p.bag" :style="p.style"></div>
        </div>
        <div v-if="c.now" v-bind="c.now.bag" :style="c.now.style"></div>
      </div>
    </div>
  </div>
</template>

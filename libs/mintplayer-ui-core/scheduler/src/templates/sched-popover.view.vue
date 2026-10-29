<script setup lang="ts">
// The day (or month) popover: a partial of scheduler.view.vue, a native
// `popover="auto"` the core opens next to the cell it belongs to.
import type { SchedulerDayPopover } from '@mintplayer/ui-core/scheduler';
import SchedPopoverEvent from './sched-popover-event.view.vue';

defineProps<{ popover: SchedulerDayPopover }>();
</script>

<template>
  <div v-bind="popover.bag">
    <div v-bind="popover.head">
      <div>
        <div v-bind="popover.dateBag">{{ popover.date }}</div>
        <div v-bind="popover.countBag">{{ popover.count }}</div>
      </div>
      <button v-bind="popover.close"><span aria-hidden="true">×</span></button>
    </div>
    <p v-if="popover.empty" v-bind="popover.empty.bag">{{ popover.empty.text }}</p>
    <ul v-if="popover.list" v-bind="popover.list">
      <SchedPopoverEvent v-for="e in popover.events" :key="e.key" :event="e" />
    </ul>
    <div v-for="g in popover.groups" :key="g.key" v-bind="g.bag">
      <div v-bind="g.headingBag">{{ g.heading }}</div>
      <ul v-bind="g.list">
        <SchedPopoverEvent v-for="e in g.events" :key="e.key" :event="e" />
      </ul>
    </div>
    <label v-if="popover.resource" v-bind="popover.resource.bag">
      <span v-bind="popover.resource.labelBag">{{ popover.resource.label }}</span>
      <select v-bind="popover.resource.select">
        <option v-for="o in popover.resource.options" :key="o.key" :value="o.value">{{ o.text }}</option>
      </select>
    </label>
    <div v-bind="popover.actions">
      <button v-if="popover.create" v-bind="popover.create.bag">{{ popover.create.text }}</button>
      <button v-bind="popover.drill.bag">{{ popover.drill.text }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// The scheduler's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectScheduler(): every view is a static
// grid positioned by custom properties, so the server renders what the client
// does. The three panels are native popovers the core opens and places.
import type { SchedulerView } from '@mintplayer/ui-core/scheduler';
import SchedTimeGrid from './sched-time-grid.view.vue';
import SchedMonth from './sched-month.view.vue';
import SchedYear from './sched-year.view.vue';
import SchedTimeline from './sched-timeline.view.vue';
import SchedPopover from './sched-popover.view.vue';
import SchedRowPanel from './sched-row-panel.view.vue';
import SchedEditor from './sched-editor.view.vue';

defineProps<{ view: SchedulerView }>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.container">
      <div v-bind="view.header">
        <nav v-bind="view.nav">
          <button v-bind="view.prev">‹</button>
          <button v-bind="view.next">›</button>
          <button v-bind="view.today">{{ view.todayText }}</button>
        </nav>
        <div v-bind="view.title">{{ view.titleText }}</div>
        <div v-bind="view.switcher">
          <button v-for="v in view.views" :key="v.key" v-bind="v.bag">{{ v.text }}</button>
        </div>
      </div>
      <div v-bind="view.content" :style="view.contentStyle">
        <SchedTimeGrid v-if="view.timeGrid" :grid="view.timeGrid" />
        <SchedMonth v-if="view.month" :month="view.month" />
        <SchedYear v-if="view.year" :year="view.year" />
        <SchedTimeline v-if="view.timeline" :timeline="view.timeline" />
      </div>
    </div>
    <div v-bind="view.kbdGrid">{{ view.kbdGridText }}</div>
    <div v-bind="view.kbdEvent">{{ view.kbdEventText }}</div>
    <SchedPopover v-if="view.popover" :popover="view.popover" />
    <SchedRowPanel v-if="view.rowPanel" :panel="view.rowPanel" />
    <SchedEditor v-if="view.editor" :editor="view.editor" />
    <div v-bind="view.live">{{ view.announcement }}</div>
  </div>
</template>

<script setup lang="ts">
// The timeline view: a partial of scheduler.view.vue. One row per visible
// resource or group (plus the unassigned row), under a day row and a time row.
import type { SchedulerTimeline } from '@mintplayer/ui-core/scheduler';

defineProps<{ timeline: SchedulerTimeline }>();
</script>

<template>
  <div v-bind="timeline.timeline">
    <div v-bind="timeline.head">
      <div v-bind="timeline.dayRow">
        <div v-bind="timeline.resourceHeader">
          {{ timeline.resourceHeaderText }}
          <div v-bind="timeline.resizer"></div>
        </div>
        <div v-bind="timeline.dayHeaders">
          <div v-for="d in timeline.days" :key="d.key" v-bind="d.bag" :style="d.style">
            <span v-bind="d.labelBag">{{ d.label }}</span>
          </div>
        </div>
      </div>
      <div v-bind="timeline.timeRow">
        <div v-bind="timeline.emptyHeader"></div>
        <div v-bind="timeline.timeHeaders">
          <div v-for="t in timeline.times" :key="t.key" v-bind="t.bag">{{ t.text }}</div>
        </div>
      </div>
    </div>
    <div v-bind="timeline.body">
      <div v-for="r in timeline.rows" :key="r.key" v-bind="r.bag" :style="r.style">
        <div v-bind="r.cell" :style="r.cellStyle">
          <button v-if="r.menu" v-bind="r.menu.bag" :style="r.menu.style">
            <span v-bind="r.menu.glyph">⋯</span>
          </button>
          <button v-if="r.toggle" v-bind="r.toggle.bag">{{ r.toggle.text }}</button>
          <input v-if="r.rename" v-bind="r.rename.bag" :value.prop="r.rename.value" />
          <span v-else v-bind="r.titleBag">{{ r.title }}</span>
        </div>
        <div v-bind="r.slots">
          <div v-for="c in r.cells" :key="c.key" v-bind="c.bag"></div>
          <div v-if="r.events" v-bind="r.events">
            <div v-for="b in r.boxes" :key="b.key" v-bind="b.bag" :style="b.style">
              <div v-bind="b.content">
                <div v-bind="b.titleBag">{{ b.title }}</div>
                <div v-if="b.timeBag" v-bind="b.timeBag">{{ b.time }}</div>
              </div>
              <div v-for="h in b.handles" :key="h.key" v-bind="h.bag">
                <span v-bind="h.glyph"></span>
              </div>
            </div>
            <div v-for="p in r.previews" :key="p.key" v-bind="p.bag" :style="p.style"></div>
          </div>
        </div>
      </div>
      <div v-if="timeline.empty" v-bind="timeline.empty.bag">{{ timeline.empty.text }}</div>
    </div>
  </div>
</template>

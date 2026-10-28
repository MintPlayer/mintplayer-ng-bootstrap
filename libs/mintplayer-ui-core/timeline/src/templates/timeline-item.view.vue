<script setup lang="ts">
// One declarative timeline item (PRD #437 D10). `view` comes from
// connectTimelineItem(); the regions match a data row of timeline.view.vue.
import type { TimelineItemView } from '@mintplayer/ui-core/timeline';

defineProps<{ view: TimelineItemView }>();
defineSlots<{
  /** The marker; the default is a dot with the icon. */
  marker?: () => unknown;
  /** The heading; the default is the title. */
  heading?: () => unknown;
  /** The opposite region; the default is the time. */
  opposite?: () => unknown;
  /** Decoration inside the trailing segment. */
  connector?: () => unknown;
  /** The body; the default is the description. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <div v-bind="view.opposite"><slot name="opposite">{{ view.time }}</slot></div>
    <div v-bind="view.line" :style="view.lineStyle">
      <span v-bind="view.marker">
        <slot name="marker">
          <span v-bind="view.dot"><i v-if="view.icon" v-bind="view.icon"></i></span>
        </slot>
      </span>
      <span v-bind="view.connector"><slot name="connector"></slot></span>
    </div>
    <div v-bind="view.content">
      <div v-bind="view.heading"><slot name="heading">{{ view.title }}</slot></div>
      <div v-bind="view.body"><slot>{{ view.description }}</slot></div>
    </div>
  </div>
</template>

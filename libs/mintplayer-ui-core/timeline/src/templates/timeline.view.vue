<script setup lang="ts">
// The timeline's markup, compiled into the Angular, React, Vue and Lit fronts
// (PRD #437 D10). `view` comes from connectTimeline(). The data row repeats
// timeline-item.view.vue's regions: the compiler has no template includes.
import type { TimelineConnectorContext, TimelineItem, TimelineItemContext, TimelineView } from '@mintplayer/ui-core/timeline';

defineProps<{ view: TimelineView }>();
defineSlots<{
  /** A data row's marker; the default is a dot with the item's icon. */
  marker?: (args: { item: TimelineItem; ctx: TimelineItemContext }) => unknown;
  /** A data row's heading; the default is the item's title. */
  heading?: (args: { item: TimelineItem; ctx: TimelineItemContext }) => unknown;
  /** A data row's time, in the opposite region. */
  timestamp?: (args: { item: TimelineItem; ctx: TimelineItemContext }) => unknown;
  /** A data row's whole opposite region; wins over timestamp. */
  opposite?: (args: { item: TimelineItem; ctx: TimelineItemContext }) => unknown;
  /** A data row's body; the default is the item's description. */
  content?: (args: { item: TimelineItem; ctx: TimelineItemContext }) => unknown;
  /** Decoration inside the segment trailing a data row. */
  connector?: (args: { item: TimelineItem; ctx: TimelineConnectorContext }) => unknown;
  /** Declarative timeline items, used when there are no data rows. */
  default?: () => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <template v-if="view.rows">
      <div v-for="row in view.rows" :key="row.key" v-bind="row.bag">
        <div v-bind="view.parts.opposite">
          <slot v-if="$slots.opposite" name="opposite" :item="row.item" :ctx="row.ctx"></slot>
          <slot v-else name="timestamp" :item="row.item" :ctx="row.ctx">{{ row.time }}</slot>
        </div>
        <div v-bind="view.parts.line" :style="row.style">
          <span v-bind="view.parts.marker">
            <slot name="marker" :item="row.item" :ctx="row.ctx">
              <span v-bind="view.parts.dot"><i v-if="row.icon" v-bind="row.icon"></i></span>
            </slot>
          </span>
          <span v-bind="view.parts.connector"><slot name="connector" :item="row.item" :ctx="row.connector"></slot></span>
        </div>
        <div v-bind="view.parts.content">
          <div v-bind="view.parts.heading"><slot name="heading" :item="row.item" :ctx="row.ctx">{{ row.item.title }}</slot></div>
          <div v-bind="view.parts.body"><slot name="content" :item="row.item" :ctx="row.ctx">{{ row.item.description }}</slot></div>
        </div>
      </div>
    </template>
    <slot v-else></slot>
  </div>
</template>

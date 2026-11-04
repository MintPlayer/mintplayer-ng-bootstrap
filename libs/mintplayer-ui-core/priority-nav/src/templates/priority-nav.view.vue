<script setup lang="ts">
// The priority nav: every item renders in three places (the measure strip once hydrated, the
// strip, the overflow), each through the itemTemplate slot or the default link.
import type { PriorityNavItem, PriorityNavView } from '@mintplayer/ui-core/priority-nav';

defineProps<{ view: PriorityNavView }>();
defineSlots<{
  itemTemplate?: (props: { item: PriorityNavItem }) => unknown;
  moreTemplate?: (props: { open: boolean }) => unknown;
}>();
</script>

<template>
  <nav mp-host ref="root" v-bind="view.root">
    <instance-style :name="view.cssName" :css="view.css" />
    <input v-if="view.checkbox" v-bind="view.checkbox" />
    <div v-if="view.measure" v-bind="view.measure">
      <div class="priority-nav-measure">
        <span v-for="row in view.rows" :key="row.key" v-bind="row.measure"><slot name="itemTemplate" :item="row.item"><a v-bind="row.link" :href="row.href">{{ row.item.label }}</a></slot></span>
      </div>
    </div>
    <div v-bind="view.strip">
      <span v-for="row in view.rows" :key="row.key" v-bind="row.inline"><slot name="itemTemplate" :item="row.item"><a v-bind="row.link" :href="row.href">{{ row.item.label }}</a></slot></span>
      <label v-if="view.noscriptToggle" v-bind="view.noscriptToggle"><slot name="moreTemplate" :open="false"><span class="priority-nav-more-label">{{ view.moreLabel }}</span><span class="priority-nav-caret" aria-hidden="true">▾</span></slot></label>
      <span v-if="view.moreSlot" v-bind="view.moreSlot"><button v-if="view.more" v-bind="view.more"><slot name="moreTemplate" :open="view.open"><span class="priority-nav-more-label">{{ view.moreLabel }}</span><span class="priority-nav-caret" aria-hidden="true">▾</span></slot></button></span>
    </div>
    <div v-bind="view.overflow">
      <span v-for="row in view.rows" :key="row.key" v-bind="row.overflow"><slot name="itemTemplate" :item="row.item"><a v-bind="row.link" :href="row.href">{{ row.item.label }}</a></slot></span>
    </div>
  </nav>
</template>

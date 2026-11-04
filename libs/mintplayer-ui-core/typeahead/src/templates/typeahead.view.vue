<script setup lang="ts">
// The typeahead's markup, compiled into the Angular, React, Vue and Lit fronts
// (#458 M3). `view` comes from typeaheadCore; every ARIA attribute is in its bags.
import type { TypeaheadItem, TypeaheadView } from '@mintplayer/ui-core/typeahead';

defineProps<{ view: TypeaheadView }>();
defineSlots<{
  item?: (props: { item: TypeaheadItem; term: string }) => unknown;
}>();
</script>

<template>
  <div mp-host ref="root" v-bind="view.root">
    <input mp-attrs v-bind="view.input" :value.prop="view.term" />
    <ul v-bind="view.listbox">
      <li v-if="view.status" v-bind="view.status.attrs">{{ view.status.text }}</li>
      <li v-for="option in view.options" :key="option.key" v-bind="option.bag">
        <slot name="item" :item="option.item" :term="view.term">{{ option.text }}</slot>
      </li>
    </ul>
    <span v-bind="view.live.attrs">{{ view.live.text }}</span>
    <div v-if="view.error" v-bind="view.error.attrs">{{ view.error.text }}</div>
  </div>
</template>

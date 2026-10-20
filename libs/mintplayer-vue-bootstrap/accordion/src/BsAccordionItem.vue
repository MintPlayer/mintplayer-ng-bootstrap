<script setup lang="ts">
import { accordionKeydown, accordionSummaryClick, connectAccordionTab } from '@mintplayer/ui-core/accordion';
import { computed, inject } from 'vue';
import { ACCORDION_CONTEXT } from './accordion-context';

/**
 * One tab: a native `<details>` row of the parent `BsAccordion`.
 *
 * `index` is injected by the parent; pass it explicitly only when items are
 * not direct children of the accordion. `isActive` is written to the row only
 * when it changes, so a user toggle stands — follow it with `@tab-toggle`.
 */
const props = defineProps<{
  index?: number;
  isActive?: boolean;
  disabled?: boolean;
}>();

const context = inject(ACCORDION_CONTEXT, null);
const position = computed(() => props.index ?? 0);
const view = computed(() =>
  connectAccordionTab(context?.options.value ?? { id: 'bs-accordion' }, position.value, { disabled: props.disabled }));

function onClick(event: MouseEvent) {
  accordionSummaryClick(event, !!props.disabled);
}

function onKeydown(event: KeyboardEvent) {
  const root = context?.root.value;
  if (root) accordionKeydown(root, event, position.value, !!props.disabled);
}
</script>

<template>
  <details v-bind="view.item" :open="isActive">
    <summary v-bind="view.summary" @click="onClick" @keydown="onKeydown">
      <slot name="header" />
    </summary>
    <div v-bind="view.content"><slot /></div>
  </details>
</template>

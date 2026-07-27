<script setup lang="ts">
import '@mintplayer/web-components/accordion';
import type { AccordionTabToggleDetail } from '@mintplayer/web-components/accordion';
import { cloneVNode, computed, Fragment, useSlots, type VNode } from 'vue';
import BsAccordionItem from './BsAccordionItem.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /** Allow several tabs to stay open at once (checkbox machine with JS off). */
  multi?: boolean;
  /** Paint the open header with the Bootstrap active background. */
  highlightActiveTab?: boolean;
}>();

const emit = defineEmits<{ tabToggle: [detail: AccordionTabToggleDetail] }>();

const slots = useSlots();

/**
 * `v-for` content arrives as a single Fragment vnode rather than a flat list,
 * so slot children are flattened before numbering — otherwise a whole loop
 * would count as one tab.
 */
function flatten(nodes: VNode[]): VNode[] {
  return nodes.flatMap((node) =>
    node.type === Fragment && Array.isArray(node.children)
      ? flatten(node.children as VNode[])
      : [node],
  );
}

/**
 * Items are numbered here rather than by themselves: the index is a tab's
 * identity for slots and toggle events, and only the parent knows the order.
 */
const items = computed<VNode[]>(() => {
  let index = 0;
  return flatten(slots.default?.() ?? []).map((node) =>
    node.type === BsAccordionItem ? cloneVNode(node, { index: index++ }) : node,
  );
});

const Items = () => items.value;

const multiAttr = computed(() => (props.multi ? '' : undefined));
const highlightAttr = computed(() => (props.highlightActiveTab ? '' : undefined));

function onTabToggle(event: Event) {
  // Nesting is the normal case and the event is composed, so a descendant
  // accordion's toggles pass straight through this host. Claim only our own.
  if (event.target !== event.currentTarget) return;
  event.stopPropagation();
  emit('tabToggle', (event as CustomEvent<AccordionTabToggleDetail>).detail);
}
</script>

<template>
  <mp-accordion
    v-bind="$attrs"
    :multi="multiAttr"
    :highlight-active-tab="highlightAttr"
    @mp-accordion-tab-toggle="onTabToggle">
    <Items />
  </mp-accordion>
</template>

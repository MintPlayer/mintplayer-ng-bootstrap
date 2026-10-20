<script setup lang="ts">
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  ACCORDION_SCOPE,
  accordionScopedStyles,
  accordionToggled,
  connectAccordion,
  type AccordionTabToggle,
} from '@mintplayer/ui-core/accordion';
import { cloneVNode, computed, Fragment, getCurrentInstance, provide, useSlots, useTemplateRef, type VNode } from 'vue';
import BsAccordionItem from './BsAccordionItem.vue';
import { ACCORDION_CONTEXT } from './accordion-context';

/**
 * `BsAccordion` — Bootstrap accordion on native `<details name>` (#437).
 * Renders the markup of `@mintplayer/ui-core/accordion`, so the server HTML is
 * the working accordion with JavaScript off.
 */
const props = defineProps<{
  /** Allow several tabs to stay open at once. */
  multi?: boolean;
  /** Paint the open header with the Bootstrap active background. */
  highlightActiveTab?: boolean;
}>();

const emit = defineEmits<{ tabToggle: [change: AccordionTabToggle] }>();

installLightStyles(ACCORDION_SCOPE, accordionScopedStyles);

const id = `bs-accordion-${getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)}`;
const options = computed(() => ({ id, multi: props.multi, highlightActiveTab: props.highlightActiveTab }));
const root = useTemplateRef<HTMLDivElement>('root');
provide(ACCORDION_CONTEXT, { options, root });

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
 * identity for ids and toggles, and only the parent knows the order.
 */
const items = computed<VNode[]>(() => {
  let index = 0;
  return flatten(slots.default?.() ?? []).map((node) =>
    node.type === BsAccordionItem ? cloneVNode(node, { index: index++ }) : node,
  );
});

const Items = () => items.value;

// `toggle` does not bubble: one capture-phase listener hears every row.
function onToggle(event: Event) {
  if (!root.value) return;
  const change = accordionToggled(root.value, event, !!props.multi);
  if (change) emit('tabToggle', change);
}
</script>

<template>
  <div ref="root" v-bind="connectAccordion(options)" @toggle.capture="onToggle">
    <Items />
  </div>
</template>

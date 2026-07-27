<script setup lang="ts">
import { computed } from 'vue';

/**
 * One tab: a header and a body rendered as SIBLINGS, not as a wrapper around
 * them. Named slots only accept direct children of `<mp-accordion>`, so the
 * header cannot live inside the tab element — a multi-root SFC lets one
 * component contribute both.
 *
 * `index` is injected by the parent `BsAccordion`; pass it explicitly only
 * when items are not direct children of the accordion.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  index?: number;
  isActive?: boolean;
  disabled?: boolean;
}>();

const position = computed(() => props.index ?? 0);
const activeAttr = computed(() => (props.isActive ? '' : undefined));
const disabledAttr = computed(() => (props.disabled ? '' : undefined));
</script>

<template>
  <span accordion-header :slot="`h${position}`">
    <slot name="header" />
  </span>
  <mp-accordion-tab
    accordion-tab
    :slot="`c${position}`"
    :is-active="activeAttr"
    :disabled="disabledAttr"
    v-bind="$attrs">
    <slot />
  </mp-accordion-tab>
</template>

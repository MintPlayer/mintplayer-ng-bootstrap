<script setup lang="ts">
import '@mintplayer/web-components/dropdown-menu';
import type { MpDropdownItem } from '@mintplayer/web-components/dropdown-menu';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** Marks the item as the current selection (boolean attribute). */
    selected?: boolean;
    /** Disables activation (boolean attribute). */
    disabled?: boolean;
    /** Opaque value surfaced in the menu's `select` event — assigned as a JS property. */
    value?: unknown;
  }>(),
  {
    selected: false,
    disabled: false,
  },
);

const el = ref<MpDropdownItem | null>(null);

// `value` is opaque (any JS value), so it can't ride a DOM attribute — push it
// to the element via its property setter, mirroring how object props are
// assigned in the other wrappers.
const syncValue = () => {
  if (el.value) el.value.value = props.value;
};

onMounted(syncValue);
watch(() => props.value, syncValue);
</script>

<template>
  <mp-dropdown-item
    ref="el"
    v-bind="$attrs"
    :selected="selected ? '' : undefined"
    :disabled="disabled ? '' : undefined"
  >
    <slot />
  </mp-dropdown-item>
</template>

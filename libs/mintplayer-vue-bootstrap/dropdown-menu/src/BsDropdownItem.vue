<script setup lang="ts">
// No per-item web component: renders a plain <li class="dropdown-item"> that the
// menu WC styles via its shadow `::slotted(.dropdown-item)` rule. Put navigable
// content inside, e.g. <BsDropdownItem><a href="/x">Action</a></BsDropdownItem>.
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** Bootstrap `.active` appearance (also drives `aria-selected` in a listbox). */
    active?: boolean;
    /** Non-interactive; removed from the menu's roving order. */
    disabled?: boolean;
    /** Opaque value surfaced in the menu's `select` event — assigned as a JS property. */
    value?: unknown;
  }>(),
  { active: false, disabled: false },
);

const el = ref<HTMLLIElement | null>(null);

// `value` is opaque, so push it to the <li> as a property (the menu reads it).
const syncValue = () => {
  if (el.value) (el.value as unknown as { value?: unknown }).value = props.value;
};
onMounted(syncValue);
watch(() => props.value, syncValue);
</script>

<template>
  <li
    ref="el"
    v-bind="$attrs"
    class="dropdown-item"
    :class="{ active, disabled }"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <slot />
  </li>
</template>

<script setup lang="ts">
// Registers <mp-dropdown-menu> (and its sibling elements) on the client. On the
// SSR server this import runs after the lit-ssr DOM shim is installed (see the
// demo's entry-server.ts), so `customElements.define` doesn't throw in Node —
// same pattern as every other @mintplayer/vue-bootstrap wrapper.
import '@mintplayer/web-components/dropdown-menu';
import type {
  MpDropdownMenu,
  DropdownMode,
  DropdownSelectEventDetail,
} from '@mintplayer/web-components/dropdown-menu';
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    /** `menu` (default) exposes roving-tabindex menu semantics | `listbox`. */
    mode?: DropdownMode;
    /** Max panel height in px before the item list scrolls. */
    maxHeight?: number;
    /** `id` of an external element that labels the menu (aria-labelledby). */
    labelId?: string;
  }>(),
  {
    mode: 'menu',
  },
);

const emit = defineEmits<{ select: [detail: DropdownSelectEventDetail] }>();

const el = ref<MpDropdownMenu | null>(null);

function onSelect(event: Event) {
  emit('select', (event as CustomEvent<DropdownSelectEventDetail>).detail);
}

// `select` is a CustomEvent the WC dispatches; wire it up client-side only.
onMounted(() => el.value?.addEventListener('select', onSelect));
onBeforeUnmount(() => el.value?.removeEventListener('select', onSelect));
</script>

<template>
  <mp-dropdown-menu
    ref="el"
    v-bind="$attrs"
    :mode="mode"
    :max-height="maxHeight"
    :label-id="labelId"
  >
    <slot />
  </mp-dropdown-menu>
</template>

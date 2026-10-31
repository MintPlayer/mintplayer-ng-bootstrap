<script setup lang="ts">
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  DROPDOWN_MENU_SCOPE,
  attachDropdownMenu,
  connectDropdownMenu,
  dropdownMenuScopedStyles,
  type DropdownSelectEventDetail,
} from '@mintplayer/ui-core/dropdown-menu';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { bootstrapDropdown, installBootstrap } from '@mintplayer/ui-core/bootstrap';

/**
 * `BsDropdownMenu` — a Bootstrap `.dropdown-menu` list rendered from the
 * headless `@mintplayer/ui-core/dropdown-menu` core (#437). Put
 * `BsDropdownItem` / `BsDropdownDivider` / `BsDropdownHeader` children inside.
 * Once mounted it adds roving-tabindex keyboard navigation, and activating an
 * enabled item emits `select` with that item's `value`.
 */
const props = defineProps<{
  /** Max panel height in px before the item list scrolls. */
  maxHeight?: number;
}>();

const emit = defineEmits<{ select: [detail: DropdownSelectEventDetail] }>();

installBootstrap(bootstrapDropdown);
installLightStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);

const menu = useTemplateRef<HTMLUListElement>('menu');
const hydrated = ref(false);
const bag = computed(() => connectDropdownMenu({ hydrated: hydrated.value }));
// Zero is a legitimate cap, so only an unset value is dropped.
const style = computed(() =>
  props.maxHeight === undefined ? undefined : { '--mp-dropdown-max-height': `${props.maxHeight}px` },
);

let detach: (() => void) | undefined;
onMounted(() => {
  hydrated.value = true;
  if (menu.value) detach = attachDropdownMenu(menu.value, { onSelect: (detail) => emit('select', detail) });
});
onBeforeUnmount(() => detach?.());
</script>

<template>
  <ul ref="menu" :data-mps="DROPDOWN_MENU_SCOPE" v-bind="bag" :style="style">
    <slot />
  </ul>
</template>

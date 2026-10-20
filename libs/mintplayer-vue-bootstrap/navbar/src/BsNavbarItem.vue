<script setup lang="ts">
import { connectNavbarItem } from '@mintplayer/ui-core/navbar';
import { computed, inject } from 'vue';
import { NAVBAR_DEPTH } from './navbar-context';

/**
 * `BsNavbarItem` — the wrapper around one consumer link or button. A
 * `.nav-item` in a `BsNavbarNav`, a `.dropdown-item` inside a
 * `BsNavbarDropdown`:
 *
 *     <BsNavbarItem active><a href="/">Home</a></BsNavbarItem>
 */
const props = defineProps<{
  /** Marks the link as the current page. */
  active?: boolean;
  /** Disables the entry. */
  disabled?: boolean;
}>();

const depth = inject(NAVBAR_DEPTH, -1);
const bag = computed(() =>
  connectNavbarItem({ inMenu: depth >= 0, active: props.active, disabled: props.disabled }),
);
</script>

<template>
  <div v-bind="bag"><slot /></div>
</template>

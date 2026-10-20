<script setup lang="ts">
import { connectNavbarNav } from '@mintplayer/ui-core/navbar';
import { computed } from 'vue';

/**
 * `BsNavbarNav` — one group of navbar entries (`.navbar-nav`). Holds
 * `BsNavbarItem`s and `BsNavbarDropdown`s; `align="end"` pushes the group to
 * the far edge of the bar.
 */
const props = defineProps<{
  align?: 'start' | 'end';
}>();

const bag = computed(() => connectNavbarNav(props.align ?? 'start'));
</script>

<template>
  <div v-bind="bag"><slot /></div>
</template>

<script setup lang="ts">
// A navbar dropdown, or a submenu when nested: a native <details>, so it opens
// with JavaScript off. Compiled into the four fronts (PRD #437 S13); the glue
// supplies `view` from connectNavbarDropdown().
import type { NavbarDropdownView } from '@mintplayer/ui-core/navbar';

defineProps<{ view: NavbarDropdownView; label?: string }>();
defineSlots<{
  /** Rich trigger content; falls back to the `label` text. */
  label?: () => unknown;
  /** The items and nested dropdowns. */
  default?: () => unknown;
}>();
</script>

<template>
  <details ref="root" v-bind="view.details">
    <summary v-bind="view.summary"><slot name="label">{{ label }}</slot></summary>
    <!-- A div, not a ul: the items are item wrappers, which a role-less list may not contain. -->
    <div v-bind="view.panel"><slot /></div>
  </details>
</template>

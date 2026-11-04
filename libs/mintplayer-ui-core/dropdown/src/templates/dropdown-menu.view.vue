<script setup lang="ts">
// A menu (standalone, in a [bsDropdown] panel), or inside a navbar nav group a
// native <details> disclosure whose panel holds the items (PRD #458 §4.5): the
// core reads which from the dropdown nesting context.
import type { CoreBag } from '@mintplayer/ui-core/component';
import type { DropdownDisclosureView } from '@mintplayer/ui-core/dropdown';

defineProps<{ root: CoreBag; nav: DropdownDisclosureView | null; label?: string }>();
defineSlots<{
  /** Rich trigger content in a navbar; falls back to the `label` text. */
  labelTemplate?: () => unknown;
  /** The items, headers, dividers and (in a navbar) nested menus. */
  default?: () => unknown;
}>();
</script>

<template>
  <details v-if="nav" ref="root" v-bind="nav.details">
    <summary v-bind="nav.summary"><slot name="labelTemplate">{{ label }}</slot></summary>
    <!-- A div, not a ul: the items are item wrappers, which a role-less list may not contain. -->
    <div v-bind="nav.panel"><slot /></div>
  </details>
  <div v-else ref="root" v-bind="root"><slot /></div>
</template>

<script setup lang="ts">
import { connectNavbarDropdown } from '@mintplayer/ui-core/navbar';
import { computed, inject, provide } from 'vue';
import { NAVBAR_DEPTH } from './navbar-context';
import NavbarDropdownTemplate from './generated/navbar-dropdown.view.generated.vue';

/**
 * `BsNavbarDropdown` — a navbar dropdown, or a submenu when nested.
 *
 *     <BsNavbarDropdown label="Products">
 *       <BsNavbarItem><a href="/widgets">Widgets</a></BsNavbarItem>
 *       <BsNavbarDropdown label="More">…</BsNavbarDropdown>
 *     </BsNavbarDropdown>
 *
 * A native `<details>`: the label (the `label` prop, or a `#label` slot for
 * richer content) is the `<summary>`, the items its `.dropdown-menu` panel, so
 * it opens with JavaScript off. Dropdowns at one depth share a `name`, so
 * opening one closes its siblings. Disclosure navigation, not an ARIA menu:
 * every link stays a link in the tab order.
 */
const props = defineProps<{
  /** The trigger text; use the `label` slot for an icon or markup. */
  label?: string;
  /** Highlights the trigger, e.g. while a descendant link's route is active. */
  active?: boolean;
}>();

const depth = inject(NAVBAR_DEPTH, -1) + 1;
provide(NAVBAR_DEPTH, depth);
const view = computed(() => connectNavbarDropdown({ depth, active: props.active }));
</script>

<template>
  <NavbarDropdownTemplate :view="view" :label="label">
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <slot />
  </NavbarDropdownTemplate>
</template>

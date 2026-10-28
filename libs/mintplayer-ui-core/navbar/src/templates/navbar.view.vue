<script setup lang="ts">
// The navbar's markup, written once and compiled into the Angular, React, Vue
// and Lit fronts (tools/front-templates, PRD #437 S13). Each front's
// glue supplies `view` from connectNavbar() and `brand` from connectNavbarBrand().
import type { NavbarBag, NavbarView } from '@mintplayer/ui-core/navbar';

defineProps<{ view: NavbarView; brand: NavbarBag }>();
defineSlots<{
  /** The brand, e.g. a home link. */
  brand?: () => unknown;
  /** A custom hamburger glyph; it must not be interactive, and reads `--mp-navbar-expanded: 0|1`. */
  toggler?: () => unknown;
  /** The nav groups. */
  default?: () => unknown;
}>();
</script>

<template>
  <nav mp-host ref="root" v-bind="view.root">
    <div v-if="$slots.brand" v-bind="brand"><slot name="brand" /></div>
    <input v-bind="view.toggle" />
    <label v-bind="view.toggler">
      <slot name="toggler">
        <span v-bind="view.bar" />
        <span v-bind="view.bar" />
        <span v-bind="view.bar" />
      </slot>
    </label>
    <div v-bind="view.collapse">
      <div v-bind="view.inner"><slot /></div>
    </div>
  </nav>
</template>

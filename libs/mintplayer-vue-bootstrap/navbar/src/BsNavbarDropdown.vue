<script setup lang="ts">
import '@mintplayer/web-components/navbar';
import type { MpNavbarDropdown } from '@mintplayer/web-components/navbar';
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

const el = ref<MpNavbarDropdown | null>(null);
</script>

<template>
  <!--
    `label` slot is the trigger text; the default slot holds a
    <BsDropdownMenu> of items:

      <BsNavbarDropdown>
        <template #label>Products</template>
        <BsDropdownMenu>
          <BsDropdownItem><a href="…">…</a></BsDropdownItem>
        </BsDropdownMenu>
      </BsNavbarDropdown>
  -->
  <mp-navbar-dropdown ref="el" v-bind="$attrs">
    <!-- `mp-navbar-dropdown` is a native custom element, so named slotting uses
         the `slot="label"` attribute on a real DOM child (Vue's `#label` /
         `<template>` syntax only works for Vue components). -->
    <span slot="label"><slot name="label" /></span>
    <slot />
  </mp-navbar-dropdown>
</template>

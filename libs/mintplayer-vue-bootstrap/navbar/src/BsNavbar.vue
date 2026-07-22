<script setup lang="ts">
// Registers <mp-navbar> (and its sibling elements) on the client. On the SSR
// server this import runs after the lit-ssr DOM shim is installed (see the
// demo's entry-server.ts), so `customElements.define` doesn't throw in Node —
// same pattern as every other @mintplayer/vue-bootstrap wrapper.
import '@mintplayer/web-components/navbar';
import type {
  MpNavbar,
  NavbarBreakpoint,
  NavbarExpandedChangeEventDetail,
} from '@mintplayer/web-components/navbar';
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    /** Breakpoint at/above which the navbar lays out horizontally. Default `md`. */
    breakpoint?: NavbarBreakpoint;
    /** Bootstrap color (`primary`/`dark`/…) or adaptive (`body`/`body-secondary`/`body-tertiary`). */
    color?: string;
    /** Reflected open state of the collapsed menu (boolean attribute). */
    expanded?: boolean;
    /** Accessible label for the navbar landmark. */
    ariaLabel?: string;
    /** `fixed` pins the bar to the top of the viewport, full width; omit for in-flow. */
    positioning?: 'fixed';
  }>(),
  {
    breakpoint: 'md',
  },
);

const emit = defineEmits<{ expandedchange: [detail: NavbarExpandedChangeEventDetail] }>();

const el = ref<MpNavbar | null>(null);

function onExpandedchange(event: Event) {
  emit('expandedchange', (event as CustomEvent<NavbarExpandedChangeEventDetail>).detail);
}

// `expandedchange` is a CustomEvent the WC dispatches; wire it up client-side only.
onMounted(() => el.value?.addEventListener('expandedchange', onExpandedchange));
onBeforeUnmount(() => el.value?.removeEventListener('expandedchange', onExpandedchange));
</script>

<template>
  <!--
    Brand + items are server-rendered as Declarative Shadow DOM (see
    injectMpNavbarDsd in @mintplayer/web-components/navbar/ssr), so the bar
    renders with JavaScript disabled. Place the brand with slot="brand",
    right-aligned items with slot="end", everything else is left items:

      <BsNavbar breakpoint="lg" color="body-tertiary">
        <BsNavbarBrand>…</BsNavbarBrand>
        <BsNavbarItem active><a href="…">Home</a></BsNavbarItem>
        <BsNavbarItem slot="end"><a href="…">Sign in</a></BsNavbarItem>
      </BsNavbar>
  -->
  <mp-navbar
    ref="el"
    v-bind="$attrs"
    :breakpoint="breakpoint"
    :color="color"
    :aria-label="ariaLabel"
    :expanded="expanded ? '' : undefined"
    :positioning="positioning"
  >
    <slot />
  </mp-navbar>
</template>

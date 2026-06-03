<script setup lang="ts">
// Registers <mp-shell> on the client. On the SSR server this import runs after
// the lit-ssr DOM shim is installed (see the demo's entry-server.ts), so
// `customElements.define` doesn't throw in Node — same pattern as every other
// @mintplayer/vue-bootstrap wrapper.
import '@mintplayer/web-components/shell';
import type {
  MpShell,
  ShellState,
  ShellStateChangeEventDetail,
} from '@mintplayer/web-components/shell';
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    /** `auto` (default, responsive) | `show` (force open) | `hide` (force closed). */
    state?: ShellState;
    /** Breakpoint below which the sidebar starts collapsed. Default `md`. */
    breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    /** Expanded sidebar width (any CSS length), e.g. `"15rem"`. */
    size?: string;
    /** Hide the built-in hamburger and drive the toggle from a consumer control. */
    externalToggle?: boolean;
  }>(),
  {
    state: 'auto',
    breakpoint: 'md',
  },
);

const emit = defineEmits<{ statechange: [detail: ShellStateChangeEventDetail] }>();

const el = ref<MpShell | null>(null);

function onStatechange(event: Event) {
  emit('statechange', (event as CustomEvent<ShellStateChangeEventDetail>).detail);
}

// `statechange` is a CustomEvent the WC dispatches; wire it up client-side only.
onMounted(() => el.value?.addEventListener('statechange', onStatechange));
onBeforeUnmount(() => el.value?.removeEventListener('statechange', onStatechange));
</script>

<template>
  <!--
    Layout is server-rendered as Declarative Shadow DOM (see injectMpShellDsd in
    @mintplayer/web-components/shell/ssr), so the sidebar + hamburger toggle work
    with JavaScript disabled. Place the sidebar as a child with slot="sidebar";
    everything else is main content:

      <BsShell breakpoint="md">
        <nav slot="sidebar">…</nav>
        <main>…</main>
      </BsShell>
  -->
  <mp-shell
    ref="el"
    v-bind="$attrs"
    :state="state"
    :breakpoint="breakpoint"
    :size="size"
    :external-toggle="externalToggle ? '' : undefined"
  >
    <slot />
  </mp-shell>
</template>

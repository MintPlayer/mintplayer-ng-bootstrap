<script setup lang="ts">
/**
 * Responsive app shell with a collapsible sidebar (#437), rendering the
 * markup of @mintplayer/ui-core/shell. The open state is a native checkbox
 * per viewport mode and every rule is CSS, so the server-rendered page works
 * with JavaScript off.
 *
 *   <BsShell>
 *     <template #topbar>…brand…</template>
 *     <template #sidebar><nav>…</nav></template>
 *     …main content…
 *   </BsShell>
 */
import { computed, getCurrentInstance, mergeProps, useAttrs, useTemplateRef, watch } from 'vue';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  SHELL_SCOPE,
  applyShellState,
  connectShell,
  focusShellContent,
  shellScopedStyles,
  shouldDismissShell,
  toggleShell,
  type ShellBreakpoint,
  type ShellLabels,
  type ShellState,
} from '@mintplayer/ui-core/shell';
import type { ShellStateChange } from './shell-state-change';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** `auto` (default, responsive) | `show` (force open) | `hide` (force closed). */
    state?: ShellState;
    /** Breakpoint below which the sidebar overlays the content. Default `md`. */
    breakpoint?: ShellBreakpoint;
    /** Expanded sidebar width (any CSS length), e.g. `"15rem"`. */
    size?: string | null;
    /** Hide the built-in hamburger and drive the shell through `state` or `toggle()`. */
    externalToggle?: boolean;
    /** Auto-close the overlay drawer when a sidebar link is clicked (narrow mode only). */
    dismissOnNavigate?: boolean;
    /** Localized accessible names; missing keys fall back to English. */
    labels?: Partial<ShellLabels> | null;
  }>(),
  {
    state: 'auto',
    breakpoint: 'md',
    size: null,
    externalToggle: false,
    dismissOnNavigate: false,
    labels: null,
  },
);

const emit = defineEmits<{ statechange: [change: ShellStateChange] }>();

installLightStyles(SHELL_SCOPE, shellScopedStyles);

const id = `bs-shell-${getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)}`;
const view = computed(() => connectShell({
  id,
  state: props.state,
  breakpoint: props.breakpoint,
  externalToggle: props.externalToggle,
  labels: props.labels,
}));
const root = useTemplateRef<HTMLDivElement>('root');

// `useAttrs()` is not reactive for computed(), so the merge is read in the
// template (render-time); mergeProps joins the consumer's class and style.
const consumerAttrs = useAttrs();
function rootAttrs(): Record<string, unknown> {
  return mergeProps(view.value.root, consumerAttrs, props.size ? { style: { '--mp-shell-size': props.size } } : {});
}

function toggle(force?: boolean) {
  const open = root.value ? toggleShell(root.value, force) : null;
  if (open !== null) emit('statechange', { open });
}

function onRootClick(event: MouseEvent) {
  if (props.dismissOnNavigate && root.value && shouldDismissShell(event, root.value)) toggle(false);
}

function onSkip(event: MouseEvent) {
  if (root.value) focusShellContent(event, root.value);
}

function onToggleChange(event: Event) {
  emit('statechange', { open: (event.target as HTMLInputElement).checked });
}

// The bags set the initial state (what SSR emits); a later `state` change must
// also reach a checkbox the user already flipped.
watch(() => props.state, (state) => {
  if (root.value) applyShellState(root.value, state);
});

defineExpose({ toggle });
</script>

<template>
  <div ref="root" v-bind="rootAttrs()" @click="onRootClick">
    <a v-bind="view.skip" :href="view.skipHref" @click="onSkip">{{ view.skipText }}</a>
    <input v-for="t in view.toggles" :key="t.mode" v-bind="t.input" @change="onToggleChange" />
    <div v-bind="view.topbar">
      <label v-for="t in view.toggles" :key="t.mode" v-bind="t.label">{{ view.hamburgerText }}</label>
      <slot name="topbar" />
    </div>
    <div v-bind="view.sidebarRoot">
      <aside v-bind="view.sidebar"><slot name="sidebar" /></aside>
      <div v-bind="view.content"><slot /></div>
    </div>
  </div>
</template>

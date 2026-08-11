<script setup lang="ts">
// Side-effect-registers <mp-code-snippet> via the upstream WC entry.
import '@mintplayer/web-components/code-snippet';
import type { CodeLineAnnotation, MpCodeSnippet } from '@mintplayer/web-components/code-snippet';
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{
  /** Sparse per-line markers. */
  annotations?: CodeLineAnnotation[];
  /** Turns each line number into a real link. */
  lineHref?: ((line: number) => string) | null;
}>();

const emit = defineEmits<{
  (e: 'language-detected', language: string): void;
  /**
   * The DOM event, not just the line number — it is `cancelable`, and a
   * consumer routing the navigation themselves needs `preventDefault()`.
   * Re-emitting only `detail.line` silently dropped that channel.
   */
  (e: 'line-activate', event: CustomEvent<{ line: number }>): void;
}>();

defineOptions({ inheritAttrs: false });

const element = ref<MpCodeSnippet | null>(null);

/**
 * An array and a function cannot travel as attributes, so they are assigned to
 * the element directly — on mount and on every change, since Vue would
 * otherwise serialise them into the DOM.
 */
function syncObjectProps(): void {
  const el = element.value;
  if (!el) return;
  el.annotations = props.annotations ?? [];
  el.lineHref = props.lineHref ?? null;
}

onMounted(syncObjectProps);
watch(() => [props.annotations, props.lineHref], syncObjectProps, { deep: true });

/** Scroll a line into view; delegated so re-requesting the current line still scrolls. */
function scrollToLine(line: number): void {
  element.value?.scrollToLine(line);
}

defineExpose({ scrollToLine, element });
</script>

<template>
  <mp-code-snippet
    ref="element"
    v-bind="$attrs"
    @language-detected="emit('language-detected', ($event as CustomEvent).detail.language)"
    @line-activate="emit('line-activate', $event as CustomEvent<{ line: number }>)"
  >
    <slot />
  </mp-code-snippet>
</template>

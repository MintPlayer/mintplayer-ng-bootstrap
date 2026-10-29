<script setup lang="ts">
/**
 * An axis-less inline trend for table cells (#437), rendered from
 * `@mintplayer/ui-core/charts/sparkline`, so the server HTML is the finished
 * chart. The `<span class="sparkline">` is the sized box and receives the
 * consumer's attributes; the `role="img"` svg inside is named by
 * `aria-label`, `input-label`, `summaryFormatter`, or the generated
 * "first, last, lowest, highest".
 */
import { computed, onMounted, ref, shallowRef, useAttrs } from 'vue';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  SPARKLINE_SCOPE,
  connectSparkline,
  sparklineScopedStyles,
} from '@mintplayer/ui-core/charts/sparkline';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  /** `null` renders a gap. */
  points?: (number | null)[];
  area?: boolean;
  showLastDot?: boolean;
  yMin?: number;
  yMax?: number;
  /** Number formatting for the generated name. Defaults to the nearest `lang` once mounted. */
  locale?: string;
  inputLabel?: string;
  summaryFormatter?: (points: (number | null)[]) => string | undefined;
}>(), { points: () => [], area: false, showLastDot: true });

installLightStyles(SPARKLINE_SCOPE, sparklineScopedStyles);

const attrs = useAttrs();
const root = shallowRef<HTMLSpanElement | null>(null);
const lang = ref<string | undefined>(undefined);
onMounted(() => (lang.value = root.value?.closest('[lang]')?.getAttribute('lang') ?? undefined));

// The consumer's aria-label names the svg; every other attribute lands on the box.
const rest = computed(() => Object.fromEntries(Object.entries(attrs).filter(([name]) => name !== 'aria-label')));
const view = computed(() => connectSparkline(props.points, {
  area: props.area,
  showLastDot: props.showLastDot,
  yMin: props.yMin,
  yMax: props.yMax,
  locale: props.locale ?? lang.value,
  label: (attrs['aria-label'] as string | undefined) ?? props.inputLabel,
  summaryFormatter: props.summaryFormatter,
}));
</script>

<template>
  <span ref="root" v-bind="{ ...view.root, ...rest }" :class="[view.root.class, attrs.class]">
    <svg v-if="view.svg" v-bind="view.svg">
      <path v-if="view.fill" v-bind="view.fill" />
      <path v-bind="view.line" />
      <circle v-if="view.dot" v-bind="view.dot" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import '@mintplayer/web-components/charts/trend';
import type { MpTrendChart, TrendSeries } from '@mintplayer/web-components/charts/trend';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// Scalars (area, stacked, y-min, goal, locale, summary, ...) flow through as
// attributes via v-bind="$attrs"; the series array is forwarded as a property.
const props = defineProps<{
  series?: TrendSeries[];
  summaryFormatter?: (series: TrendSeries[]) => string | undefined;
}>();

const el = ref<MpTrendChart | null>(null);

const syncSeries = () => {
  if (el.value) el.value.series = props.series ?? [];
};
const syncSummaryFormatter = () => {
  if (el.value) el.value.summaryFormatter = props.summaryFormatter;
};

onMounted(() => {
  syncSeries();
  syncSummaryFormatter();
});
watch(() => props.series, syncSeries);
watch(() => props.summaryFormatter, syncSummaryFormatter);
</script>

<template>
  <mp-trend-chart
    ref="el"
    v-bind="$attrs"
  />
</template>

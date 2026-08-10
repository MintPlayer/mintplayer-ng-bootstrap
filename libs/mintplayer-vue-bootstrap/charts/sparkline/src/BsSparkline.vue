<script setup lang="ts">
import '@mintplayer/web-components/charts/sparkline';
import type { MpSparkline } from '@mintplayer/web-components/charts/sparkline';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// Scalars (area, show-last-dot, y-min, y-max, locale, label) flow through as
// attributes via v-bind="$attrs"; the points array is forwarded as a property.
const props = defineProps<{
  points?: (number | null)[];
  summaryFormatter?: (points: (number | null)[]) => string | undefined;
}>();

const el = ref<MpSparkline | null>(null);

const syncPoints = () => {
  if (el.value) el.value.points = props.points ?? [];
};
const syncSummaryFormatter = () => {
  if (el.value) el.value.summaryFormatter = props.summaryFormatter;
};

onMounted(() => {
  syncPoints();
  syncSummaryFormatter();
});
watch(() => props.points, syncPoints);
watch(() => props.summaryFormatter, syncSummaryFormatter);
</script>

<template>
  <mp-sparkline
    ref="el"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
// Side-effect-registers <mp-timepicker> via the upstream WC entry.
import '@mintplayer/web-components/timepicker';
import { MpTimepickerElement } from '@mintplayer/web-components/timepicker';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// The timepicker WC's v-model surface is the `selectedTime` property
// (`Date | null`) + the `selected-time-change` CustomEvent<Date>.
const modelValue = defineModel<Date | null>();
const el = ref<MpTimepickerElement | null>(null);

const syncToEl = (v: Date | null | undefined) => {
  if (el.value) el.value.selectedTime = v ?? null;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onSelectedTimeChange(e: Event) {
  const detail = (e as CustomEvent<Date>).detail;
  modelValue.value = detail instanceof Date ? detail : null;
}
</script>

<template>
  <mp-timepicker
    ref="el"
    v-bind="$attrs"
    @selected-time-change="onSelectedTimeChange"
  >
    <slot />
  </mp-timepicker>
</template>

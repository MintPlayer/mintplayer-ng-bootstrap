<script setup lang="ts">
// Side-effect-registers <mp-calendar> via the upstream WC entry.
import '@mintplayer/web-components/calendar';
import { MpCalendarElement } from '@mintplayer/web-components/calendar';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// The calendar WC's v-model surface is the `selectedDate` property
// (`Date | null`) + the `selected-date-change` CustomEvent<Date>.
const modelValue = defineModel<Date | null>();
const el = ref<MpCalendarElement | null>(null);

const syncToEl = (v: Date | null | undefined) => {
  if (el.value) el.value.selectedDate = v ?? null;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onSelectedDateChange(e: Event) {
  const detail = (e as CustomEvent<Date>).detail;
  modelValue.value = detail instanceof Date ? detail : null;
}
</script>

<template>
  <mp-calendar
    ref="el"
    v-bind="$attrs"
    @selected-date-change="onSelectedDateChange"
  >
    <slot />
  </mp-calendar>
</template>

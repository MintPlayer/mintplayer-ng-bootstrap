<script setup lang="ts">
// Side-effect-registers <mp-datepicker> via the upstream WC entry.
import '@mintplayer/web-components/datepicker';
import { MpDatepickerElement } from '@mintplayer/web-components/datepicker';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// Same v-model surface as BsCalendar — `selectedDate` property +
// `selected-date-change` CustomEvent<Date>. The datepicker WC owns the
// trigger button + popup; the inner mp-calendar forwards the event.
const modelValue = defineModel<Date | null>();
const el = ref<MpDatepickerElement | null>(null);

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
  <mp-datepicker
    ref="el"
    v-bind="$attrs"
    @selected-date-change="onSelectedDateChange"
  >
    <slot />
  </mp-datepicker>
</template>

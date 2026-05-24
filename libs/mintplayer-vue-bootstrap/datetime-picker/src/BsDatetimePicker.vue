<script setup lang="ts">
// Side-effect-registers <mp-datetime-picker> via the upstream WC entry.
import '@mintplayer/web-components/datetime-picker';
import { MpDatetimePickerElement } from '@mintplayer/web-components/datetime-picker';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: `value: Date | null` + `value-change` CustomEvent<Date | null>.
const modelValue = defineModel<Date | null>();
const el = ref<MpDatetimePickerElement | null>(null);

const syncToEl = (v: Date | null | undefined) => {
  if (el.value) el.value.value = v ?? null;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onValueChange(e: Event) {
  const detail = (e as CustomEvent<Date | null>).detail;
  modelValue.value = detail instanceof Date ? detail : null;
}
</script>

<template>
  <mp-datetime-picker
    ref="el"
    v-bind="$attrs"
    @value-change="onValueChange"
  >
    <slot />
  </mp-datetime-picker>
</template>

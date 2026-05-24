<script setup lang="ts">
// Side-effect-registers <mp-multi-range> via the upstream WC entry.
import '@mintplayer/web-components/multi-range';
import { MintMultiRangeElement } from '@mintplayer/web-components/multi-range';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: `value: number[]` + the WC's `value-change` event
// (committed) — `value-input` is the during-drag stream and consumers
// can listen to that with `@value-input` directly if they want
// continuous updates.
const modelValue = defineModel<number[]>();
const el = ref<MintMultiRangeElement | null>(null);

const syncToEl = (v: number[] | undefined) => {
  if (el.value) el.value.value = v ?? [];
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl, { deep: true });

function onValueChange(e: Event) {
  const detail = (e as CustomEvent<number[]>).detail;
  if (Array.isArray(detail)) modelValue.value = [...detail];
}
</script>

<template>
  <mp-multi-range
    ref="el"
    v-bind="$attrs"
    @value-change="onValueChange"
  />
</template>

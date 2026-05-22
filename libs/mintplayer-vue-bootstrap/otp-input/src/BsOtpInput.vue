<script setup lang="ts">
// Side-effect-registers <mp-otp-input> via the upstream WC entry.
import '@mintplayer/web-components/otp-input';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// Default v-model is the WC's `value` property + `change` event.
// Hand-edit this file if the WC uses different names (e.g. `selection`
// + `select` for multi-select WCs).
const modelValue = defineModel<unknown>();
const el = ref<HTMLElement | null>(null);

const syncToEl = (v: unknown) => {
  if (el.value) (el.value as unknown as { value: unknown }).value = v;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onChange(e: Event) {
  modelValue.value = (e.target as unknown as { value: unknown }).value;
}
</script>

<template>
  <mp-otp-input
    ref="el"
    v-bind="$attrs"
    @change="onChange"
  >
    <slot />
  </mp-otp-input>
</template>

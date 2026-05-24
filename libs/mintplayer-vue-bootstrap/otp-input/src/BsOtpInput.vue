<script setup lang="ts">
// Side-effect-registers <mp-otp-input> via the upstream WC entry.
import '@mintplayer/web-components/otp-input';
import { MintOtpInputElement } from '@mintplayer/web-components/otp-input';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: `value: string` + the WC's `value-change` event.
// `complete` is also emitted once the input is full — consumers can
// listen with `@complete` directly if they want that signal.
const modelValue = defineModel<string>();
const el = ref<MintOtpInputElement | null>(null);

const syncToEl = (v: string | undefined) => {
  if (el.value) el.value.value = v ?? '';
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onValueChange(e: Event) {
  const detail = (e as CustomEvent<string>).detail;
  modelValue.value = typeof detail === 'string' ? detail : '';
}
</script>

<template>
  <mp-otp-input
    ref="el"
    v-bind="$attrs"
    @value-change="onValueChange"
  />
</template>

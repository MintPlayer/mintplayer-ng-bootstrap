<script setup lang="ts">
// Side-effect-registers <mp-signature-pad> via the upstream WC entry.
import '@mintplayer/web-components/signature-pad';
import type { MpSignaturePadElement, Signature } from '@mintplayer/web-components/signature-pad';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: `signature: Signature` + the WC's `signature-change` event.
const modelValue = defineModel<Signature>();
const el = ref<MpSignaturePadElement | null>(null);

const syncToEl = (v: Signature | undefined) => {
  if (el.value) el.value.signature = v ?? { strokes: [] };
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onSignatureChange(e: Event) {
  modelValue.value = (e as CustomEvent<Signature>).detail;
}
</script>

<template>
  <mp-signature-pad
    ref="el"
    v-bind="$attrs"
    @signature-change="onSignatureChange"
  />
</template>

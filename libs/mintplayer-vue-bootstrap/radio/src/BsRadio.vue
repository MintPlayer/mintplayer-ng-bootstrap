<script setup lang="ts">
// Side-effect-registers <mp-radio> via the upstream WC entry.
import '@mintplayer/web-components/radio';
import {
  MpRadio,
  type RadioChangeEventDetail,
} from '@mintplayer/web-components/radio';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// The radio WC's v-model surface is the `checked` property (`boolean`)
// + the `change` CustomEvent<RadioChangeEventDetail>. One-of-N
// coordination across multiple <bs-radio> instances is the consumer's
// job (matching the Angular [bsRadioGroup] precedent and the WC's own
// shadow-DOM limitation); the v-model on a single radio is just the
// checked flag.
const modelValue = defineModel<boolean>();
const el = ref<MpRadio | null>(null);

const syncToEl = (v: boolean | undefined) => {
  if (el.value) el.value.checked = !!v;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onChange(e: Event) {
  // Only react to the WC's own CustomEvent (carries `detail`). Same
  // defensive guard as BsCheckbox — if a non-CustomEvent ever escapes
  // the shadow root, `detail` is undefined and we'd otherwise reset the
  // model to false silently.
  const detail = (e as CustomEvent<RadioChangeEventDetail>).detail;
  if (detail) modelValue.value = !!detail.checked;
}
</script>

<template>
  <mp-radio
    ref="el"
    v-bind="$attrs"
    @change="onChange"
  >
    <slot />
  </mp-radio>
</template>

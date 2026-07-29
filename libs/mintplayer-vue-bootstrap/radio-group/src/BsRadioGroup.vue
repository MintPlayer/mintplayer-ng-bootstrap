<script setup lang="ts">
// Side-effect-registers <mp-radio-group> via the upstream WC entry.
import '@mintplayer/web-components/radio-group';
import {
  MpRadioGroup,
  type RadioGroupChangeEventDetail,
} from '@mintplayer/web-components/radio-group';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// v-model is the selected radio's value (string | null). Put <BsRadio>
// children inside; the WC supplies exclusivity, role="radiogroup", the
// roving tab stop and arrow move-and-select — the coordination the per-radio
// wrappers explicitly leave to a group. `group-change` is the one signal
// covering both pointer AND keyboard selection (keyboard checks radios
// programmatically, so no per-radio change ever fires).
const modelValue = defineModel<string | null>();
const el = ref<MpRadioGroup | null>(null);

const syncToEl = (v: string | null | undefined) => {
  if (el.value) el.value.value = v ?? null;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onGroupChange(e: Event) {
  const detail = (e as CustomEvent<RadioGroupChangeEventDetail>).detail;
  if (detail) modelValue.value = detail.value;
}
</script>

<template>
  <mp-radio-group
    ref="el"
    v-bind="$attrs"
    @group-change="onGroupChange"
  >
    <slot />
  </mp-radio-group>
</template>

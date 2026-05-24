<script setup lang="ts">
// Side-effect-registers <mp-toggle-button> via the upstream WC entry.
import '@mintplayer/web-components/toggle-button';
import type { MpToggleButton, ToggleChangeEventDetail } from '@mintplayer/web-components/toggle-button';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// The toggle-button WC's v-model surface is the `checked` property
// (boolean) + the `change` CustomEvent<{ checked, value }>.
const modelValue = defineModel<boolean>();
const el = ref<MpToggleButton | null>(null);

const syncToEl = (v: boolean | undefined) => {
  if (el.value) el.value.checked = !!v;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onChange(e: Event) {
  const detail = (e as CustomEvent<ToggleChangeEventDetail>).detail;
  modelValue.value = detail.checked;
}
</script>

<template>
  <mp-toggle-button
    ref="el"
    v-bind="$attrs"
    @change="onChange"
  >
    <slot />
  </mp-toggle-button>
</template>

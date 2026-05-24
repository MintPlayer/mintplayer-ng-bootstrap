<script setup lang="ts">
// Side-effect-registers <mp-checkbox> via the upstream WC entry.
import '@mintplayer/web-components/checkbox';
import {
  MpCheckbox,
  type CheckboxChangeEventDetail,
} from '@mintplayer/web-components/checkbox';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// The checkbox WC's v-model surface is the `checked` property (`boolean`)
// + the `change` CustomEvent<CheckboxChangeEventDetail>. The event detail
// also carries `indeterminate` + `value`, but the canonical v-model binds
// to the boolean checked-ness; consumers wanting tri-state can listen to
// `@change` directly for the full detail.
const modelValue = defineModel<boolean>();
const el = ref<MpCheckbox | null>(null);

const syncToEl = (v: boolean | undefined) => {
  if (el.value) el.value.checked = !!v;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onChange(e: Event) {
  const detail = (e as CustomEvent<CheckboxChangeEventDetail>).detail;
  modelValue.value = !!detail?.checked;
}
</script>

<template>
  <mp-checkbox
    ref="el"
    v-bind="$attrs"
    @change="onChange"
  >
    <slot />
  </mp-checkbox>
</template>

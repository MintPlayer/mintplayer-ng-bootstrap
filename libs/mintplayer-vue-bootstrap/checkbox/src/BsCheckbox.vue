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
  // Only react to the WC's own CustomEvent (which carries `detail`). The
  // native `change` from the inner `<input>` has composed:false so it
  // shouldn't escape the WC's shadow root, but guard anyway — if it ever
  // does (or if a consumer forwards a plain native event), `detail` is
  // undefined and `!!undefined.checked` would silently reset the model
  // to false.
  const detail = (e as CustomEvent<CheckboxChangeEventDetail>).detail;
  if (detail) modelValue.value = !!detail.checked;
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

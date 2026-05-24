<script setup lang="ts">
// Side-effect-registers <mp-select> via the upstream WC entry.
import '@mintplayer/web-components/select';
import {
  MpSelect,
  type MpSelectOption,
  type SelectChangeEventDetail,
} from '@mintplayer/web-components/select';
import { onMounted, ref, watch } from 'vue';
defineOptions({ inheritAttrs: false });

// `<mp-select>`'s v-model surface is the string `value` property + the
// `value-change` CustomEvent<SelectChangeEventDetail>. Consumers wanting
// multi-select bind `:values` instead and listen to `@value-change` for
// the full `string[]` payload — see the demo for usage.
const modelValue = defineModel<string | null>();

const props = defineProps<{
  options?: MpSelectOption[] | null;
  values?: string[];
}>();

const el = ref<MpSelect | null>(null);

// Native custom-element attribute reflection only handles string/boolean
// values; arrays + objects must be forwarded through the JS property API.
function syncObjectProps() {
  if (!el.value) return;
  if (props.options !== undefined) el.value.options = props.options;
  if (props.values !== undefined) el.value.values = props.values;
  el.value.value = modelValue.value ?? null;
}

onMounted(syncObjectProps);
watch(() => props.options, syncObjectProps);
watch(() => props.values, syncObjectProps);
watch(modelValue, (v) => {
  if (el.value) el.value.value = v ?? null;
});

function onValueChange(e: Event) {
  // Guard against composed native `change` events (no `detail`). The WC's
  // own `value-change` CustomEvent always carries `detail`.
  const detail = (e as CustomEvent<SelectChangeEventDetail>).detail;
  if (!detail) return;
  modelValue.value = detail.value;
}
</script>

<template>
  <mp-select
    ref="el"
    v-bind="$attrs"
    @value-change="onValueChange"
  >
    <slot />
  </mp-select>
</template>

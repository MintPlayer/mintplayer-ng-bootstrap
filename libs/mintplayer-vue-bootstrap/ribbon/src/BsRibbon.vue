<script setup lang="ts">
import '@mintplayer/web-components/ribbon';
import {
  MpRibbon,
  type RibbonTabChangeEvent,
} from '@mintplayer/web-components/ribbon';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: `activeTabId: string` (matches the WC's
// `active-tab-id` attribute / `activeTabId` JS property), with the
// `tab-change` event committing the new selection. Empty string means
// "no active tab" — matches the WC's default.
const modelValue = defineModel<string>();
const el = ref<MpRibbon | null>(null);

const syncToEl = (v: string | undefined) => {
  if (el.value) el.value.activeTabId = v ?? '';
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onTabChange(e: Event) {
  const detail = (e as CustomEvent<RibbonTabChangeEvent>).detail;
  if (detail) modelValue.value = detail.activeTabId;
}
</script>

<template>
  <mp-ribbon ref="el" v-bind="$attrs" @tab-change="onTabChange">
    <slot />
  </mp-ribbon>
</template>

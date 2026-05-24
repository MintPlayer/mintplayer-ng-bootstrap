<script setup lang="ts">
import '@mintplayer/web-components/tab-control';
import {
  MpTabControl,
  type TabActivateEventDetail,
} from '@mintplayer/web-components/tab-control';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// v-model surface: the `active-tab` attribute on the WC + the
// `tab-activate` CustomEvent. The underlying field is private; the
// public API is the kebab-cased attribute, so we set it via
// setAttribute. Composed with native <mp-tab-page> elements in the
// slot — no SFC wrapper for tab-page since it's purely structural.
const modelValue = defineModel<string>();
const el = ref<MpTabControl | null>(null);

const syncToEl = (v: string | undefined) => {
  if (el.value && v !== undefined) el.value.setAttribute('active-tab', v);
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onTabActivate(e: Event) {
  const detail = (e as CustomEvent<TabActivateEventDetail>).detail;
  if (detail) modelValue.value = detail.tabId;
}
</script>

<template>
  <mp-tab-control ref="el" v-bind="$attrs" @tab-activate="onTabActivate">
    <slot />
  </mp-tab-control>
</template>

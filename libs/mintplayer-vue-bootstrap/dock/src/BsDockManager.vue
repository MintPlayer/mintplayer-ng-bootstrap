<script setup lang="ts">
import '@mintplayer/web-components/dock';
import {
  MintDockManagerElement,
  type DockLayoutSnapshot,
} from '@mintplayer/web-components/dock';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// `layout` is an object — Vue can't bind objects as DOM attributes, so we
// forward it via the WC's property setter after mount. v-model surface is
// the `layout` JS prop + the `dock-layout-changed` CustomEvent.
const modelValue = defineModel<DockLayoutSnapshot | null>('layout');

const el = ref<MintDockManagerElement | null>(null);

const syncToEl = (v: DockLayoutSnapshot | null | undefined) => {
  if (el.value) el.value.layout = v ?? null;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onLayoutChanged(e: Event) {
  const detail = (e as CustomEvent<DockLayoutSnapshot>).detail;
  if (detail) modelValue.value = detail;
}
</script>

<template>
  <mint-dock-manager
    ref="el"
    v-bind="$attrs"
    @dock-layout-changed="onLayoutChanged"
  >
    <slot />
  </mint-dock-manager>
</template>

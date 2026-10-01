<script setup lang="ts">
import '@mintplayer/web-components/theming';
import {
  BS_THEME_DEFAULT_MODES,
  type BsThemeToggleMode,
  type MpThemeToggle,
} from '@mintplayer/web-components/theming';
import { onMounted, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

// The toggle drives the shared theme store itself; read or set the same state
// from code with useBsTheme(). aria-label, id and every other attribute flow
// through v-bind="$attrs"; the modes array is forwarded as a property.
const props = defineProps<{
  modes?: readonly BsThemeToggleMode[];
}>();

const el = ref<MpThemeToggle | null>(null);

const syncModes = () => {
  if (el.value) el.value.modes = props.modes ?? BS_THEME_DEFAULT_MODES;
};

onMounted(syncModes);
watch(() => props.modes, syncModes);
</script>

<template>
  <mp-theme-toggle
    ref="el"
    v-bind="$attrs"
  />
</template>

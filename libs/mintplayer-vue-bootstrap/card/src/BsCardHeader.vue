<script setup lang="ts">
import { applyHeaderNavStyle } from '@mintplayer/web-components/card';
import { ref, onMounted, watch, nextTick } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ color?: string; navStyle?: 'tabs' | 'pills' }>();

const el = ref<HTMLElement | null>(null);

async function applyNavStyle() {
  // Await the next tick so the slotted nav/ul exists before we decorate it.
  await nextTick();
  if (el.value) {
    applyHeaderNavStyle(el.value, props.navStyle ?? null);
  }
}

onMounted(applyNavStyle);
watch(() => props.navStyle, applyNavStyle);
</script>

<template>
  <div
    ref="el"
    class="card-header"
    :class="color ? 'text-bg-' + color : null"
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>

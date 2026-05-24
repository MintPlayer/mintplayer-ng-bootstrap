<script setup lang="ts">
// Side-effect-registers <mp-pagination> via the upstream WC entry.
import '@mintplayer/web-components/pagination';
import type { MpPagination, PageChangeEventDetail } from '@mintplayer/web-components/pagination';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// The pagination WC's v-model surface is the `selectedPageNumber` property
// (number) + the `mp-pagination-page-change` CustomEvent<{ page: number }>.
const modelValue = defineModel<number>();
const el = ref<MpPagination | null>(null);

const syncToEl = (v: number | undefined) => {
  if (el.value && typeof v === 'number') el.value.selectedPageNumber = v;
};

onMounted(() => syncToEl(modelValue.value));
watch(modelValue, syncToEl);

function onPageChange(e: Event) {
  const detail = (e as CustomEvent<PageChangeEventDetail>).detail;
  modelValue.value = detail.page;
}
</script>

<template>
  <mp-pagination
    ref="el"
    v-bind="$attrs"
    @mp-pagination-page-change="onPageChange"
  >
    <slot />
  </mp-pagination>
</template>

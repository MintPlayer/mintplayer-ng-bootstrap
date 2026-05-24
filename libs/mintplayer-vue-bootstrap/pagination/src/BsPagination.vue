<script setup lang="ts">
// Side-effect-registers <mp-pagination> via the upstream WC entry.
import '@mintplayer/web-components/pagination';
import type { MpPagination, PageChangeEventDetail } from '@mintplayer/web-components/pagination';
import { ref, watch, onMounted } from 'vue';
defineOptions({ inheritAttrs: false });

// The pagination WC's v-model surface is the `selectedPageNumber` property
// (number) + the `mp-pagination-page-change` CustomEvent<{ page: number }>.
// On undefined/null modelValue we fall back to page 1 so a parent reset
// (e.g. `v-model` cleared after a filter change) actually propagates to
// the WC instead of leaving it on the previously-selected page.
const modelValue = defineModel<number | null>();
const el = ref<MpPagination | null>(null);

const syncToEl = (v: number | null | undefined) => {
  if (el.value) el.value.selectedPageNumber = typeof v === 'number' ? v : 1;
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
  />
</template>

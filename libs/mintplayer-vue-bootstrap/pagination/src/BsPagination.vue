<script setup lang="ts">
import { installBootstrap, bootstrapPagination } from '@mintplayer/ui-core/bootstrap';
/**
 * Bootstrap's .pagination markup (#437) from @mintplayer/ui-core/pagination.
 * Pages are buttons; with hrefFor they are links and a plain click selects in
 * place. Consumer attributes land on the nav. v-model is the selected page; a
 * null or undefined model falls back to page 1, so a parent reset propagates.
 */
import { computed } from 'vue';
import {
  connectPagination,
  isPlainClick,
  type PaginationLabels,
  type PaginationSize,
} from '@mintplayer/ui-core/pagination';

// #452: the pagination partial ships with this component, scoped to the elements it stamps (data-mps="pagination").
installBootstrap(bootstrapPagination);

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    pageNumbers?: number[];
    /** Cap on visible boxes, arrows included (0 = uncapped). */
    numberOfBoxes?: number;
    showArrows?: boolean;
    size?: PaginationSize;
    /** Localized accessible names; missing keys fall back to English. */
    labels?: Partial<PaginationLabels> | null;
    /** Renders every page as a link to this URL, so it works without JavaScript. */
    hrefFor?: ((page: number) => string) | null;
  }>(),
  {
    pageNumbers: () => [],
    numberOfBoxes: 0,
    showArrows: true,
    size: 'medium',
    labels: null,
    hrefFor: null,
  },
);

const modelValue = defineModel<number | null>();

const view = computed(() => connectPagination({
  pageNumbers: props.pageNumbers,
  selectedPageNumber: typeof modelValue.value === 'number' ? modelValue.value : 1,
  numberOfBoxes: props.numberOfBoxes,
  showArrows: props.showArrows,
  size: props.size,
  labels: props.labels,
  hrefFor: props.hrefFor,
}));

function select(page: number | null): void {
  if (page !== null) modelValue.value = page;
}

function onLinkClick(event: MouseEvent, page: number | null): void {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  select(page);
}
</script>

<template>
  <nav data-mps="pagination" v-bind="{ ...view.nav, ...$attrs }">
    <ul data-mps="pagination" :class="view.listClass">
      <li data-mps="pagination" v-for="entry in view.entries" :key="entry.key" :class="entry.itemClass">
        <span data-mps="pagination" v-if="entry.kind === 'gap'" v-bind="entry.attrs">{{ entry.text }}</span>
        <a data-mps="pagination"
          v-else-if="view.tag === 'a'"
          v-bind="entry.attrs"
          :href="entry.href ?? undefined"
          @click="onLinkClick($event, entry.target)"
        >{{ entry.text }}</a>
        <button data-mps="pagination" v-else v-bind="entry.attrs" @click="select(entry.target)">{{ entry.text }}</button>
      </li>
    </ul>
  </nav>
</template>

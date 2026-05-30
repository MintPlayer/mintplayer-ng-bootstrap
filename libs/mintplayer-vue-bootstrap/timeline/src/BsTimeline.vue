<script setup lang="ts">
import '@mintplayer/web-components/timeline';
import { resolveSides, type MpTimeline } from '@mintplayer/web-components/timeline';
import type {
  TimelineAlign,
  TimelineItem,
  TimelineItemClickDetail,
  TimelineItemContext,
  TimelineOrientation,
  TimelineSelectable,
  TimelineSelectionChangeDetail,
} from '@mintplayer/web-components/timeline-core';
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    items?: TimelineItem[];
    orientation?: TimelineOrientation;
    align?: TimelineAlign;
    reverse?: boolean;
    selectable?: TimelineSelectable;
    /** v-model:selection — array of selected items (identity via id). */
    selection?: TimelineItem[];
  }>(),
  { orientation: 'vertical', align: 'start', reverse: false, selectable: 'none' },
);

const emit = defineEmits<{
  (e: 'item-click', detail: TimelineItemClickDetail): void;
  (e: 'update:selection', selected: TimelineItem[]): void;
}>();

type SlotProps = { item: TimelineItem; ctx: TimelineItemContext };
const slots = defineSlots<{
  marker?(props: SlotProps): unknown;
  title?(props: SlotProps): unknown;
  timestamp?(props: SlotProps): unknown;
  opposite?(props: SlotProps): unknown;
  content?(props: SlotProps): unknown;
  default?(props: Record<string, never>): unknown;
}>();
// FUNCTIONS, not computed: `slots.*` is NOT tracked as a reactive dependency
// inside a computed, so a computed would never re-evaluate when a scoped slot
// is added/removed at runtime (e.g. a `<template v-if=... #marker>` toggled by
// the consumer). Called from the template (re-evaluated every render — and the
// component re-renders when its slots change) and from `syncItems` in
// onMounted/onUpdated, both of which see the current slot set.
const hasSlots = (): boolean =>
  !!(slots.marker || slots.title || slots.timestamp || slots.opposite || slots.content);
const lowering = (): boolean => hasSlots() && !!props.items?.length;

const el = ref<MpTimeline | null>(null);

const idOf = (item: TimelineItem, i: number): string | number => item.id ?? i;
const sides = computed(() => resolveSides(props.items?.length ?? 0, props.align, props.reverse));
const ctxFor = (item: TimelineItem, i: number): TimelineItemContext => {
  const len = props.items?.length ?? 0;
  const visualIndex = props.reverse ? len - 1 - i : i;
  return {
    index: i,
    visualIndex,
    isFirst: visualIndex === 0,
    isLast: visualIndex === len - 1,
    orientation: props.orientation,
    side: sides.value[i] ?? 'start',
  };
};
const timeAttr = (item: TimelineItem): string | undefined =>
  item.time instanceof Date ? item.time.toLocaleDateString() : item.time;

const onClick = (e: Event): void => emit('item-click', (e as CustomEvent<TimelineItemClickDetail>).detail);
const onSel = (e: Event): void => {
  const detail = (e as CustomEvent<TimelineSelectionChangeDetail>).detail;
  const its = props.items;
  if (its && its.length) {
    const ids = el.value?.selectedIds ?? detail.selected.map((m, i) => m.id ?? i);
    const byId = new Map(its.map((it, i) => [idOf(it, i), it] as const));
    emit(
      'update:selection',
      ids.map((id) => byId.get(id)).filter((x): x is TimelineItem => x !== undefined),
    );
  } else {
    emit('update:selection', detail.selected);
  }
};

const syncItems = (): void => {
  if (!el.value) return;
  el.value.items = !lowering() && props.items ? props.items : [];
};
const syncSelection = (): void => {
  if (!el.value || props.selectable === 'none') return;
  el.value.selectedIds = (props.selection ?? []).map((it, i) => idOf(it, i));
};

onMounted(() => {
  el.value?.addEventListener('item-click', onClick);
  el.value?.addEventListener('selection-change', onSel);
  syncItems();
  syncSelection();
});
onBeforeUnmount(() => {
  el.value?.removeEventListener('item-click', onClick);
  el.value?.removeEventListener('selection-change', onSel);
});
watch(() => props.items, syncItems);
// Re-sync after every render so a runtime slot toggle (which re-renders this
// component but is invisible to watchers) flips the WC between items-property
// and lowered-children modes. Setting a DOM property here doesn't feed back
// into Vue reactivity, so this cannot loop.
onUpdated(syncItems);
// `deep` so in-place mutations of the selection array (push/splice without
// replacing the reference) still sync to the WC — matches React, which
// re-syncs on every render. Setting the DOM property doesn't feed back into
// Vue reactivity, so this can't loop.
watch(() => props.selection, syncSelection, { deep: true });
watch(() => props.selectable, syncSelection);
</script>

<template>
  <mp-timeline
    ref="el"
    :orientation="orientation"
    :align="align"
    :reverse="reverse"
    :selectable="selectable"
    v-bind="$attrs"
  >
    <template v-if="lowering()">
      <mp-timeline-item
        v-for="(item, i) in items ?? []"
        :key="item.id ?? i"
        :item-id="item.id ?? undefined"
        :title="item.title ?? undefined"
        :description="item.description ?? undefined"
        :time="timeAttr(item) ?? undefined"
        :icon="item.icon ?? undefined"
        :color="item.color ?? undefined"
        :item-class="item.cssClass ?? undefined"
        :disabled="!!item.disabled"
      >
        <span v-if="slots.marker" slot="marker"><slot name="marker" :item="item" :ctx="ctxFor(item, i)" /></span>
        <span v-if="slots.title" slot="title"><slot name="title" :item="item" :ctx="ctxFor(item, i)" /></span>
        <span v-if="slots.timestamp" slot="opposite"><slot name="timestamp" :item="item" :ctx="ctxFor(item, i)" /></span>
        <span v-if="slots.opposite" slot="opposite"><slot name="opposite" :item="item" :ctx="ctxFor(item, i)" /></span>
        <div v-if="slots.content" slot="content"><slot name="content" :item="item" :ctx="ctxFor(item, i)" /></div>
      </mp-timeline-item>
    </template>
    <slot v-else />
  </mp-timeline>
</template>

<script setup lang="ts">
import '@mintplayer/web-components/scheduler';
import { MpScheduler } from '@mintplayer/web-components/scheduler';
import type {
  SchedulerEvent,
  SchedulerOptions,
  Resource,
  ResourceGroup,
  ViewType,
} from '@mintplayer/web-components/scheduler-core';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// `events`, `resources` and `options` are JS-shaped — Vue can't bind them as
// attributes, so we forward via property setters after mount. `resources`
// accepts groups as well as leaf resources: the timeline renders a nested
// tree, and typing it as `Resource[]` made every grouped consumer cast.
const props = defineProps<{
  events?: SchedulerEvent[];
  resources?: (Resource | ResourceGroup)[];
  options?: Partial<SchedulerOptions>;
  /** Coarse look-but-don't-touch switch; `options.permissions` refines it. */
  readonly?: boolean;
}>();

// `view` and `date` flow through `defineModel` for two-way binding: the WC
// changes both from within (its view switcher AND prev/next/today date
// navigation) and reports them via `view-change`. Without the write-back, a
// bound view/date would go stale after any internal navigation.
const view = defineModel<ViewType>('view');
const date = defineModel<Date>('date');

const el = ref<MpScheduler | null>(null);

const syncProps = () => {
  if (!el.value) return;
  if (props.events) el.value.events = props.events;
  if (props.resources) el.value.resources = props.resources;
  if (props.options) el.value.options = props.options;
  el.value.readonly = props.readonly === true;
};

const syncView = () => {
  if (el.value && view.value) el.value.view = view.value;
};

const syncDate = () => {
  if (el.value && date.value) el.value.date = date.value;
};

// Reference-equality watches only. Lit's reactive property system also
// uses === for change detection, so deep watching here would do the
// expensive recursive Proxy traversal but still not re-render the WC
// when a consumer mutates an event in place. The contract is: consumers
// pass NEW arrays (immutable update) to trigger a re-sync — matches the
// canonical Vue pattern for large lists.
onMounted(() => {
  syncProps();
  syncView();
  syncDate();
});
watch(() => props.events, syncProps);
watch(() => props.resources, syncProps);
watch(() => props.options, syncProps);
watch(() => props.readonly, syncProps);
watch(view, syncView);
watch(date, syncDate);

function onViewChange(e: Event) {
  const detail = (e as CustomEvent<{ view: ViewType; date: Date }>).detail;
  if (!detail) return;
  view.value = detail.view;
  date.value = detail.date;
}
</script>

<template>
  <mp-scheduler ref="el" v-bind="$attrs" @view-change="onViewChange" />
</template>

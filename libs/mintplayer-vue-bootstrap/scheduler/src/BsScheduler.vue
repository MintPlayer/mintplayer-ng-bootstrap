<script setup lang="ts">
import '@mintplayer/web-components/scheduler';
import { MpScheduler } from '@mintplayer/web-components/scheduler';
import type {
  SchedulerEvent,
  Resource,
  ViewType,
} from '@mintplayer/web-components/scheduler-core';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// `events` + `resources` are JS-shaped arrays — Vue can't bind them as
// attributes, so we forward via property setters after mount.
const props = defineProps<{
  events?: SchedulerEvent[];
  resources?: Resource[];
}>();

// `view` flows through `defineModel` for two-way `v-model:view` binding:
// the WC owns its own view switcher, so we mirror its `view-change` back
// into the model. Without this, a bound view would only flow one way and
// a WC-driven switch would be lost on the next re-render.
const view = defineModel<ViewType>('view');

const el = ref<MpScheduler | null>(null);

const syncProps = () => {
  if (!el.value) return;
  if (props.events) el.value.events = props.events;
  if (props.resources) el.value.resources = props.resources;
};

const syncView = () => {
  if (el.value && view.value) el.value.view = view.value;
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
});
watch(() => props.events, syncProps);
watch(() => props.resources, syncProps);
watch(view, syncView);

function onViewChange(e: Event) {
  const detail = (e as CustomEvent<{ view: ViewType }>).detail;
  if (detail) view.value = detail.view;
}
</script>

<template>
  <mp-scheduler ref="el" v-bind="$attrs" @view-change="onViewChange" />
</template>

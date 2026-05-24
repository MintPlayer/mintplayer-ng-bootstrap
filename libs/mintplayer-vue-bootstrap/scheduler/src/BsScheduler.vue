<script setup lang="ts">
import '@mintplayer/web-components/scheduler';
import { MpScheduler } from '@mintplayer/web-components/scheduler';
import type {
  SchedulerEvent,
  Resource,
} from '@mintplayer/web-components/scheduler-core';
import { ref, watch, onMounted } from 'vue';

defineOptions({ inheritAttrs: false });

// `events` + `resources` are JS-shaped arrays — Vue can't bind them as
// attributes, so we forward via property setters after mount.
const props = defineProps<{
  events?: SchedulerEvent[];
  resources?: Resource[];
}>();

const el = ref<MpScheduler | null>(null);

const syncProps = () => {
  if (!el.value) return;
  if (props.events) el.value.events = props.events;
  if (props.resources) el.value.resources = props.resources;
};

onMounted(syncProps);
watch(() => props.events, syncProps, { deep: true });
watch(() => props.resources, syncProps, { deep: true });
</script>

<template>
  <mp-scheduler ref="el" v-bind="$attrs" />
</template>

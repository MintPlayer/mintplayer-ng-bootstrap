<script setup lang="ts">
// A timeline row's actions: a partial of scheduler.view.vue, a native
// `popover="auto"` the core opens next to the row's menu button.
import type { SchedulerRowPanel } from '@mintplayer/ui-core/scheduler';

defineProps<{ panel: SchedulerRowPanel }>();
</script>

<template>
  <div v-bind="panel.bag">
    <template v-for="a in panel.actions" :key="a.key">
      <label v-if="a.color" v-bind="a.color.label">
        <span>{{ a.color.text }}</span>
        <input v-bind="a.color.input" :value.prop="a.color.value" />
      </label>
      <button v-if="a.button" v-bind="a.button.bag">{{ a.button.text }}</button>
    </template>
  </div>
</template>

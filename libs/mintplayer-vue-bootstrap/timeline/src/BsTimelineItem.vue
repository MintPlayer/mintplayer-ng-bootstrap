<script setup lang="ts">
import '@mintplayer/web-components/timeline';

withDefaults(
  defineProps<{
    itemId?: string | number;
    title?: string;
    description?: string;
    time?: string;
    icon?: string;
    color?: string;
    cssClass?: string;
    disabled?: boolean;
    /** Seeds the timeline's initial selection (when selectable). */
    selected?: boolean;
  }>(),
  {},
);
</script>

<template>
  <mp-timeline-item
    :item-id="itemId ?? undefined"
    :title="title ?? undefined"
    :description="description ?? undefined"
    :time="time ?? undefined"
    :icon="icon ?? undefined"
    :color="color ?? undefined"
    :item-class="cssClass ?? undefined"
    :disabled="!!disabled"
    :selected="!!selected"
  >
    <slot />
  </mp-timeline-item>
</template>

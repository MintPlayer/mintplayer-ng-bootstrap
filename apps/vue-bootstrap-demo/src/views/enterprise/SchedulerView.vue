<script setup lang="ts">
import { ref } from 'vue';
import { BsScheduler } from '@mintplayer/vue-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import {
  generateEventId,
  type SchedulerEvent,
} from '@mintplayer/web-components/scheduler-core';
import type { MpScheduler } from '@mintplayer/web-components/scheduler';

interface TimeRange { start: Date; end: Date }

const today = new Date();
const at = (h: number, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d;
};

const events = ref<SchedulerEvent[]>([
  { id: '1', title: 'Standup',       start: at(9),  end: at(9, 30), color: '#0d6efd' },
  { id: '2', title: 'Design review', start: at(11), end: at(12),    color: '#6f42c1' },
  { id: '3', title: 'Lunch',         start: at(12), end: at(13),    color: '#198754' },
]);

function onEventUpdate(e: Event) {
  const detail = (e as CustomEvent<{ event: SchedulerEvent }>).detail;
  events.value = events.value.map((ev) =>
    ev.id === detail.event.id ? detail.event : ev,
  );
}

function onEventCreate(e: Event) {
  const detail = (e as CustomEvent<{ range: TimeRange; resourceId?: string }>).detail;
  const newEvent: SchedulerEvent = {
    id: generateEventId(),
    title: 'New Event',
    start: detail.range.start,
    end: detail.range.end,
    color: '#0d6efd',
    ...(detail.resourceId ? { resourceId: detail.resourceId } : {}),
  };
  events.value = [...events.value, newEvent];
  // Per PRD scheduler-controlled-selection: the WC no longer auto-clears
  // its selection after `event-create`. Clear it here so a follow-up
  // gesture doesn't re-emit the same range.
  (e.target as MpScheduler).clearSelection();
}

function onEventDelete(e: Event) {
  const detail = (e as CustomEvent<{ event: SchedulerEvent }>).detail;
  events.value = events.value.filter((ev) => ev.id !== detail.event.id);
}

const SOURCE = `<BsScheduler
  :events="events"
  view="day"
  @event-create="(e) => {
    events = [...events, {
      id: generateEventId(), title: 'New Event',
      start: e.detail.range.start, end: e.detail.range.end,
      color: '#0d6efd',
    }];
    (e.target as MpScheduler).clearSelection();
  }"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Scheduler</h1>
    <p class="text-body-secondary">
      Calendar/agenda WC with day / week / month / year / timeline
      views. Drag across the grid to select a range — the WC emits
      <code>event-create</code> with the range; the consumer decides
      whether to materialise an event (or open a confirmation modal).
      Listen to events with the standard <code>@event-name</code>
      syntax.
    </p>

    <section style="height: 540px">
      <h2>Today's agenda</h2>
      <BsScheduler
        :events="events"
        view="day"
        style="display: block; height: 100%"
        @event-update="onEventUpdate"
        @event-create="onEventCreate"
        @event-delete="onEventDelete"
      />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

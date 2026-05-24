<script setup lang="ts">
import { ref } from 'vue';
import { BsScheduler } from '@mintplayer/vue-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import type { SchedulerEvent } from '@mintplayer/web-components/scheduler-core';

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

function onEventUpdate(e: CustomEvent<{ event: SchedulerEvent }>) {
  events.value = events.value.map((ev) =>
    ev.id === e.detail.event.id ? e.detail.event : ev,
  );
}

const SOURCE = `<BsScheduler :events="events" view="day" />`;
</script>

<template>
  <div class="demo-page">
    <h1>Scheduler</h1>
    <p class="text-body-secondary">
      Calendar/agenda WC with day / week / month / year / timeline
      views. Events emit a discriminated union of CustomEvents — listen
      to them with the standard <code>@event-name</code> syntax.
    </p>

    <section style="height: 540px">
      <h2>Today's agenda</h2>
      <BsScheduler
        :events="events"
        view="day"
        style="display: block; height: 100%"
        @event-update="onEventUpdate"
      />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

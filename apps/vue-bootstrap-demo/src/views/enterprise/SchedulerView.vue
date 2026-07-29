<script setup lang="ts">
import { ref } from 'vue';
import { BsScheduler } from '@mintplayer/vue-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import {
  generateEventId,
  type SchedulerEvent,
  type ViewType,
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

// `v-model:view` keeps the bound ref in sync with the WC's own view
// switcher — the scheduler emits `view-change`, the wrapper writes it
// back into this ref, so it always reflects the active view.
const view = ref<ViewType>('day');

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

const SOURCE = `<!-- v-model:view tracks the WC's own view switcher both ways -->
<BsScheduler
  :events="events"
  v-model:view="view"
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

    <details class="mb-2">
      <summary>Keyboard shortcuts</summary>
      <ul class="mb-0">
        <li><strong>Getting in</strong>: <kbd>Tab</kbd> walks the header, then the grid, then the events. Inside the grid the arrow keys walk cells.</li>
        <li><strong>Cell navigation</strong> — week / day: <kbd>↑</kbd> / <kbd>↓</kbd> move one time slot, <kbd>←</kbd> / <kbd>→</kbd> one day (week only). Timeline: <kbd>←</kbd> / <kbd>→</kbd> move one slot in time, <kbd>↑</kbd> / <kbd>↓</kbd> one resource. Month: <kbd>←</kbd> / <kbd>→</kbd> walk days, <kbd>↑</kbd> / <kbd>↓</kbd> one week. Year: <kbd>←</kbd> / <kbd>→</kbd> walk months, <kbd>↑</kbd> / <kbd>↓</kbd> three months. Crossing a month or year boundary advances the displayed period.</li>
        <li><strong>Jumps</strong>: <kbd>Home</kbd> / <kbd>End</kbd> first / last slot of the column · <kbd>Ctrl</kbd> + <kbd>Home</kbd> / <kbd>Ctrl</kbd> + <kbd>End</kbd> first / last cell of the view · <kbd>PageUp</kbd> / <kbd>PageDown</kbd> previous / next period</li>
        <li><strong>Selecting a range</strong>: <kbd>Shift</kbd> + arrow extends a time range, crossing day boundaries on the week view. <kbd>Esc</kbd> clears it.</li>
        <li><strong>Committing</strong>: <kbd>Enter</kbd> on a cell or a selection emits <code>event-create</code> carrying the range — a <em>request</em>, not a write. The scheduler stores nothing itself; this page's handler materialises the event and then calls <code>clearSelection()</code>.</li>
        <li><strong>On a focused event</strong>: <kbd>←</kbd> / <kbd>→</kbd> walk to the previous / next event by start time (no wrap) · <kbd>Delete</kbd> / <kbd>Backspace</kbd> emits <code>event-delete</code> · <kbd>Esc</kbd> returns focus to the grid</li>
        <li><strong>Move mode</strong>: <kbd>Enter</kbd> on a focused event enters it. Arrow keys nudge the event in time (or across resources on the timeline), <kbd>Shift</kbd> + arrow resizes the end edge, <kbd>Alt</kbd> + <kbd>Shift</kbd> + arrow resizes the start edge. <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels.</li>
        <li><strong>Views</strong>: <kbd>Alt</kbd> + <kbd>T</kbd> today · <kbd>Alt</kbd> + <kbd>Y</kbd> year · <kbd>Alt</kbd> + <kbd>M</kbd> month · <kbd>Alt</kbd> + <kbd>W</kbd> week · <kbd>Alt</kbd> + <kbd>D</kbd> day. These work from anywhere in the scheduler; bare letters are deliberately not hot-keys.</li>
      </ul>
    </details>

    <section style="height: 540px">
      <h2>Today's agenda</h2>
      <BsScheduler
        :events="events"
        v-model:view="view"
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

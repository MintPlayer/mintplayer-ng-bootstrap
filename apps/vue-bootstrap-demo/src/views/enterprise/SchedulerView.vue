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
  applyEventUpdate(detail.event);
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

// --- Event editor (double-click an event) --------------------------------
// The form is the single-pointer NON-DRAG path to change an event's times
// (WCAG 2.5.7 Dragging Movements): every resize possible by drag is also
// possible here. The WC deliberately doesn't own an editor — consumers do.
const editingEvent = ref<SchedulerEvent | null>(null);
const editTitle = ref('');
const editStart = ref('');
const editEnd = ref('');

function onEventDblClick(e: Event) {
  const detail = (e as CustomEvent<{ event: SchedulerEvent }>).detail;
  editingEvent.value = detail.event;
  editTitle.value = detail.event.title;
  editStart.value = toLocalInputValue(detail.event.start);
  editEnd.value = toLocalInputValue(detail.event.end);
}

function saveEditor() {
  const editing = editingEvent.value;
  const start = new Date(editStart.value);
  const end = new Date(editEnd.value);
  if (!editing || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;
  applyEventUpdate({ ...editing, title: editTitle.value, start, end });
  editingEvent.value = null;
}

function closeEditor() {
  editingEvent.value = null;
}

// Replace the event by id, assigning a NEW array so the wrapper re-syncs.
// This page binds only the flat `events` list (no resource tree), so one
// map covers every event the WC can show.
function applyEventUpdate(updated: SchedulerEvent) {
  events.value = events.value.map((ev) => (ev.id === updated.id ? updated : ev));
}

/** Date → value for `<input type="datetime-local">` (local time, minutes). */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
        <li><strong>Move mode</strong>: <kbd>M</kbd> or <kbd>Enter</kbd> on a focused event enters move mode. Arrow keys nudge the event in time (or across resources on the timeline), <kbd>Shift</kbd> + arrow resizes the end edge, <kbd>Alt</kbd> + <kbd>Shift</kbd> + arrow resizes the start edge. <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels.</li>
        <li><strong>Touch resize</strong>: tap an event to select it, then drag the round handle at its top or bottom edge (left/right on timeline) — the resize starts immediately, no hold needed. Moving an event by touch stays hold-then-drag (600&nbsp;ms).</li>
        <li><strong>Mouse resize</strong>: drag the top or bottom edge of any resizable event (selected or not); the selected event shows the round handles as the visual affordance.</li>
        <li><strong>Edit without dragging</strong>: double-click / double-tap an event to edit its title and start/end times in a form — the single-pointer, non-drag alternative (WCAG 2.5.7).</li>
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
        @event-dblclick="onEventDblClick"
      />
    </section>

    <section v-if="editingEvent" class="edit-event-panel">
      <h2>Edit event</h2>
      <form class="edit-event-form" @submit.prevent="saveEditor">
        <label for="edit-event-title">Title</label>
        <input id="edit-event-title" v-model="editTitle" type="text" />
        <label for="edit-event-start">Start</label>
        <input id="edit-event-start" v-model="editStart" type="datetime-local" />
        <label for="edit-event-end">End</label>
        <input id="edit-event-end" v-model="editEnd" type="datetime-local" />
        <div class="edit-event-actions">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn btn-secondary" @click="closeEditor">Cancel</button>
        </div>
      </form>
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
.edit-event-form {
  max-width: 24rem;
}

.edit-event-form label {
  display: block;
  font-weight: 600;
  font-size: 0.85rem;
}

.edit-event-form input {
  display: block;
  width: 100%;
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 4px;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
}

.edit-event-actions {
  display: flex;
  gap: 0.5rem;
}
</style>

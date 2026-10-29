<script setup lang="ts">
import { ref } from 'vue';
import { BsScheduler } from '@mintplayer/vue-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';
import {
  generateEventId,
  generateGroupId,
  generateResourceId,
  type Resource,
  type ResourceGroup,
  type SchedulerEvent,
  type SchedulerOptions,
  type ViewType,
} from '@mintplayer/ui-core/scheduler-core';
import type {
  SchedulerEventCreateDetail,
  SchedulerEventDeleteDetail,
  SchedulerEventUpdateDetail,
  SchedulerGroupCreateDetail,
  SchedulerResourceCreateDetail,
  SchedulerResourceDeleteDetail,
  SchedulerResourceUpdateDetail,
  TimeRange,
} from '@mintplayer/vue-bootstrap/scheduler';

const today = new Date();
const at = (h: number, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d;
};

const events = ref<SchedulerEvent[]>([
  { id: '1', title: 'Standup',       start: at(9),  end: at(9, 30), color: '#0d6efd' },
  { id: '2', title: 'Design review', start: at(11), end: at(12),    color: '#6f42c1' },
  // Assigned to a resource, so the timeline has something on Alice's row while
  // the two above land in its "(No resource)" bucket.
  { id: '3', title: 'Lunch',         start: at(12), end: at(13),    resourceId: 'alice' },
]);

// A resource tree so the timeline view is exercised at all — this page used to
// leave `resources` unbound, which made its timeline permanently blank.
const resources = ref<(Resource | ResourceGroup)[]>([
  {
    id: 'engineering',
    title: 'Engineering',
    children: [
      { id: 'alice', title: 'Alice' },
      { id: 'bob', title: 'Bob', color: '#fd7e14' },
    ],
  },
]);

const options: Partial<SchedulerOptions> = {
  moreLinkBehavior: 'popover',
  // Resource-tree editing is off in the component by default; this opts in.
  permissions: {
    createResource: true,
    createGroup: true,
    updateResource: true,
    deleteResource: true,
  },
};

/** Insert at root when `parentId` is absent, else into that group. */
function insertInto(
  items: (Resource | ResourceGroup)[],
  parentId: string | undefined,
  added: Resource | ResourceGroup,
): (Resource | ResourceGroup)[] {
  if (!parentId) return [...items, added];
  return items.map((item) =>
    'children' in item
      ? item.id === parentId
        ? { ...item, children: [...item.children, added] }
        : { ...item, children: insertInto(item.children, parentId, added) }
      : item,
  );
}

// Resource-tree requests. Like `eventcreate` these are asks, not writes: the
// scheduler never edits its own `resources`, so the id and initial colour are ours.
// New ARRAY each time — the wrapper watches by reference, matching Lit.
function onResourceCreate({ parentId }: SchedulerResourceCreateDetail) {
  resources.value = insertInto(resources.value, parentId, {
    id: generateResourceId(),
    title: 'New resource',
    color: '#20c997',
  });
}

function onGroupCreate({ parentId }: SchedulerGroupCreateDetail) {
  resources.value = insertInto(resources.value, parentId, {
    id: generateGroupId(),
    title: 'New group',
    children: [],
  });
}

function onResourceUpdate({ resource, changes }: SchedulerResourceUpdateDetail) {
  const apply = (item: Resource | ResourceGroup): Resource | ResourceGroup =>
    item.id === resource.id
      ? { ...item, ...changes }
      : 'children' in item
        ? { ...item, children: item.children.map(apply) }
        : item;
  resources.value = resources.value.map(apply);
}

function onResourceDelete({ resource }: SchedulerResourceDeleteDetail) {
  const prune = (items: (Resource | ResourceGroup)[]): (Resource | ResourceGroup)[] =>
    items
      .filter((item) => item.id !== resource.id)
      .map((item) => ('children' in item ? { ...item, children: prune(item.children) } : item));
  resources.value = prune(resources.value);
  // Move the deleted subtree's events to "(No resource)" instead of leaving
  // them dangling — the scheduler buckets dangling ids defensively (with a console
  // warning); this keeps the data honest.
  const removed = new Set<string>();
  const collect = (item: Resource | ResourceGroup): void => {
    removed.add(item.id);
    if ('children' in item) item.children.map(collect);
  };
  collect(resource);
  events.value = events.value.map((ev) => {
    if (!ev.resourceId || !removed.has(ev.resourceId)) return ev;
    const copy = { ...ev };
    delete copy.resourceId;
    return copy;
  });
}

// `v-model:view` / `v-model:date` / `v-model:selectedRange` keep the bound
// refs in sync with the scheduler's own view switcher, its prev/next/today
// navigation and its range selection.
const view = ref<ViewType>('day');
const date = ref(new Date());
const range = ref<TimeRange | null>(null);

function onEventUpdate(detail: SchedulerEventUpdateDetail) {
  applyEventUpdate(detail.event);
}

function onEventCreate(detail: SchedulerEventCreateDetail) {
  const newEvent: SchedulerEvent = {
    id: generateEventId(),
    title: 'New Event',
    start: detail.range.start,
    end: detail.range.end,
    // No colour: the event inherits its resource's colour (or the default)
    // via resolveEventColor — stamping one here would defeat resource
    // colouring for every created event.
    ...(detail.resourceId ? { resourceId: detail.resourceId } : {}),
  };
  events.value = [...events.value, newEvent];
  // The scheduler keeps its selection after a create request; clearing the
  // two-way range clears it, so a follow-up gesture starts fresh.
  range.value = null;
}

function onEventDelete(detail: SchedulerEventDeleteDetail) {
  events.value = events.value.filter((ev) => ev.id !== detail.event.id);
}

// No app-owned editor here: the scheduler's BUILT-IN event editor (phase 2, on by
// default) handles double-click / right-click / F2 — Save arrives as the same
// `eventupdate` this page already applies, Delete as `eventdelete`. The
// React demo shows the `eventEditor: false` escape hatch with its own form.

// Replace the event by id, assigning a NEW array so the wrapper re-syncs.
// This page binds only the flat `events` list (no resource tree), so one
// map covers every event the scheduler can show.
function applyEventUpdate(updated: SchedulerEvent) {
  events.value = events.value.map((ev) => (ev.id === updated.id ? updated : ev));
}

const SOURCE = `<!-- view, date and selectedRange are two-way (v-model) -->
<BsScheduler
  :events="events"
  v-model:view="view"
  v-model:date="date"
  v-model:selectedRange="range"
  @eventcreate="(e) => {
    events = [...events, {
      id: generateEventId(), title: 'New Event',
      start: e.range.start, end: e.range.end,
    }];
    range = null; // clears the scheduler's selection
  }"
/>`;
</script>

<template>
  <div class="demo-page">
    <h1>Scheduler</h1>
    <p class="text-body-secondary">
      Calendar/agenda with day / week / month / year / timeline
      views. Drag across the grid to select a range — the scheduler emits
      <code>eventcreate</code> with the range; the consumer decides
      whether to materialise an event (or open a confirmation modal).
      Every emit carries its payload directly (<code>@eventcreate</code>,
      <code>@eventdelete</code>, …).
    </p>

    <details class="mb-2">
      <summary>Keyboard shortcuts</summary>
      <ul class="mb-0">
        <li><strong>Getting in</strong>: <kbd>Tab</kbd> walks the header, then the grid, then the events. Inside the grid the arrow keys walk cells.</li>
        <li><strong>Cell navigation</strong> — week / day: <kbd>↑</kbd> / <kbd>↓</kbd> move one time slot, <kbd>←</kbd> / <kbd>→</kbd> one day (week only). Timeline: <kbd>←</kbd> / <kbd>→</kbd> move one slot in time, <kbd>↑</kbd> / <kbd>↓</kbd> one resource. Month: <kbd>←</kbd> / <kbd>→</kbd> walk days, <kbd>↑</kbd> / <kbd>↓</kbd> one week. Year: <kbd>←</kbd> / <kbd>→</kbd> walk months, <kbd>↑</kbd> / <kbd>↓</kbd> three months. Crossing a month or year boundary advances the displayed period.</li>
        <li><strong>Jumps</strong>: <kbd>Home</kbd> / <kbd>End</kbd> first / last slot of the column · <kbd>Ctrl</kbd> + <kbd>Home</kbd> / <kbd>Ctrl</kbd> + <kbd>End</kbd> first / last cell of the view · <kbd>PageUp</kbd> / <kbd>PageDown</kbd> previous / next period</li>
        <li><strong>Selecting a range</strong>: <kbd>Shift</kbd> + arrow extends a time range, crossing day boundaries on the week view. <kbd>Esc</kbd> clears it.</li>
        <li><strong>Committing</strong>: <kbd>Enter</kbd> on a cell or a selection emits <code>eventcreate</code> carrying the range — a <em>request</em>, not a write. The scheduler stores nothing itself; this page's handler materialises the event and then clears the two-way <code>selectedRange</code>.</li>
        <li><strong>On a focused event</strong>: <kbd>←</kbd> / <kbd>→</kbd> walk to the previous / next event by start time (no wrap) · <kbd>Delete</kbd> / <kbd>Backspace</kbd> emits <code>eventdelete</code> · <kbd>Esc</kbd> returns focus to the grid</li>
        <li><strong>Move mode</strong>: <kbd>M</kbd> or <kbd>Enter</kbd> on a focused event enters move mode. Arrow keys nudge the event in time (or across resources on the timeline), <kbd>Shift</kbd> + arrow resizes the end edge, <kbd>Alt</kbd> + <kbd>Shift</kbd> + arrow resizes the start edge. <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels.</li>
        <li><strong>Touch resize</strong>: tap an event to select it, then drag the round handle at its top or bottom edge (left/right on timeline) — the resize starts immediately, no hold needed. Moving an event by touch stays hold-then-drag (600&nbsp;ms).</li>
        <li><strong>Mouse resize</strong>: drag the top or bottom edge of any resizable event (selected or not); the selected event shows the round handles as the visual affordance.</li>
        <li><strong>Edit without dragging</strong>: double-click / double-tap, right-click, or <kbd>F2</kbd> on an event opens the scheduler's <em>built-in editor</em> (title, start/end, colour, delete) — the single-pointer, non-drag alternative (WCAG 2.5.7). Disable it with <code>:event-editor="false"</code> to bring your own form.</li>
        <li><strong>Views</strong>: <kbd>Alt</kbd> + <kbd>T</kbd> today · <kbd>Alt</kbd> + <kbd>Y</kbd> year · <kbd>Alt</kbd> + <kbd>M</kbd> month · <kbd>Alt</kbd> + <kbd>W</kbd> week · <kbd>Alt</kbd> + <kbd>D</kbd> day. These work from anywhere in the scheduler; bare letters are deliberately not hot-keys.</li>
      </ul>
    </details>

    <section class="scheduler-demo-section">
      <h2>Today's agenda</h2>
      <BsScheduler
        :events="events"
        :resources="resources"
        :options="options"
        v-model:view="view"
        v-model:date="date"
        v-model:selectedRange="range"
        class="scheduler-demo"
        @eventupdate="onEventUpdate"
        @eventcreate="onEventCreate"
        @eventdelete="onEventDelete"
        @resourcecreate="onResourceCreate"
        @groupcreate="onGroupCreate"
        @resourceupdate="onResourceUpdate"
        @resourcedelete="onResourceDelete"
      />
    </section>

    <section>
      <h2>Source</h2>
      <BsCodeSnippet :code="SOURCE" language="html" />
    </section>
  </div>
</template>

<style scoped>
.scheduler-demo-section {
  height: 540px;
}

.scheduler-demo {
  display: block;
  height: 100%;
}
</style>

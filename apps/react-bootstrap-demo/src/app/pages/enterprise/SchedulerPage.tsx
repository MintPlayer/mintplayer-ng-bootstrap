import { useState } from 'react';
import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import {
  generateEventId,
  generateGroupId,
  generateResourceId,
  type Resource,
  type ResourceGroup,
  type SchedulerEvent,
  type SchedulerOptions,
  type ViewType,
} from '@mintplayer/web-components/scheduler-core';
import type { MpScheduler } from '@mintplayer/web-components/scheduler';
import './SchedulerPage.css';

const today = new Date();
const at = (h: number, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Date → value for `<input type="datetime-local">` (local time, minutes). */
const toLocalInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const SEED: SchedulerEvent[] = [
  { id: '1', title: 'Standup',       start: at(9),  end: at(9, 30), color: '#0d6efd' },
  { id: '2', title: 'Design review', start: at(11), end: at(12),    color: '#6f42c1' },
  // Assigned to a resource, so the timeline view has something on Alice's row
  // while the two above land in its "(No resource)" bucket.
  { id: '3', title: 'Lunch',         start: at(12), end: at(13),    resourceId: 'alice' },
];

// A resource tree so the timeline view is actually exercised — this page used
// to leave `resources` unbound, which made its timeline permanently blank.
// Alice has no colour of her own, so her events inherit the group-less default;
// Bob's colour flows through to every view via `Resource.color`.
const RESOURCE_SEED: (Resource | ResourceGroup)[] = [
  {
    id: 'engineering',
    title: 'Engineering',
    children: [
      { id: 'alice', title: 'Alice' },
      { id: 'bob', title: 'Bob', color: '#fd7e14' },
    ],
  },
];

// Module constant, NOT an inline literal: @lit/react re-asserts element
// properties on every render, so a fresh object here would re-set `options` on
// the WC (and re-resolve its permission table) on every keystroke elsewhere.
const OPTIONS: Partial<SchedulerOptions> = {
  moreLinkBehavior: 'popover',
  // Resource-tree editing is off in the component by default; this is opting in.
  permissions: {
    createResource: true,
    createGroup: true,
    updateResource: true,
    deleteResource: true,
  },
};

/** Insert at root when `parentId` is absent, else into that group. */
const insertInto = (
  items: (Resource | ResourceGroup)[],
  parentId: string | undefined,
  added: Resource | ResourceGroup,
): (Resource | ResourceGroup)[] => {
  if (!parentId) return [...items, added];
  return items.map((item) =>
    'children' in item
      ? item.id === parentId
        ? { ...item, children: [...item.children, added] }
        : { ...item, children: insertInto(item.children, parentId, added) }
      : item,
  );
};

const SOURCE = `// \`view\` and \`date\` are controlled props: @lit/react re-asserts
// element properties on every render, and the WC changes both from
// within (view switcher, prev/next/today navigation) — pair them with
// onViewChange (the React equivalent of Angular's [(view)]/[(date)]),
// whose detail carries both, or a re-render would clobber a WC-driven
// change back to the stale literal.
const [view, setView] = useState<ViewType>('day');
const [date, setDate] = useState(new Date());

<BsScheduler
  events={events}
  view={view}
  date={date}
  onViewChange={e => { setView(e.detail.view); setDate(e.detail.date); }}
  onEventCreate={e => {
    setEvents([...events, {
      id: generateEventId(), title: 'New Event',
      start: e.detail.range.start, end: e.detail.range.end,
      color: '#0d6efd',
    }]);
    (e.target as MpScheduler).clearSelection();
  }}
/>`;

export function SchedulerPage() {
  const [events, setEvents] = useState<SchedulerEvent[]>(SEED);
  // Controlled view + date. @lit/react re-applies element properties on
  // every render without dirty-checking, so both must track the WC's own
  // changes (via onViewChange, which fires for date navigation too) —
  // otherwise a re-render after a drag or a prev/next click would
  // re-assert a stale literal and snap the scheduler back.
  const [view, setView] = useState<ViewType>('day');
  const [date, setDate] = useState(new Date());
  const [resources, setResources] = useState<(Resource | ResourceGroup)[]>(RESOURCE_SEED);

  // Double-click editor — the single-pointer, NON-DRAG path to change an
  // event's times (WCAG 2.5.7 Dragging Movements): every resize possible by
  // drag is also possible here. The WC deliberately doesn't own an editor —
  // consumers do.
  const [editingEvent, setEditingEvent] = useState<SchedulerEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const openEditor = (event: SchedulerEvent) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditStart(toLocalInputValue(event.start));
    setEditEnd(toLocalInputValue(event.end));
  };

  const closeEditor = () => setEditingEvent(null);

  const saveEditor = () => {
    const start = new Date(editStart);
    const end = new Date(editEnd);
    if (!editingEvent || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;
    const updated: SchedulerEvent = { ...editingEvent, title: editTitle, start, end };
    setEvents((current) => current.map((ev) => (ev.id === updated.id ? updated : ev)));
    setEditingEvent(null);
  };

  return (
    <div className="demo-page">
      <h1>Scheduler</h1>
      <p className="text-body-secondary">
        Calendar/agenda WC with day / week / month / year / timeline
        views. Drag across the grid to select a range — the WC emits
        <code> event-create</code> with the range; the consumer decides
        whether to materialise an event (or open a confirmation modal).
        Events emit a discriminated union of CustomEvents — each mapped
        onto a typed React <code>on*</code> prop.
      </p>

      <details className="mb-2">
        <summary>Keyboard shortcuts</summary>
        <ul className="mb-0">
          <li><strong>Getting in</strong>: <kbd>Tab</kbd> walks the header, then the grid, then the events. Inside the grid the arrow keys walk cells.</li>
          <li><strong>Cell navigation</strong> — week / day: <kbd>↑</kbd> / <kbd>↓</kbd> move one time slot, <kbd>←</kbd> / <kbd>→</kbd> one day (week only). Timeline: <kbd>←</kbd> / <kbd>→</kbd> move one slot in time, <kbd>↑</kbd> / <kbd>↓</kbd> one resource. Month: <kbd>←</kbd> / <kbd>→</kbd> walk days, <kbd>↑</kbd> / <kbd>↓</kbd> one week. Year: <kbd>←</kbd> / <kbd>→</kbd> walk months, <kbd>↑</kbd> / <kbd>↓</kbd> three months. Crossing a month or year boundary advances the displayed period.</li>
          <li><strong>Jumps</strong>: <kbd>Home</kbd> / <kbd>End</kbd> first / last slot of the column · <kbd>Ctrl</kbd> + <kbd>Home</kbd> / <kbd>Ctrl</kbd> + <kbd>End</kbd> first / last cell of the view · <kbd>PageUp</kbd> / <kbd>PageDown</kbd> previous / next period</li>
          <li><strong>Selecting a range</strong>: <kbd>Shift</kbd> + arrow extends a time range, crossing day boundaries on the week view. <kbd>Esc</kbd> clears it.</li>
          <li><strong>Committing</strong>: <kbd>Enter</kbd> on a cell or a selection emits <code>event-create</code> carrying the range — a <em>request</em>, not a write. The scheduler stores nothing itself; this page's handler materialises the event and then calls <code>clearSelection()</code>.</li>
          <li><strong>On a focused event</strong>: <kbd>←</kbd> / <kbd>→</kbd> walk to the previous / next event by start time (no wrap) · <kbd>Delete</kbd> / <kbd>Backspace</kbd> emits <code>event-delete</code> · <kbd>Esc</kbd> returns focus to the grid</li>
          <li><strong>Move mode</strong>: <kbd>M</kbd> or <kbd>Enter</kbd> on a focused event enters move mode. Arrow keys nudge the event in time (or across resources on the timeline), <kbd>Shift</kbd> + arrow resizes the end edge, <kbd>Alt</kbd> + <kbd>Shift</kbd> + arrow resizes the start edge. <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels.</li>
          <li><strong>Touch resize</strong>: tap an event to select it, then drag the round handle at its top or bottom edge (left / right on the timeline) — the resize starts immediately, no hold needed. Moving an event by touch stays hold-then-drag (600&nbsp;ms).</li>
          <li><strong>Mouse resize</strong>: drag the top or bottom edge of any resizable event (selected or not); the selected event shows the round handles as the visual affordance.</li>
          <li><strong>Edit without dragging</strong>: double-click / double-tap an event to edit its title and start / end times in a form — the single-pointer, non-drag alternative (WCAG 2.5.7).</li>
          <li><strong>Views</strong>: <kbd>Alt</kbd> + <kbd>T</kbd> today · <kbd>Alt</kbd> + <kbd>Y</kbd> year · <kbd>Alt</kbd> + <kbd>M</kbd> month · <kbd>Alt</kbd> + <kbd>W</kbd> week · <kbd>Alt</kbd> + <kbd>D</kbd> day. These work from anywhere in the scheduler; bare letters are deliberately not hot-keys.</li>
        </ul>
      </details>

      <section style={{ height: 540 }}>
        <h2>Today's agenda</h2>
        <BsScheduler
          {...{ events, view, date, resources, options: OPTIONS } as React.ComponentProps<
            typeof BsScheduler
          >}
          onViewChange={(e) => {
            setView(e.detail.view);
            setDate(e.detail.date);
          }}
          onEventDblClick={(e) => openEditor(e.detail.event)}
          onEventUpdate={(e) => {
            setEvents((current) =>
              current.map((ev) => (ev.id === e.detail.event.id ? e.detail.event : ev)),
            );
          }}
          onEventCreate={(e) => {
            const newEvent: SchedulerEvent = {
              id: generateEventId(),
              title: 'New Event',
              start: e.detail.range.start,
              end: e.detail.range.end,
              color: '#0d6efd',
              ...(e.detail.resourceId ? { resourceId: e.detail.resourceId } : {}),
            };
            setEvents((current) => [...current, newEvent]);
            // Per PRD scheduler-controlled-selection: the WC no longer auto-
            // clears its selection after `event-create`. Clear it here so a
            // follow-up gesture doesn't re-emit the same range.
            (e.target as MpScheduler).clearSelection();
          }}
          onEventDelete={(e) =>
            setEvents((current) => current.filter((ev) => ev.id !== e.detail.event.id))
          }
          // Resource-tree requests: like event-create these are asks, not
          // writes. The WC never edits its own `resources`, so the id and the
          // initial colour are the consumer's to choose.
          onResourceCreate={(e) =>
            setResources((current) =>
              insertInto(current, e.detail.parentId, {
                id: generateResourceId(),
                title: 'New resource',
                color: '#20c997',
              }),
            )
          }
          onGroupCreate={(e) =>
            setResources((current) =>
              insertInto(current, e.detail.parentId, {
                id: generateGroupId(),
                title: 'New group',
                children: [],
              }),
            )
          }
          onResourceUpdate={(e) => {
            const apply = (item: Resource | ResourceGroup): Resource | ResourceGroup =>
              item.id === e.detail.resource.id
                ? { ...item, ...e.detail.changes }
                : 'children' in item
                  ? { ...item, children: item.children.map(apply) }
                  : item;
            setResources((current) => current.map(apply));
          }}
          onResourceDelete={(e) => {
            const prune = (items: (Resource | ResourceGroup)[]): (Resource | ResourceGroup)[] =>
              items
                .filter((item) => item.id !== e.detail.resource.id)
                .map((item) =>
                  'children' in item ? { ...item, children: prune(item.children) } : item,
                );
            setResources((current) => prune(current));
          }}
          style={{ display: 'block', height: '100%' }}
        />
      </section>

      {editingEvent && (
        <section className="edit-event-form">
          <h2>Edit event</h2>
          <label htmlFor="edit-event-title">Title</label>
          <input
            id="edit-event-title"
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <label htmlFor="edit-event-start">Start</label>
          <input
            id="edit-event-start"
            type="datetime-local"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
          />
          <label htmlFor="edit-event-end">End</label>
          <input
            id="edit-event-end"
            type="datetime-local"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
          />
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-primary" onClick={saveEditor}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={closeEditor}>Cancel</button>
          </div>
        </section>
      )}

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

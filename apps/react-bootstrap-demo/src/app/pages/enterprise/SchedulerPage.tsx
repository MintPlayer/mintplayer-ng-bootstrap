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
  type TimeRange,
  type ViewType,
} from '@mintplayer/ui-core/scheduler-core';
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

// Module constant, NOT an inline literal: a fresh object on every render is a
// new `options` input, which re-resolves the permission table each time.
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

const SOURCE = `// view, date and selectedRange are two-way: pass the value and take it
// back from on<Name>Change, like any controlled React input.
const [view, setView] = useState<ViewType>('day');
const [date, setDate] = useState(new Date());
const [range, setRange] = useState<TimeRange | null>(null);

<BsScheduler
  events={events}
  view={view} onViewChange={setView}
  date={date} onDateChange={setDate}
  selectedRange={range} onSelectedRangeChange={setRange}
  onEventCreate={e => {
    setEvents([...events, {
      id: generateEventId(), title: 'New Event',
      start: e.range.start, end: e.range.end,
      color: '#0d6efd',
    }]);
    setRange(null); // clears the scheduler's selection
  }}
/>`;

export function SchedulerPage() {
  const [events, setEvents] = useState<SchedulerEvent[]>(SEED);
  // Two-way inputs, controlled: each takes its value back from on<Name>Change.
  const [view, setView] = useState<ViewType>('day');
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState<TimeRange | null>(null);
  const [resources, setResources] = useState<(Resource | ResourceGroup)[]>(RESOURCE_SEED);

  // App-owned double-click editor. Since phase 2 the WC ships its OWN editor
  // (on by default); this page passes `eventEditor={false}` and keeps its form
  // as the ESCAPE-HATCH recipe — `event-dblclick` keeps firing either way, so
  // this wiring is everything a consumer needs to replace the built-in one.
  // (The Angular demo shows the built-in editor; between them both paths stay
  // exercised.)
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
        Calendar/agenda with day / week / month / year / timeline
        views. Drag across the grid to select a range — the scheduler calls
        <code> onEventCreate</code> with the range; the consumer decides
        whether to materialise an event (or open a confirmation modal).
        Every output is a typed React <code>on*</code> prop that receives
        its payload directly.
      </p>

      <details className="mb-2">
        <summary>Keyboard shortcuts</summary>
        <ul className="mb-0">
          <li><strong>Getting in</strong>: <kbd>Tab</kbd> walks the header, then the grid, then the events. Inside the grid the arrow keys walk cells.</li>
          <li><strong>Cell navigation</strong> — week / day: <kbd>↑</kbd> / <kbd>↓</kbd> move one time slot, <kbd>←</kbd> / <kbd>→</kbd> one day (week only). Timeline: <kbd>←</kbd> / <kbd>→</kbd> move one slot in time, <kbd>↑</kbd> / <kbd>↓</kbd> one resource. Month: <kbd>←</kbd> / <kbd>→</kbd> walk days, <kbd>↑</kbd> / <kbd>↓</kbd> one week. Year: <kbd>←</kbd> / <kbd>→</kbd> walk months, <kbd>↑</kbd> / <kbd>↓</kbd> three months. Crossing a month or year boundary advances the displayed period.</li>
          <li><strong>Jumps</strong>: <kbd>Home</kbd> / <kbd>End</kbd> first / last slot of the column · <kbd>Ctrl</kbd> + <kbd>Home</kbd> / <kbd>Ctrl</kbd> + <kbd>End</kbd> first / last cell of the view · <kbd>PageUp</kbd> / <kbd>PageDown</kbd> previous / next period</li>
          <li><strong>Selecting a range</strong>: <kbd>Shift</kbd> + arrow extends a time range, crossing day boundaries on the week view. <kbd>Esc</kbd> clears it.</li>
          <li><strong>Committing</strong>: <kbd>Enter</kbd> on a cell or a selection emits <code>onEventCreate</code> carrying the range — a <em>request</em>, not a write. The scheduler stores nothing itself; this page's handler materialises the event and then clears the two-way <code>selectedRange</code>.</li>
          <li><strong>On a focused event</strong>: <kbd>←</kbd> / <kbd>→</kbd> walk to the previous / next event by start time (no wrap) · <kbd>Delete</kbd> / <kbd>Backspace</kbd> emits <code>onEventDelete</code> · <kbd>Esc</kbd> returns focus to the grid</li>
          <li><strong>Move mode</strong>: <kbd>M</kbd> or <kbd>Enter</kbd> on a focused event enters move mode. Arrow keys nudge the event in time (or across resources on the timeline), <kbd>Shift</kbd> + arrow resizes the end edge, <kbd>Alt</kbd> + <kbd>Shift</kbd> + arrow resizes the start edge. <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels.</li>
          <li><strong>Touch resize</strong>: tap an event to select it, then drag the round handle at its top or bottom edge (left / right on the timeline) — the resize starts immediately, no hold needed. Moving an event by touch stays hold-then-drag (600&nbsp;ms).</li>
          <li><strong>Mouse resize</strong>: drag the top or bottom edge of any resizable event (selected or not); the selected event shows the round handles as the visual affordance.</li>
          <li><strong>Edit without dragging</strong>: double-click / double-tap an event to edit its title and start / end times in a form — the single-pointer, non-drag alternative (WCAG 2.5.7). This page passes <code>eventEditor=&#123;false&#125;</code> and brings its own form (the escape hatch); with the default, the scheduler's built-in editor opens instead (also via right-click or <kbd>F2</kbd>).</li>
          <li><strong>Views</strong>: <kbd>Alt</kbd> + <kbd>T</kbd> today · <kbd>Alt</kbd> + <kbd>Y</kbd> year · <kbd>Alt</kbd> + <kbd>M</kbd> month · <kbd>Alt</kbd> + <kbd>W</kbd> week · <kbd>Alt</kbd> + <kbd>D</kbd> day. These work from anywhere in the scheduler; bare letters are deliberately not hot-keys.</li>
        </ul>
      </details>

      <section className="scheduler-demo-section">
        <h2>Today's agenda</h2>
        <BsScheduler
          events={events}
          resources={resources}
          options={OPTIONS}
          eventEditor={false}
          view={view}
          onViewChange={setView}
          date={date}
          onDateChange={setDate}
          selectedRange={range}
          onSelectedRangeChange={setRange}
          onEventDblClick={(e) => openEditor(e.event)}
          onEventUpdate={(e) => {
            setEvents((current) =>
              current.map((ev) => (ev.id === e.event.id ? e.event : ev)),
            );
          }}
          onEventCreate={(e) => {
            const newEvent: SchedulerEvent = {
              id: generateEventId(),
              title: 'New Event',
              start: e.range.start,
              end: e.range.end,
              // No colour: the event inherits its resource's colour (or the
              // default) via resolveEventColor — stamping one here would
              // defeat resource colouring for every created event.
              ...(e.resourceId ? { resourceId: e.resourceId } : {}),
            };
            setEvents((current) => [...current, newEvent]);
            // The scheduler keeps its selection after a create request; clearing
            // the two-way range clears it, so a follow-up gesture starts fresh.
            setRange(null);
          }}
          onEventDelete={(e) =>
            setEvents((current) => current.filter((ev) => ev.id !== e.event.id))
          }
          // Resource-tree requests: like event-create these are asks, not
          // writes. The scheduler never edits its own `resources`, so the id and the
          // initial colour are the consumer's to choose.
          onResourceCreate={(e) =>
            setResources((current) =>
              insertInto(current, e.parentId, {
                id: generateResourceId(),
                title: 'New resource',
                color: '#20c997',
              }),
            )
          }
          onGroupCreate={(e) =>
            setResources((current) =>
              insertInto(current, e.parentId, {
                id: generateGroupId(),
                title: 'New group',
                children: [],
              }),
            )
          }
          onResourceUpdate={(e) => {
            const apply = (item: Resource | ResourceGroup): Resource | ResourceGroup =>
              item.id === e.resource.id
                ? { ...item, ...e.changes }
                : 'children' in item
                  ? { ...item, children: item.children.map(apply) }
                  : item;
            setResources((current) => current.map(apply));
          }}
          onResourceDelete={(e) => {
            const prune = (items: (Resource | ResourceGroup)[]): (Resource | ResourceGroup)[] =>
              items
                .filter((item) => item.id !== e.resource.id)
                .map((item) =>
                  'children' in item ? { ...item, children: prune(item.children) } : item,
                );
            setResources((current) => prune(current));
            // Move the deleted subtree's events to "(No resource)" instead of
            // leaving them dangling (the scheduler buckets dangling ids defensively,
            // with a console warning — this keeps the data honest).
            const removed = new Set<string>();
            const collect = (item: Resource | ResourceGroup): void => {
              removed.add(item.id);
              if ('children' in item) item.children.map(collect);
            };
            collect(e.resource);
            setEvents((current) =>
              current.map((ev) => {
                if (!ev.resourceId || !removed.has(ev.resourceId)) return ev;
                const copy = { ...ev };
                delete copy.resourceId;
                return copy;
              }),
            );
          }}
          className="scheduler-demo"
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

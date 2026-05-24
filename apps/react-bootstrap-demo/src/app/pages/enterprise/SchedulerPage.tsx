import { useState } from 'react';
import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type { SchedulerEvent } from '@mintplayer/web-components/scheduler-core';

const today = new Date();
const at = (h: number, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d;
};

const SEED: SchedulerEvent[] = [
  { id: '1', title: 'Standup',       start: at(9),  end: at(9, 30), color: '#0d6efd' },
  { id: '2', title: 'Design review', start: at(11), end: at(12),    color: '#6f42c1' },
  { id: '3', title: 'Lunch',         start: at(12), end: at(13),    color: '#198754' },
];

const SOURCE = `<BsScheduler events={EVENTS} view="day" />`;

export function SchedulerPage() {
  const [events, setEvents] = useState<SchedulerEvent[]>(SEED);

  return (
    <div className="demo-page">
      <h1>Scheduler</h1>
      <p className="text-body-secondary">
        Calendar/agenda WC with day / week / month / year / timeline
        views. Events emit a discriminated union of CustomEvents — each
        mapped onto a typed React <code>on*</code> prop.
      </p>

      <section style={{ height: 540 }}>
        <h2>Today's agenda</h2>
        <BsScheduler
          {...{ events, view: 'day' } as React.ComponentProps<typeof BsScheduler>}
          onEventUpdate={(e) => {
            setEvents((current) =>
              current.map((ev) => (ev.id === e.detail.event.id ? e.detail.event : ev)),
            );
          }}
          style={{ display: 'block', height: '100%' }}
        />
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

import { useState } from 'react';
import { BsCalendar } from '@mintplayer/react-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = '<BsCalendar selectedDate={selectedDate} onSelectedDateChange={setSelectedDate} />';

export function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  return (
    <div className="demo-page">
      <h1>Calendar</h1>
      <p className="text-body-secondary">
        Accessible month-grid date picker with full keyboard navigation, generated
        from one source for Angular, React, Vue and Lit.
      </p>

      <details className="mb-2">
        <summary>Keyboard shortcuts</summary>
        <ul className="mb-0">
          <li><kbd>Tab</kbd> — focus previous-month → grid → next-month</li>
          <li><kbd>←</kbd> / <kbd>→</kbd> — previous / next day</li>
          <li><kbd>↑</kbd> / <kbd>↓</kbd> — previous / next week</li>
          <li><kbd>Home</kbd> / <kbd>End</kbd> — first / last day of the focused week</li>
          <li><kbd>PageUp</kbd> / <kbd>PageDown</kbd> — previous / next month</li>
          <li><kbd>Ctrl</kbd> + <kbd>PageUp</kbd> / <kbd>Ctrl</kbd> + <kbd>PageDown</kbd> — previous / next year</li>
          <li><kbd>Enter</kbd> / <kbd>Space</kbd> — select the focused day</li>
        </ul>
      </details>

      <section>
        <h2>Default</h2>
        <BsCalendar selectedDate={selectedDate} onSelectedDateChange={setSelectedDate} />
        <p className="text-body-secondary mt-2">
          Selected: <code>{selectedDate?.toDateString()}</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

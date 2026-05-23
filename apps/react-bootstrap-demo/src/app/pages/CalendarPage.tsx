import { BsCalendar } from '@mintplayer/react-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsCalendar />";

export function CalendarPage() {
  return (
    <div className="demo-page">
      <h1>Calendar</h1>
      <p className="text-body-secondary">
        Accessible month-grid date picker with full keyboard navigation. The
        same WC drives the Angular and Vue demos.
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
        <BsCalendar />
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

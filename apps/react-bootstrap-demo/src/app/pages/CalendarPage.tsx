import { BsCalendar } from '@mintplayer/react-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsCalendar />";

export function CalendarPage() {
  return (
    <div className="demo-page">
      <h1>Calendar</h1>
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

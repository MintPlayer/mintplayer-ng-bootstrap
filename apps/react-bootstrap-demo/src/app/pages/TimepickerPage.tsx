import { BsTimepicker } from '@mintplayer/react-bootstrap/timepicker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsTimepicker />";

export function TimepickerPage() {
  return (
    <div className="demo-page">
      <h1>Timepicker</h1>
      <section>
        <h2>Default</h2>
        <BsTimepicker />
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

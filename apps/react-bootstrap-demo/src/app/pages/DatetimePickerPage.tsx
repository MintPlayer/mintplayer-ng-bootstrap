import { BsDatetimePicker } from '@mintplayer/react-bootstrap/datetime-picker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = "<BsDatetimePicker />";

export function DatetimePickerPage() {
  return (
    <div className="demo-page">
      <h1>Datetime picker</h1>
      <section>
        <h2>Default</h2>
        <BsDatetimePicker />
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

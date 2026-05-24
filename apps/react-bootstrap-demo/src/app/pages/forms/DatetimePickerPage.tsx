import { useState } from 'react';
import { BsDatetimePicker } from '@mintplayer/react-bootstrap/datetime-picker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsDatetimePicker value={dt} onValueChange={e => setDt(e.detail)} />`;

export function DatetimePickerPage() {
  const [dt, setDt] = useState<Date | null>(null);

  return (
    <div className="demo-page">
      <h1>Datetime picker</h1>
      <p className="text-body-secondary">
        Single readonly input with two popups — a calendar for the date,
        a time list for the hour/minute. Both share one <code>Date</code>
        value.
      </p>

      <section>
        <h2>Default</h2>
        <BsDatetimePicker
          value={dt}
          onValueChange={(e: CustomEvent<Date | null>) => setDt(e.detail)}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{dt ? dt.toISOString() : '—'}</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

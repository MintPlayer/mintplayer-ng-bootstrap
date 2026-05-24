import { useState } from 'react';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsDatepicker selectedDate={date} onSelectedDateChange={e => setDate(e.detail)} />`;

export function DatepickerPage() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className="demo-page">
      <h1>Datepicker</h1>
      <p className="text-body-secondary">
        A readonly input + calendar popup. Internally composes
        <code> &lt;mp-calendar&gt; </code> via a default slot.
      </p>

      <section>
        <h2>Default</h2>
        <BsDatepicker
          selectedDate={date ?? undefined}
          onSelectedDateChange={(e: CustomEvent<Date>) => setDate(e.detail)}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{date ? date.toISOString().slice(0, 10) : '—'}</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

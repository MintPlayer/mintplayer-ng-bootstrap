import { useState } from 'react';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsDatepicker selectedDate={date} onSelectedDateChange={setDate} name="date" />`;

export function DatepickerPage() {
  const [date, setDate] = useState<Date | null>(() => new Date());

  return (
    <div className="demo-page">
      <h1>Datepicker</h1>
      <p className="text-body-secondary">
        A date field with a month-grid popup. With JavaScript off it is a native date field.
      </p>

      <section>
        <h2>Default</h2>
        <BsDatepicker selectedDate={date} onSelectedDateChange={setDate} name="date" />
        <p className="text-body-secondary mt-2">
          Selected: <code>{date ? date.toDateString() : 'none'}</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

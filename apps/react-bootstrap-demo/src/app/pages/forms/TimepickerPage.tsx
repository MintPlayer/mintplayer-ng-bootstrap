import { useState } from 'react';
import { BsTimepicker } from '@mintplayer/react-bootstrap/timepicker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsTimepicker selectedTime={time} onSelectedTimeChange={setTime} name="time" />`;

export function TimepickerPage() {
  const [time, setTime] = useState<Date | null>(() => new Date());

  return (
    <div className="demo-page">
      <h1>Timepicker</h1>
      <p className="text-body-secondary">
        A time field with a slot-list popup. With JavaScript off it is a native time field.
      </p>
      <section>
        <h2>Default</h2>
        <BsTimepicker selectedTime={time} onSelectedTimeChange={setTime} name="time" />
        <p className="text-body-secondary mt-2">
          Selected: <code>{time ? time.toTimeString().slice(0, 5) : 'none'}</code>
        </p>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

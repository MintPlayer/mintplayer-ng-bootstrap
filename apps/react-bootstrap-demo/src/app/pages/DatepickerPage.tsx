import { useState } from 'react';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = `import { useState } from 'react';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';
export function ControlledDatepicker() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <BsDatepicker
      value={date}
      onChange={(e: any) => setDate(e.target.value)}
    />
  );
}`;

export function DatepickerPage() {
  const [date, setDate] = useState<Date | null>(new Date());

  return (
    <div className="demo-page">
      <h1>Datepicker</h1>
      <p className="text-body-secondary">
        Calendar-driven date input. In React the controlled-component pattern
        is the standard one: pass <code>value</code> as a prop and listen for
        <code>change</code>. (Vue uses <code>v-model</code> via the SFC adapter;
        same underlying WC.)
      </p>
      <section>
        <h2>Controlled</h2>
        <BsDatepicker
          value={date}
          onChange={(e: any) => setDate(e.target.value)}
        />
        <div className="mt-2 small text-body-secondary">
          Current value: <code>{date ? date.toISOString() : 'null'}</code>
        </div>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

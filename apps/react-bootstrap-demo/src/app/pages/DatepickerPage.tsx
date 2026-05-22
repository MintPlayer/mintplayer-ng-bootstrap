import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { useState } from 'react';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';

export function ControlledDatepicker() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <BsDatepicker
      // For controlled binding, set the WC's \`value\` property on a ref
      // and listen for its \`change\` event. The Vue wrapper exposes
      // \`v-model\`; the React wrapper uses the standard ref+event pattern.
      ref={(el) => { if (el) (el as any).value = date; }}
      onChange={(e: any) => setDate(e.target.value)}
    />
  );
}`;

export function DatepickerPage() {
  const [date, setDate] = useState<Date | null>(new Date());
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) (ref.current as unknown as { value: unknown }).value = date;
  }, [date]);

  return (
    <div className="demo-page">
      <h1>Datepicker</h1>
      <p className="text-body-secondary">
        Calendar-driven date input. In React the controlled-component pattern
        is: set the WC's <code>value</code> property via a ref + listen for its
        native <code>change</code> event. (Vue uses <code>v-model</code> via the
        SFC adapter; same underlying WC.)
      </p>
      <section>
        <h2>Controlled</h2>
        <BsDatepicker
          ref={ref as never}
          onChange={
            ((e: ChangeEvent<HTMLElement>) => {
              const next = (e.target as unknown as { value: Date | null }).value;
              setDate(next);
            }) as never
          }
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

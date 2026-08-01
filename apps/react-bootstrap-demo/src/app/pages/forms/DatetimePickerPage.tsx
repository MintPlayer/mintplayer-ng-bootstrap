import { useState } from 'react';
import { BsDatetimePicker } from '@mintplayer/react-bootstrap/datetime-picker';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsDatetimePicker value={dt} onValueChange={e => setDt(e.detail)} />`;

const BOUNDS_SOURCE = `// A datetime bound, so the TIME half matters: on the bound's own day it
// also limits the time list. A bare new Date(2026, 11, 31) is midnight.
const min = new Date(2026, 0, 1, 9, 0);
const max = new Date(2026, 11, 31, 17, 0);

<BsDatetimePicker value={dt} min={min} max={max} showClear
                  onValueChange={e => setDt(e.detail)} />`;

// Deliberately carrying a time: these bound the datetime, and on their own day
// the time list narrows to match.
const BOUNDS_MIN = new Date(2026, 0, 1, 9, 0);
const BOUNDS_MAX = new Date(2026, 11, 31, 17, 0);

export function DatetimePickerPage() {
  const [dt, setDt] = useState<Date | null>(null);
  const [bounded, setBounded] = useState<Date | null>(null);

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
        <h2>min / max bounds</h2>
        <p className="text-body-secondary">
          Bounded to 2026, 09:00 on 1 January through 17:00 on 31 December.
          Pick either bound&apos;s own day to see the time list narrow with it —
          any other day keeps all 24 hours.
        </p>
        <BsDatetimePicker
          value={bounded}
          min={BOUNDS_MIN}
          max={BOUNDS_MAX}
          showClear
          onValueChange={(e: CustomEvent<Date | null>) => setBounded(e.detail)}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{bounded ? bounded.toISOString() : '—'}</code>
        </p>
        <BsCodeSnippet code={BOUNDS_SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

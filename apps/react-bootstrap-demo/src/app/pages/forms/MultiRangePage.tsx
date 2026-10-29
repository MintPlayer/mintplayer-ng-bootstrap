import { useState } from 'react';
import { BsMultiRange } from '@mintplayer/react-bootstrap/multi-range';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsMultiRange
  aria-label="Price range"
  min={0}
  max={100}
  value={value}
  onValueInput={setValue}
  formatValue={(v) => '$' + v.toFixed(2)}
/>`;

const currency = (v: number) => `$${v.toFixed(2)}`;

export function MultiRangePage() {
  const [value, setValue] = useState<number[]>([20, 60]);
  const [committed, setCommitted] = useState<number[]>([20, 60]);
  const [three, setThree] = useState<number[]>([2, 5, 8]);

  return (
    <div className="demo-page">
      <h1>Multi-range</h1>
      <p className="text-body-secondary">
        A slider with several thumbs; each thumb is a native range input, so the
        keyboard, RTL and form submission are the browser's own. Thumbs cannot
        cross their neighbours. <code>onValueInput</code> fires while a thumb
        moves, <code>onValueChange</code> when the move is committed.
      </p>

      <section>
        <h2>Two-thumb range</h2>
        <BsMultiRange
          aria-label="Price range"
          min={0}
          max={100}
          value={value}
          onValueInput={setValue}
          onValueChange={setCommitted}
          formatValue={currency}
        />
        <p className="text-body-secondary mt-2">
          Live: <code>[{value.join(', ')}]</code> · Committed: <code>[{committed.join(', ')}]</code>
        </p>
      </section>

      <section>
        <h2>Three thumbs, half steps, a minimum gap of 1</h2>
        <BsMultiRange aria-label="Three thumbs" min={0} max={10} step={0.5} minDistance={1} value={three} onValueInput={setThree} />
        <p className="text-body-secondary mt-2">
          Selected: <code>[{three.join(', ')}]</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

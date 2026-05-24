import { useState } from 'react';
import { BsMultiRange } from '@mintplayer/react-bootstrap/multi-range';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsMultiRange
  value={value}
  min={0}
  max={100}
  onValueChange={e => setValue(e.detail)}
/>`;

export function MultiRangePage() {
  const [value, setValue] = useState<number[]>([20, 60]);

  return (
    <div className="demo-page">
      <h1>Multi-range</h1>
      <p className="text-body-secondary">
        A multi-thumb range slider. Thumbs cannot cross their neighbours;
        identity is by index. <code>value-input</code> fires continuously
        during drag, <code>value-change</code> on pointer release.
      </p>

      <section>
        <h2>Two-thumb range</h2>
        <BsMultiRange
          {...{ value, min: 0, max: 100 } as React.ComponentProps<typeof BsMultiRange>}
          onValueChange={(e: CustomEvent<number[]>) => setValue([...e.detail])}
        />
        <p className="text-body-secondary mt-2">
          Selected range: <code>[{value.join(', ')}]</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

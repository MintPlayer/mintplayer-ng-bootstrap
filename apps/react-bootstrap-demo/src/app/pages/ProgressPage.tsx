import { useState } from 'react';
import { BsProgress, BsProgressBar } from '@mintplayer/react-bootstrap/progress-bar';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsProgress, BsProgressBar } from '@mintplayer/react-bootstrap/progress-bar';

<BsProgress>
  <BsProgressBar value={15} label="Downloaded" />
  <BsProgressBar value={30} color="warning" striped label="Queued" />
</BsProgress>

<BsProgress indeterminate label="Loading results" />`;

export function ProgressPage() {
  const [value, setValue] = useState(40);
  return (
    <div className="demo-page">
      <h1>Progress</h1>
      <p className="text-body-secondary">
        Each bar is a <code>role="progressbar"</code> named by <code>label</code>, with its value
        range on the role; <code>valueText</code> gives a human reading. Stacked bars each read on
        their own. <code>indeterminate</code> shows a bar of unknown progress (still under reduced
        motion).
      </p>

      <section>
        <h2>Single bar</h2>
        <BsProgress className="mb-2">
          <BsProgressBar value={value} label="Upload" valueText={`${value} percent`}>{value}%</BsProgressBar>
        </BsProgress>
        <input type="range" className="form-range" min={0} max={100} value={value} aria-label="Value" onChange={(e) => setValue(Number(e.target.value))} />
      </section>

      <section>
        <h2>Stacked, striped and animated</h2>
        <BsProgress>
          <BsProgressBar value={15} label="Downloaded" />
          <BsProgressBar value={30} color="warning" striped label="Queued" />
          <BsProgressBar value={20} color="info" animated label="Processing" />
        </BsProgress>
      </section>

      <section>
        <h2>Indeterminate</h2>
        <BsProgress indeterminate height={4} label="Loading results" />
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

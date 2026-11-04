import { useState } from 'react';
import { BsRange } from '@mintplayer/react-bootstrap/range';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsRange } from '@mintplayer/react-bootstrap/range';

<BsRange min={0} max={5} step={0.5} value={value} onValueChange={setValue} label="Rating" />`;

export function RangePage() {
  const [value, setValue] = useState(2.5);
  const [disabled, setDisabled] = useState(false);
  return (
    <div className="demo-page">
      <h1>Range</h1>
      <p className="text-body-secondary">
        A native slider (<code>.form-range</code>): the browser owns its role, value and keys
        (arrows, Page Up/Down, Home/End). <code>value</code> is controlled through
        <code>onValueChange</code>; <code>label</code> names it when no <code>&lt;label for&gt;</code> does.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsRange min={0} max={5} step={0.5} value={value} onValueChange={setValue} disabled={disabled} label="Rating" />
        <p>Value: {value}</p>
        <label className="form-check">
          <input type="checkbox" className="form-check-input" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> Disabled
        </label>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

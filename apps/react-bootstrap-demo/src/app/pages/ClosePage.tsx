import { useState } from 'react';
import { BsClose } from '@mintplayer/react-bootstrap/close';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsClose } from '@mintplayer/react-bootstrap/close';

export function Dismissible({ onDismiss }: { onDismiss: () => void }) {
  return <BsClose label="Dismiss notice" onClick={onDismiss} />;
}`;

export function ClosePage() {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="demo-page">
      <h1>Close button</h1>
      <p className="text-body-secondary">
        Bootstrap's dismiss button: a real <code>&lt;button&gt;</code> named by <code>label</code>.
        Listen for its native click.
      </p>

      <section>
        <h2>Basic usage</h2>
        <p className="d-flex align-items-center gap-3">
          <BsClose label="Dismiss notice" onClick={() => setClicks((n) => n + 1)} />
          <span>Clicked {clicks} times</span>
        </p>
        <p className="d-flex align-items-center gap-3">
          <BsClose disabled />
          <span>Disabled</span>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

import { useState } from 'react';
import { BsAlert } from '@mintplayer/react-bootstrap/alert';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { useState } from 'react';
import { BsAlert } from '@mintplayer/react-bootstrap/alert';

export function Notice() {
  const [visible, setVisible] = useState(true);
  return (
    <BsAlert color="warning" dismissible visible={visible} onVisibleChange={setVisible}>
      Heads up.
    </BsAlert>
  );
}`;

export function AlertPage() {
  const [warning, setWarning] = useState(true);
  const [danger, setDanger] = useState(true);
  return (
    <div className="demo-page">
      <h1>Alert</h1>
      <p className="text-body-secondary">
        A contextual banner. <code>visible</code> is two-way; <code>dismissible</code> adds a close
        button (named by <code>closeLabel</code>) that hides the alert and moves focus to the next
        control; <code>announce</code> opts in to <code>role="alert"</code> for dynamic alerts.
      </p>

      <section>
        <h2>Colours</h2>
        <BsAlert color="info">A static, informational banner.</BsAlert>
        <BsAlert color="success">Saved.</BsAlert>
      </section>

      <section>
        <h2>Dismissible</h2>
        <BsAlert color="warning" dismissible visible={warning} onVisibleChange={setWarning}>
          Heads up.
        </BsAlert>
        <BsAlert color="danger" dismissible closeLabel="Dismiss error" visible={danger} onVisibleChange={setDanger}>
          Something went wrong.
        </BsAlert>
        <button type="button" className="btn btn-primary" onClick={() => { setWarning(true); setDanger(true); }}>
          Show all alerts again
        </button>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

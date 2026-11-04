import { useState } from 'react';
import { BsForm } from '@mintplayer/react-bootstrap/form';
import { BsFloatingLabel } from '@mintplayer/react-bootstrap/floating-labels';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsForm } from '@mintplayer/react-bootstrap/form';
import { BsFloatingLabel } from '@mintplayer/react-bootstrap/floating-labels';

<BsForm onSubmitted={() => setSent(true)}>
  <BsFloatingLabel>
    <input type="email" className="form-control" placeholder="name@example.com" />
    <label>Email address</label>
  </BsFloatingLabel>
</BsForm>`;

export function FloatingLabelsPage() {
  const [sent, setSent] = useState(0);
  return (
    <div className="demo-page">
      <h1>Floating labels</h1>
      <p className="text-body-secondary">
        <code>BsForm</code> renders a real <code>&lt;form&gt;</code> that styles the Bootstrap form
        classes inside it; <code>onSubmitted</code> reports a submit (without an <code>action</code>,
        the page reload is cancelled). <code>BsFloatingLabel</code> takes a control and then its
        <code>&lt;label&gt;</code>, and points a label without <code>for</code> at the control.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsForm onSubmitted={() => setSent((n) => n + 1)}>
          <BsFloatingLabel className="mb-3">
            <input type="email" className="form-control" placeholder="name@example.com" />
            <label>Email address</label>
          </BsFloatingLabel>
          <BsFloatingLabel className="mb-3">
            <input type="password" className="form-control" placeholder="Password" />
            <label>Password</label>
          </BsFloatingLabel>
          <button type="submit" className="btn btn-primary">Sign in</button>
          <span className="ms-3" role="status">{sent ? `Submitted ${sent}×` : ''}</span>
        </BsForm>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

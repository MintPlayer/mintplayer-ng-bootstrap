import { useState } from 'react';
import { BsToggleButton } from '@mintplayer/react-bootstrap/toggle-button';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

// `color` is an HTML attribute (observedAttributes) on the WC, not a typed
// class field, so @lit/react doesn't surface it on the React props. Forward
// via a small spread cast at the call site.
const SOURCE = `import { useState } from 'react';
import { BsToggleButton } from '@mintplayer/react-bootstrap/toggle-button';

export function MyToggle() {
  const [on, setOn] = useState(false);
  return (
    <BsToggleButton
      checked={on}
      onChange={(e) => setOn(e.detail.checked)}
      {...{ color: 'primary' }}
    >
      {on ? 'On' : 'Off'}
    </BsToggleButton>
  );
}`;

export function ToggleButtonPage() {
  const [primary, setPrimary] = useState(false);
  const [success, setSuccess] = useState(true);

  return (
    <div className="demo-page">
      <h1>Toggle button</h1>
      <p className="text-body-secondary">
        On/off button using Bootstrap&apos;s <code>btn-check</code> +{' '}
        <code>label.btn</code> pattern. Emits a native-style{' '}
        <code>change</code> event with <code>detail.checked</code>.
      </p>

      <section>
        <h2>Default</h2>
        <BsToggleButton
          checked={primary}
          onChange={(e) => setPrimary(e.detail.checked)}
          {...{ color: 'primary' }}
        >
          {primary ? 'On' : 'Off'}
        </BsToggleButton>
      </section>

      <section>
        <h2>Colour variants</h2>
        <BsToggleButton
          checked={success}
          onChange={(e) => setSuccess(e.detail.checked)}
          {...{ color: 'outline-success' }}
        >
          Outline success
        </BsToggleButton>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

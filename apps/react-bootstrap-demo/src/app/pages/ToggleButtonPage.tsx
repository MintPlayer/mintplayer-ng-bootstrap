import { useState } from 'react';
import { BsToggleButton } from '@mintplayer/react-bootstrap/toggle-button';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { useState } from 'react';
import { BsToggleButton } from '@mintplayer/react-bootstrap/toggle-button';

export function MyToggle() {
  const [on, setOn] = useState(false);
  return (
    <BsToggleButton
      checked={on}
      onCheckedChange={setOn}
      color="primary"
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
        <code>label.btn</code> pattern, with <code>role=&quot;button&quot;</code> and{' '}
        <code>aria-pressed</code>. <code>onCheckedChange</code> reports the pressed state.
      </p>

      <section>
        <h2>Default</h2>
        <BsToggleButton
          checked={primary}
          onCheckedChange={setPrimary}
          color="primary"
        >
          {primary ? 'On' : 'Off'}
        </BsToggleButton>
      </section>

      <section>
        <h2>Colour variants</h2>
        <BsToggleButton
          checked={success}
          onCheckedChange={setSuccess}
          color="outline-success"
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

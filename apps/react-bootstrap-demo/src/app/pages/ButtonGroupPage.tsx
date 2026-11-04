import { useState } from 'react';
import { BsButtonGroup } from '@mintplayer/react-bootstrap/button-group';
import { BsToggleButton } from '@mintplayer/react-bootstrap/checkbox';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsButtonGroup } from '@mintplayer/react-bootstrap/button-group';

export function Toolbar() {
  return (
    <BsButtonGroup label="Text alignment">
      <button type="button" className="btn btn-outline-primary">Left</button>
      <button type="button" className="btn btn-outline-primary">Middle</button>
      <button type="button" className="btn btn-outline-primary">Right</button>
    </BsButtonGroup>
  );
}`;

export function ButtonGroupPage() {
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  return (
    <div className="demo-page">
      <h1>Button group</h1>
      <p className="text-body-secondary">
        Joins a row of buttons into one control, a <code>role="group"</code> named by{' '}
        <code>label</code>. Toggle buttons join too, although each renders its button inside
        its own host.
      </p>

      <section>
        <h2>Buttons</h2>
        <BsButtonGroup label="Text alignment">
          <button type="button" className="btn btn-outline-primary">Left</button>
          <button type="button" className="btn btn-outline-primary">Middle</button>
          <button type="button" className="btn btn-outline-primary">Right</button>
        </BsButtonGroup>
      </section>

      <section>
        <h2>Toggle buttons, small</h2>
        <BsButtonGroup label="Text style" size="sm">
          <BsToggleButton checked={bold} onCheckedChange={setBold} color="outline-secondary">Bold</BsToggleButton>
          <BsToggleButton checked={italic} onCheckedChange={setItalic} color="outline-secondary">Italic</BsToggleButton>
          <BsToggleButton checked={underline} onCheckedChange={setUnderline} color="outline-secondary">Underline</BsToggleButton>
        </BsButtonGroup>
      </section>

      <section>
        <h2>Vertical</h2>
        <BsButtonGroup label="Order" vertical>
          <button type="button" className="btn btn-secondary">First</button>
          <button type="button" className="btn btn-secondary">Second</button>
          <button type="button" className="btn btn-secondary">Third</button>
        </BsButtonGroup>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

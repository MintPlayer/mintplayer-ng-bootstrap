import { useState } from 'react';
import { BsNavbarToggler } from '@mintplayer/react-bootstrap/navbar-toggler';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsNavbarToggler } from '@mintplayer/react-bootstrap/navbar-toggler';

<BsNavbarToggler open={open} onOpenChange={setOpen} controls="menu" label="Show the menu" />
<ul id="menu" hidden={!open}>…</ul>`;

export function ToggleButtonsPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="demo-page">
      <h1>Toggle buttons</h1>
      <p className="text-body-secondary">
        <code>BsNavbarToggler</code> is a real button whose three bars cross while <code>open</code>.
        It reports <code>aria-expanded</code>, and <code>aria-controls</code> with <code>controls</code>.
      </p>

      <section>
        <h2>Basic usage</h2>
        <BsNavbarToggler open={open} onOpenChange={setOpen} controls="demo-menu" label="Show the menu" />
        <ul id="demo-menu" hidden={!open}>
          <li>Home</li>
          <li>About</li>
        </ul>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

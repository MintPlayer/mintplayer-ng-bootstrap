import { useState } from 'react';
import { BsOffcanvas, type OffcanvasPosition } from '@mintplayer/react-bootstrap/offcanvas';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const POSITIONS: readonly OffcanvasPosition[] = ['start', 'end', 'top', 'bottom'];

const SOURCE = `import { BsOffcanvas } from '@mintplayer/react-bootstrap/offcanvas';

const [open, setOpen] = useState(false);

<button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Open</button>
<BsOffcanvas open={open} onOpenChange={setOpen} position="end" header="Offcanvas title">
  Place any content here — forms, lists, navigation.
</BsOffcanvas>`;

export function OffcanvasPage() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<OffcanvasPosition>('start');
  const show = (next: OffcanvasPosition) => {
    setPosition(next);
    setOpen(true);
  };
  return (
    <div className="demo-page">
      <h1>Offcanvas</h1>
      <p className="text-body-secondary">
        A panel that slides in from a viewport edge (<code>position</code>), rendered at the end of{' '}
        <code>&lt;body&gt;</code>. With <code>backdrop</code> (the default) it is modal and traps focus. Escape, the
        backdrop and the header's close button close it; so does any element inside with{' '}
        <code>data-bs-dismiss="offcanvas"</code>.
      </p>

      <section>
        <h2>Basic usage</h2>
        <div className="btn-group" role="group" aria-label="Show offcanvas">
          {POSITIONS.map((p) => (
            <button key={p} type="button" className="btn btn-primary" onClick={() => show(p)}>
              {p}
            </button>
          ))}
        </div>
        <BsOffcanvas open={open} onOpenChange={setOpen} position={position} header="Offcanvas">
          <p>Some text as placeholder. In real life you can have the elements you have chosen.</p>
          <button type="button" className="btn btn-secondary" data-bs-dismiss="offcanvas">Close</button>
        </BsOffcanvas>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

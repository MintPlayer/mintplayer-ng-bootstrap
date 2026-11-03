import { useState } from 'react';
import { BsModal } from '@mintplayer/react-bootstrap/modal';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsModal } from '@mintplayer/react-bootstrap/modal';

const [open, setOpen] = useState(false);

<button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Show modal</button>
<BsModal
  open={open}
  onOpenChange={setOpen}
  header="Modal title"
  footer={<button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>}>
  Place any content here — forms, lists, embedded components.
</BsModal>`;

export function ModalPage() {
  const [open, setOpen] = useState(false);
  const [scrollOpen, setScrollOpen] = useState(false);
  return (
    <div className="demo-page">
      <h1>Modal</h1>
      <p className="text-body-secondary">
        The dialog renders at the end of <code>&lt;body&gt;</code>, so no <code>overflow: hidden</code> ancestor
        clips it. It traps focus and returns it on close; Escape, the backdrop and the header's close button close
        it, and <code>onOpenChange</code> reports that. The <code>header</code> names the dialog; any element
        inside with <code>data-bs-dismiss="modal"</code> closes it.
      </p>

      <section>
        <h2>Basic usage</h2>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Show modal</button>
        <BsModal
          open={open}
          onOpenChange={setOpen}
          header="Modal title"
          footer={<button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>}>
          <label className="form-label" htmlFor="react-modal-tags">Search for tags</label>
          <input id="react-modal-tags" className="form-control" type="text" />
        </BsModal>
      </section>

      <section>
        <h2>Scrollable, centred</h2>
        <button type="button" className="btn btn-primary" onClick={() => setScrollOpen(true)}>Show long modal</button>
        <BsModal open={scrollOpen} onOpenChange={setScrollOpen} scrollable centered header="Terms">
          {Array.from({ length: 30 }, (_, i) => (
            <p key={i}>Paragraph {i + 1} of a long body that scrolls inside the dialog.</p>
          ))}
        </BsModal>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

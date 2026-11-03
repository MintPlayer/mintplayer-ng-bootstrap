import type { AnchorSide } from '@mintplayer/ui-core/overlay';
import { useBsPopover } from '@mintplayer/react-bootstrap/popover';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SIDES: readonly AnchorSide[] = ['start', 'top', 'bottom', 'end'];

const SOURCE = `import { useBsPopover } from '@mintplayer/react-bootstrap/popover';

const [props, popover] = useBsPopover({ position: 'top', title: 'Popover title', content: 'Any content here.' });

<button type="button" className="btn btn-primary" {...props}>Click me</button>
{popover}`;

function PopoverButton({ side }: { side: AnchorSide }) {
  const [props, popover] = useBsPopover({
    position: side,
    title: 'Popover title',
    content: "And here's some amazing content. It's very engaging. Right?",
  });
  return (
    <>
      <button type="button" className="btn btn-primary" {...props}>
        {side}
      </button>
      {popover}
    </>
  );
}

export function PopoverPage() {
  return (
    <div className="demo-page">
      <h1>Popover</h1>
      <p className="text-body-secondary">
        <code>useBsPopover</code> returns the trigger's props and the popover itself: a non-modal dialog that a click
        (or Enter / Space) toggles, rendered at the end of <code>&lt;body&gt;</code>. Its <code>title</code> names
        the dialog. Escape (focus returns to the trigger), a click outside or tabbing out closes it.
      </p>

      <section>
        <h2>Basic usage</h2>
        <div className="d-flex flex-wrap gap-2 overflow-hidden">
          {SIDES.map((side) => (
            <PopoverButton key={side} side={side} />
          ))}
        </div>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

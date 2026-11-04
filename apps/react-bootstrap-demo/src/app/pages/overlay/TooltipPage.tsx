import type { AnchorSide } from '@mintplayer/ui-core/overlay';
import { useBsTooltip } from '@mintplayer/react-bootstrap/tooltip';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SIDES: readonly AnchorSide[] = ['start', 'top', 'bottom', 'end'];

const SOURCE = `import { useBsTooltip } from '@mintplayer/react-bootstrap/tooltip';

const [props, tooltip] = useBsTooltip({ position: 'top', content: <>Hello <b>world</b></> });

<button type="button" className="btn btn-primary" {...props}>Hover me</button>
{tooltip}`;

function TooltipButton({ side }: { side: AnchorSide }) {
  const [props, tooltip] = useBsTooltip({ position: side, content: <span className="text-nowrap">Hello <b>world</b></span> });
  return (
    <>
      <button type="button" className="btn btn-primary" {...props}>
        {side}
      </button>
      {tooltip}
    </>
  );
}

export function TooltipPage() {
  return (
    <div className="demo-page">
      <h1>Tooltip</h1>
      <p className="text-body-secondary">
        <code>useBsTooltip</code> returns the trigger's props and the tooltip itself, which renders at the end of{' '}
        <code>&lt;body&gt;</code> so no <code>overflow: hidden</code> ancestor clips it. It shows on hover and on
        focus, flips to the other side when there is no room, and Escape dismisses it. While it shows, the
        trigger's <code>aria-describedby</code> names it.
      </p>

      <section>
        <h2>Basic usage</h2>
        <div className="d-flex flex-wrap gap-2 overflow-hidden">
          {SIDES.map((side) => (
            <TooltipButton key={side} side={side} />
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

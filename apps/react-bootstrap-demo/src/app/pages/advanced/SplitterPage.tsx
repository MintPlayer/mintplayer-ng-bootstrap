import { BsSplitter } from '@mintplayer/react-bootstrap/splitter';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsSplitter orientation="horizontal" style={{ height: 240 }}>
  <div>Left pane</div>
  <div>Right pane</div>
</BsSplitter>`;

export function SplitterPage() {
  return (
    <div className="demo-page">
      <h1>Splitter</h1>
      <p className="text-body-secondary">
        A draggable gutter between two (or more) panels. Pointer events
        from <code>mouse / touch / pen</code> are normalized; the gutter
        emits <code>resize-start</code> / <code>resizing</code> /
        <code>resize-end</code> with the current panel sizes as CSS px.
      </p>

      <details className="mb-2">
        <summary>Keyboard shortcuts</summary>
        <ul className="mb-0">
          <li><kbd>Tab</kbd> — focus the next divider (each one is a <code>role="separator"</code> tab stop reporting its position as <code>aria-valuenow</code>)</li>
          <li><kbd>←</kbd> / <kbd>→</kbd> — resize a horizontal splitter by 10% (<kbd>Shift</kbd>: 1%)</li>
          <li><kbd>↑</kbd> / <kbd>↓</kbd> — resize a vertical splitter by 10% (<kbd>Shift</kbd>: 1%)</li>
          <li>Arrows across the splitter's other axis are ignored</li>
          <li><kbd>Home</kbd> — shrink the leading panel to its minimum size</li>
          <li><kbd>End</kbd> — grow the leading panel until the trailing one hits its minimum</li>
        </ul>
      </details>

      <section>
        <h2>Horizontal split</h2>
        <BsSplitter
          orientation="horizontal"
          style={{ height: 240, border: '1px solid var(--bs-border-color)' }}
        >
          <div style={{ padding: '0.75rem' }}>Left pane</div>
          <div style={{ padding: '0.75rem' }}>Right pane</div>
        </BsSplitter>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

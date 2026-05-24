import { BsSplitter } from '@mintplayer/react-bootstrap/splitter';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsSplitter direction="horizontal" style={{ height: 240 }}>
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

      <section>
        <h2>Horizontal split</h2>
        <BsSplitter
          {...{ direction: 'horizontal' } as React.ComponentProps<typeof BsSplitter>}
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

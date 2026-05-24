import { useState } from 'react';
import { BsDockManager } from '@mintplayer/react-bootstrap/dock';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type { DockLayoutSnapshot } from '@mintplayer/web-components/dock';

const INITIAL_LAYOUT: DockLayoutSnapshot = {
  root: {
    kind: 'split',
    direction: 'horizontal',
    sizes: [1, 2],
    children: [
      { kind: 'stack', panes: ['panel-1', 'panel-2'], activePane: 'panel-1' },
      { kind: 'stack', panes: ['panel-3'] },
    ],
  },
  floating: [],
  titles: {
    'panel-1': 'Panel 1',
    'panel-2': 'Panel 2',
    'panel-3': 'Panel 3',
  },
};

const SOURCE = `<BsDockManager
  layout={layout}
  onLayoutChanged={e => setLayout(e.detail)}>
  <div slot="panel-1" className="p-3">…</div>
  <div slot="panel-2" className="p-3">…</div>
  <div slot="panel-3" className="p-3">…</div>
</BsDockManager>`;

export function DockPage() {
  const [layout, setLayout] = useState<DockLayoutSnapshot>(INITIAL_LAYOUT);

  return (
    <div className="demo-page">
      <h1>Dock manager</h1>
      <p className="text-body-secondary">
        IDE-style dockable workspace built on splitters and tab stacks.
        Panes can be dragged between stacks, torn off into floating
        windows, and the arrangement is round-trippable as a JSON
        <code> DockLayoutSnapshot</code>.
      </p>

      <section style={{ height: 480 }}>
        <h2>Basic usage</h2>
        <BsDockManager
          {...{ layout } as React.ComponentProps<typeof BsDockManager>}
          onLayoutChanged={(e) => setLayout(e.detail)}
          style={{ display: 'block', height: '100%' }}
        >
          <div slot="panel-1" className="p-3"><h3>Panel 1</h3><p>Static content via a named slot.</p></div>
          <div slot="panel-2" className="p-3"><h3>Panel 2</h3><p>Drag this tab to dock it elsewhere.</p></div>
          <div slot="panel-3" className="p-3"><h3>Panel 3</h3><p>Press <kbd>M</kbd> on a focused tab to enter move mode.</p></div>
        </BsDockManager>
      </section>

      <section>
        <h2>Captured layout</h2>
        <pre className="mb-0"><code>{JSON.stringify(layout, null, 2)}</code></pre>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

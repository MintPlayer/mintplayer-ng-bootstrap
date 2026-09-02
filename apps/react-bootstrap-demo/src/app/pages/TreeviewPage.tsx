import { useState } from 'react';
import { BsTreeview } from '@mintplayer/react-bootstrap/treeview';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type { TreeNode } from '@mintplayer/web-components/treeview';

const NODES: TreeNode[] = [
  {
    id: 'src', label: 'src', children: [
      { id: 'src/app', label: 'app', children: [
        { id: 'src/app/main.ts', label: 'main.ts' },
        { id: 'src/app/app.module.ts', label: 'app.module.ts' },
      ]},
      { id: 'src/assets', label: 'assets', children: [
        { id: 'src/assets/logo.svg', label: 'logo.svg' },
      ]},
    ],
  },
  { id: 'package.json', label: 'package.json' },
  { id: 'README.md', label: 'README.md' },
];

const SOURCE = `<BsTreeview
  items={items}
  selectionMode="single"
  onTreeNodeSelect={e => setSelectedIds(e.detail.selectedIds)}
/>`;

export function TreeviewPage() {
  const [items] = useState<TreeNode[]>(NODES);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <div className="demo-page">
      <h1>Treeview</h1>
      <p className="text-body-secondary">
        Hierarchical tree with keyboard navigation, expand/collapse state
        synchronisation, and pluggable node rendering. Bind <code>items</code>
        as a JS array; the WC owns the visible tree.
      </p>

      <details className="mt-3 mb-4">
          <summary>Styling — this component renders in the light DOM</summary>
          <p className="mt-2">
              It has no shadow root. Anything you render into it — row templates, node
              templates, cell renderers — stays in the document, so your app's stylesheet,
              your own component styles and Bootstrap's utility classes reach it normally.
          </p>
          <p>
              Its own CSS is scoped at build time onto a <code>data-mps</code> attribute, the
              same device Angular uses for <code>_ngcontent</code>, so it cannot leak out onto
              your markup.
          </p>
          <p className="mb-0">
              The trade-off runs the other way: page CSS now reaches this component's
              internals, exactly as emulated encapsulation behaves everywhere else.
              <code>::part()</code> and <code>::slotted()</code> no longer address it — use
              ordinary CSS selectors instead.
          </p>
      </details>

      <section>
        <h2>File system</h2>
        <BsTreeview
          {...{ items, selectionMode: 'single' } as React.ComponentProps<typeof BsTreeview>}
          onTreeNodeSelect={(e) => setSelectedIds([...e.detail.selectedIds])}
        />
        <p className="text-body-secondary mt-2">
          Selected: <code>{selectedIds.length ? selectedIds.join(', ') : '—'}</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

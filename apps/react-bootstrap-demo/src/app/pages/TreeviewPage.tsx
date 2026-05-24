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
  onTreeNodeSelect={e => setSelected(e.detail.selectedIds)}
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

import { useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsPriorityNav, type PriorityNavItem } from '@mintplayer/react-bootstrap/priority-nav';

const LINKS: PriorityNavItem[] = [
  { key: 'home',     label: 'Home',     href: '#', priority: 1, hideBelow: 'sm' },
  { key: 'products', label: 'Products', href: '#', priority: 2, hideBelow: 'md' },
  { key: 'services', label: 'Services', href: '#', priority: 3, hideBelow: 'md' },
  { key: 'pricing',  label: 'Pricing',  href: '#', priority: 4, hideBelow: 'lg' },
  { key: 'blog',     label: 'Blog',     href: '#', priority: 5, hideBelow: 'lg' },
  { key: 'careers',  label: 'Careers',  href: '#', priority: 6, hideBelow: 'xl' },
  { key: 'support',  label: 'Support',  href: '#', priority: 7, hideBelow: 'xl' },
  { key: 'contact',  label: 'Contact',  href: '#', priority: 8, hideBelow: 'xl' },
];

const ACTIONS: PriorityNavItem[] = ['Edit', 'Duplicate', 'Delete'].map((label) => ({ key: label, label, priority: 1 }));

const SOURCE = `import { BsPriorityNav, type PriorityNavItem } from '@mintplayer/react-bootstrap/priority-nav';

// A lower priority stays visible longer; hideBelow is the no-JS fallback.
const links: PriorityNavItem[] = [
  { key: 'home', label: 'Home', href: '/', priority: 1, hideBelow: 'sm' },
  { key: 'products', label: 'Products', href: '/products', priority: 2, hideBelow: 'md' },
];

<BsPriorityNav items={links} />`;

const ACTIONS_SOURCE = `<BsPriorityNav collapseAt="sm" items={actions}
  itemTemplate={({ item }) => (
    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => run(item)}>
      {item.label}
    </button>
  )}
/>`;

export function PriorityNavPage() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  return (
    <div className="demo-page">
      <h1>Priority navigation</h1>
      <p className="text-body-secondary">
        <code>BsPriorityNav</code> keeps as many <code>items</code> visible as fit and moves the rest, highest
        <code> priority</code> first, into a "More" disclosure. Without JavaScript each item's <code>hideBelow</code>{' '}
        breakpoint decides, and More is a checkbox toggle. <kbd>Escape</kbd> closes the overflow and returns focus to
        More.
      </p>

      <section>
        <h2>Basic usage</h2>
        <div className="p-2 border rounded">
          <BsPriorityNav items={LINKS} />
        </div>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>

      <section>
        <h2>Actions in the overflow</h2>
        <p>
          Below <code>sm</code> every action moves into More. Activating one closes More and returns focus to it.
        </p>
        <div className="p-2 border rounded">
          <BsPriorityNav
            collapseAt="sm"
            items={ACTIONS}
            label="Record actions"
            itemTemplate={({ item }) => (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setLastAction(String(item.label))}>
                {item.label}
              </button>
            )}
          />
        </div>
        {lastAction && <p className="text-body-secondary small">Last action: {lastAction}</p>}
        <BsCodeSnippet code={ACTIONS_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

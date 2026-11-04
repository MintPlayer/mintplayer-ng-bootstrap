import { useState } from 'react';
import type { DropdownSelectEventDetail } from '@mintplayer/ui-core/dropdown';
import { useBsContextMenu } from '@mintplayer/react-bootstrap/context-menu';
import { BsDropdownDivider, BsDropdownItem, BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { useBsContextMenu } from '@mintplayer/react-bootstrap/context-menu';
import { BsDropdownItem, BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown';

const [props, menu] = useBsContextMenu({
  content: (
    <BsDropdownMenu onItemSelect={({ value }) => setChosen(String(value))}>
      <BsDropdownItem value="cut">Cut</BsDropdownItem>
      <BsDropdownItem value="copy">Copy</BsDropdownItem>
      <BsDropdownItem value="paste">Paste</BsDropdownItem>
    </BsDropdownMenu>
  ),
});

<div tabIndex={0} {...props}>Right-click here</div>
{menu}`;

export function ContextMenuPage() {
  const [chosen, setChosen] = useState<string | null>(null);
  const [props, menu] = useBsContextMenu({
    content: (
      <BsDropdownMenu onItemSelect={({ value }: DropdownSelectEventDetail) => setChosen(String(value))}>
        <BsDropdownItem value="cut">Cut</BsDropdownItem>
        <BsDropdownItem value="copy">Copy</BsDropdownItem>
        <BsDropdownItem value="paste">Paste</BsDropdownItem>
        <BsDropdownDivider />
        <BsDropdownItem value="delete" disabled>
          Delete
        </BsDropdownItem>
      </BsDropdownMenu>
    ),
  });

  return (
    <div className="demo-page">
      <h1>Context menu</h1>
      <p className="text-body-secondary">
        <code>useBsContextMenu</code> replaces the browser's context menu on an element. A right-click opens the
        content at the pointer; Shift+F10 and the ContextMenu key open it at the element. Escape, a click elsewhere,
        scrolling or choosing an item closes it, and focus returns.
      </p>

      <section>
        <h2>Basic usage</h2>
        <div
          className="border rounded p-5 text-center"
          tabIndex={0}
          role="group"
          aria-label="Context menu demo area (Shift+F10 opens the menu)"
          {...props}
        >
          Right-click here
        </div>
        {menu}
        <p className="mt-2" data-testid="chosen">
          Chosen: {chosen ?? 'nothing yet'}
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

import { useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import {
  BsDropdownMenu,
  BsDropdownItem,
  BsDropdownDivider,
  BsDropdownHeader,
} from '@mintplayer/react-bootstrap/dropdown-menu';
import type { DropdownSelectEventDetail } from '@mintplayer/react-bootstrap/dropdown-menu';
import './DropdownMenuPage.css';

const MENU_SOURCE = `const [selected, setSelected] = useState<string>('—');

<BsDropdownMenu
  className="demo-dropdown-menu"
  onSelect={(e) => setSelected(String(e.detail.value ?? '—'))}
>
  <BsDropdownHeader>Actions</BsDropdownHeader>
  <BsDropdownItem value="new">New file</BsDropdownItem>
  <BsDropdownItem value="open" selected>Open…</BsDropdownItem>
  <BsDropdownItem value="save">Save</BsDropdownItem>
  <BsDropdownDivider />
  <BsDropdownItem value="delete" disabled>Delete</BsDropdownItem>
</BsDropdownMenu>`;

export function DropdownMenuPage() {
  const [selected, setSelected] = useState<string>('—');

  return (
    <div className="demo-page">
      <h1>Dropdown menu</h1>
      <p className="text-body-secondary">
        A Bootstrap <code>.dropdown-menu</code> rendered inside its shadow root.
        Slot <code>&lt;BsDropdownItem&gt;</code> / <code>&lt;BsDropdownDivider&gt;</code> /{' '}
        <code>&lt;BsDropdownHeader&gt;</code> children. In <code>menu</code> mode
        (default) it provides roving-tabindex keyboard navigation; activating an
        enabled item fires <code>onSelect</code> with the item's <code>value</code>.
      </p>

      <section data-demo="menu">
        <h2>Menu</h2>
        <BsDropdownMenu
          className="demo-dropdown-menu"
          onSelect={(e: CustomEvent<DropdownSelectEventDetail>) =>
            setSelected(String(e.detail.value ?? '—'))
          }
        >
          <BsDropdownHeader>Actions</BsDropdownHeader>
          <BsDropdownItem value="new">New file</BsDropdownItem>
          <BsDropdownItem value="open" selected>
            Open…
          </BsDropdownItem>
          <BsDropdownItem value="save">Save</BsDropdownItem>
          <BsDropdownDivider />
          <BsDropdownItem value="delete" disabled>
            Delete
          </BsDropdownItem>
        </BsDropdownMenu>
        <p className="text-body-secondary mt-2">
          Selected: <code>{selected}</code>
        </p>
        <BsCodeSnippet code={MENU_SOURCE} language="tsx" />
      </section>
    </div>
  );
}

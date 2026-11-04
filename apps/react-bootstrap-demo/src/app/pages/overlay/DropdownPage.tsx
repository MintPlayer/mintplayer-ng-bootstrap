import { useState } from 'react';
import type { DropdownSelectEventDetail } from '@mintplayer/ui-core/dropdown';
import { BsDropdownDivider, BsDropdownHeader, BsDropdownItem, BsDropdownMenu, useBsDropdown } from '@mintplayer/react-bootstrap/dropdown';
import { BsCalendar } from '@mintplayer/react-bootstrap/calendar';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `import { BsDropdownDivider, BsDropdownHeader, BsDropdownItem, BsDropdownMenu, useBsDropdown } from '@mintplayer/react-bootstrap/dropdown';

const [props, dropdown] = useBsDropdown({
  content: (
    <BsDropdownMenu onItemSelect={({ value }) => setChosen(String(value))}>
      <BsDropdownHeader>File</BsDropdownHeader>
      <BsDropdownItem value="new">New</BsDropdownItem>
      <BsDropdownItem value="save" disabled>Save</BsDropdownItem>
      <BsDropdownDivider />
      <BsDropdownItem><a href="https://getbootstrap.com">Bootstrap</a></BsDropdownItem>
    </BsDropdownMenu>
  ),
});

<button type="button" className="btn btn-primary" {...props}>Actions</button>
{dropdown}`;

export function DropdownPage() {
  const [chosen, setChosen] = useState<string | null>(null);
  const [menuProps, menu] = useBsDropdown({
    content: (
      <BsDropdownMenu onItemSelect={({ value }: DropdownSelectEventDetail) => setChosen(String(value))}>
        <BsDropdownHeader>File</BsDropdownHeader>
        <BsDropdownItem value="new">New</BsDropdownItem>
        <BsDropdownItem value="open">Open…</BsDropdownItem>
        <BsDropdownItem value="save" disabled>
          Save
        </BsDropdownItem>
        <BsDropdownDivider />
        <BsDropdownItem>
          <a href="https://getbootstrap.com/docs/5.3/components/dropdowns/" target="_blank" rel="noopener noreferrer">
            Bootstrap docs
          </a>
        </BsDropdownItem>
      </BsDropdownMenu>
    ),
  });
  const [endProps, end] = useBsDropdown({
    placement: 'bottom-end',
    sameWidth: true,
    content: (
      <BsDropdownMenu>
        <BsDropdownItem>One</BsDropdownItem>
        <BsDropdownItem>Two</BsDropdownItem>
        <BsDropdownItem>Three</BsDropdownItem>
      </BsDropdownMenu>
    ),
  });
  const [dateProps, date] = useBsDropdown({ hasPopup: 'dialog', content: <BsCalendar /> });

  return (
    <div className="demo-page">
      <h1>Dropdown</h1>
      <p className="text-body-secondary">
        <code>useBsDropdown</code> returns the trigger's props and the panel, rendered at the end of{' '}
        <code>&lt;body&gt;</code> while open. The trigger is a menu button: a click toggles it, ArrowDown and ArrowUp
        open it on the first and the last item. Escape, a click outside, tabbing out or choosing an item closes it,
        and focus returns to the trigger. <code>placement</code> is <code>bottom-start</code> (the default),{' '}
        <code>bottom-end</code>, <code>top-start</code> or <code>top-end</code>; it flips when there is no room.
      </p>

      <section>
        <h2>Menu</h2>
        <div className="d-flex gap-2 overflow-hidden">
          <button type="button" className="btn btn-primary" {...menuProps}>
            Actions
          </button>
          {menu}
          <button type="button" className="btn btn-secondary" {...endProps}>
            Aligned to the end
          </button>
          {end}
        </div>
        <p className="mt-2" data-testid="chosen">
          Chosen: {chosen ?? 'nothing yet'}
        </p>
      </section>

      <section>
        <h2>Any content</h2>
        <p className="text-body-secondary">
          With <code>hasPopup: 'dialog'</code> the panel holds content that is not a menu and takes focus itself.
        </p>
        <button type="button" className="btn btn-primary" {...dateProps}>
          Pick a date
        </button>
        {date}
      </section>

      <section>
        <h2>A menu in place</h2>
        <p className="text-body-secondary">
          <code>BsDropdownMenu</code> works on its own too; give it a <code>label</code>.
        </p>
        <BsDropdownMenu label="Formatting" className="d-inline-block">
          <BsDropdownItem active>Bold</BsDropdownItem>
          <BsDropdownItem>Italic</BsDropdownItem>
          <BsDropdownItem>Underline</BsDropdownItem>
        </BsDropdownMenu>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}

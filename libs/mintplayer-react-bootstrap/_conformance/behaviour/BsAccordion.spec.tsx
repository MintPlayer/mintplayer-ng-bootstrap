import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import type { AccordionTabToggle } from '@mintplayer/react-bootstrap/accordion';

import { render, renderEl } from './harness';

/**
 * `BsAccordion` renders the markup of `@mintplayer/ui-core/accordion` itself:
 * one native `<details>` per item, header in the `<summary>`, body in the
 * region. Items are numbered by the parent, and the number is the item's
 * identity for its ids — a mis-numbered item points its header at another
 * item's region with no error, so the pairing is what is pinned here.
 */

const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLDetailsElement>('details.accordion-item')];
const summary = (row: Element) => row.querySelector('summary')!;
const region = (row: Element) => row.querySelector('[role="region"]')!;

const THREE = (
  <BsAccordion>
    <BsAccordionItem header="One">First body</BsAccordionItem>
    <BsAccordionItem header="Two">Second body</BsAccordionItem>
    <BsAccordionItem header="Three">Third body</BsAccordionItem>
  </BsAccordion>
);

describe('BsAccordion — markup', () => {
  it('renders one row per item inside the .accordion root', async () => {
    const host = await render(THREE);
    expect(host.querySelector('div.accordion')).not.toBeNull();
    expect(rows(host)).toHaveLength(3);
  });

  it('pairs each header with its own region', async () => {
    const host = await render(THREE);
    rows(host).forEach((row) => {
      expect(summary(row).getAttribute('aria-controls')).toBe(region(row).id);
      expect(region(row).getAttribute('aria-labelledby')).toBe(summary(row).id);
    });
  });

  it('keeps the header content and the body content apart', async () => {
    const host = await render(THREE);
    expect(summary(rows(host)[1]).textContent).toBe('Two');
    expect(region(rows(host)[1]).textContent).toBe('Second body');
  });

  // Numbering counts only real items. A separator between two items must not
  // consume an index, or every later pair is off by one.
  it('does not let a foreign child consume an index', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header="One">First</BsAccordionItem>
        <hr />
        <BsAccordionItem header="Two">Second</BsAccordionItem>
      </BsAccordion>,
    );
    const ids = rows(host).map((row) => summary(row).id);
    expect(ids[0]).toMatch(/-h0$/);
    expect(ids[1]).toMatch(/-h1$/);
    expect(host.querySelector('hr')).not.toBeNull();
  });

  it('honours an explicit index for an item that is not a direct child', async () => {
    const host = await render(
      <BsAccordion>
        <div>
          <BsAccordionItem header="Deep" index={4}>
            Body
          </BsAccordionItem>
        </div>
      </BsAccordion>,
    );
    expect(summary(rows(host)[0]).id).toMatch(/-h4$/);
  });

  it('gives two accordions distinct ids', async () => {
    const host = await render(
      <>
        {THREE}
        {THREE}
      </>,
    );
    const ids = rows(host).map((row) => summary(row).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders an empty accordion without error', async () => {
    const host = await render(<BsAccordion />);
    expect(rows(host)).toHaveLength(0);
    expect(host.querySelector('div.accordion')).not.toBeNull();
  });

  it('renders a React node as the header, not only a string', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header={<b data-rich="">Rich</b>}>Body</BsAccordionItem>
      </BsAccordion>,
    );
    expect(summary(rows(host)[0]).querySelector('[data-rich]')?.textContent).toBe('Rich');
  });
});

describe('BsAccordion — state', () => {
  it('groups the rows by name when single-open, and not when multi', async () => {
    const single = await render(THREE);
    expect(new Set(rows(single).map((row) => row.getAttribute('name'))).size).toBe(1);
    const multi = await render(
      <BsAccordion multi>
        <BsAccordionItem header="One">First</BsAccordionItem>
      </BsAccordion>,
    );
    expect(rows(multi)[0].hasAttribute('name')).toBe(false);
  });

  it('marks highlightActiveTab on the root', async () => {
    const el = await renderEl(<BsAccordion highlightActiveTab />, 'div.accordion');
    expect(el.hasAttribute('data-highlight-active')).toBe(true);
  });

  it('opens an initially active item', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header="One" isActive>
          Body
        </BsAccordionItem>
      </BsAccordion>,
    );
    expect(rows(host)[0].open).toBe(true);
  });

  it('takes a disabled item out of the tab order', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header="One" disabled>
          Body
        </BsAccordionItem>
      </BsAccordion>,
    );
    expect(summary(rows(host)[0]).getAttribute('aria-disabled')).toBe('true');
    expect(summary(rows(host)[0]).getAttribute('tabindex')).toBe('-1');
  });
});

describe('BsAccordion — events', () => {
  it('reports a row toggle through onTabToggle', async () => {
    const seen: AccordionTabToggle[] = [];
    const host = await render(
      <BsAccordion onTabToggle={(change) => seen.push(change)}>
        <BsAccordionItem header="One">First</BsAccordionItem>
        <BsAccordionItem header="Two">Second</BsAccordionItem>
      </BsAccordion>,
    );

    await act(async () => {
      const row = rows(host)[1];
      // Flipping `open` fires the native toggle (once, asynchronously), as a click does.
      const toggled = new Promise((resolve) => row.addEventListener('toggle', resolve, { once: true }));
      row.open = true;
      await toggled;
    });

    expect(seen).toEqual([{ index: 1, active: true }]);
  });

  it('forwards its ref to the root element', async () => {
    const ref = React.createRef<HTMLDivElement | null>();
    await render(<BsAccordion ref={ref} />);
    expect(ref.current?.classList.contains('accordion')).toBe(true);
  });
});

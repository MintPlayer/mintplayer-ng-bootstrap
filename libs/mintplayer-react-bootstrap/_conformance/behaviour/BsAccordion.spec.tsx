import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';

import { emit, render, renderEl } from './harness';

/**
 * The accordion's structure is the thing under test. A tab is a header and a
 * body rendered as SIBLINGS — named slots only accept direct children of
 * `<mp-accordion>`, so the header cannot live inside the tab element — and the
 * two halves are paired by index (`h0`/`c0`, `h1`/`c1`, ...). Only the parent
 * knows the order, so `BsAccordion` numbers its items as it renders them.
 *
 * Every failure mode here is silent: mis-numbered slots produce an accordion
 * whose headers open the wrong panels, or no panels at all, with no error.
 */

const headers = (host: HTMLElement) => [...host.querySelectorAll('[accordion-header]')];
const tabs = (host: HTMLElement) => [...host.querySelectorAll('mp-accordion-tab')];

const THREE = (
  <BsAccordion>
    <BsAccordionItem header="One">First body</BsAccordionItem>
    <BsAccordionItem header="Two">Second body</BsAccordionItem>
    <BsAccordionItem header="Three">Third body</BsAccordionItem>
  </BsAccordion>
);

describe('BsAccordion — slot numbering', () => {
  it('renders a header and a tab per item', async () => {
    const host = await render(THREE);
    expect(headers(host)).toHaveLength(3);
    expect(tabs(host)).toHaveLength(3);
  });

  it('numbers the header slots in document order', async () => {
    const host = await render(THREE);
    expect(headers(host).map((h) => h.getAttribute('slot'))).toEqual(['h0', 'h1', 'h2']);
  });

  it('pairs each tab with its header by index', async () => {
    const host = await render(THREE);
    expect(tabs(host).map((t) => t.getAttribute('slot'))).toEqual(['c0', 'c1', 'c2']);
  });

  it('renders header and body as siblings, not nested', async () => {
    const host = await render(THREE);
    expect(headers(host)[0].contains(tabs(host)[0])).toBe(false);
    expect(headers(host)[0].parentElement).toBe(tabs(host)[0].parentElement);
  });

  it('keeps the header content and the body content apart', async () => {
    const host = await render(THREE);
    expect(headers(host)[1].textContent).toBe('Two');
    expect(tabs(host)[1].textContent).toBe('Second body');
  });

  // Numbering counts only real items. A separator or a bare node between two
  // items must not consume an index, or every later pair is off by one.
  it('does not let a foreign child consume an index', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header="One">First</BsAccordionItem>
        <hr />
        <BsAccordionItem header="Two">Second</BsAccordionItem>
      </BsAccordion>,
    );
    expect(headers(host).map((h) => h.getAttribute('slot'))).toEqual(['h0', 'h1']);
    expect(host.querySelector('hr')).not.toBeNull();
  });

  // Only a direct child can be numbered; anything deeper needs the index
  // passed by hand, which is exactly what the prop is documented for.
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
    expect(headers(host)[0].getAttribute('slot')).toBe('h4');
    expect(tabs(host)[0].getAttribute('slot')).toBe('c4');
  });

  it('renders an empty accordion without error', async () => {
    const host = await render(<BsAccordion />);
    expect(headers(host)).toHaveLength(0);
    expect(host.querySelector('mp-accordion')).not.toBeNull();
  });
});

describe('BsAccordion — attribute-shaped props', () => {
  // These reach the element as attributes rather than properties on purpose:
  // React SSR serialises attributes into the HTML, which is what the DSD
  // injector and the no-JS CSS select on. A property would vanish server-side.
  it('omits multi entirely when it is off', async () => {
    const el = await renderEl(<BsAccordion />, 'mp-accordion');
    expect(el.hasAttribute('multi')).toBe(false);
  });

  it('sets multi when it is on', async () => {
    const el = await renderEl(<BsAccordion multi />, 'mp-accordion');
    expect(el.hasAttribute('multi')).toBe(true);
  });

  it('maps highlightActiveTab to its hyphenated attribute', async () => {
    const el = await renderEl(<BsAccordion highlightActiveTab />, 'mp-accordion');
    expect(el.hasAttribute('highlight-active-tab')).toBe(true);
  });

  it('omits the highlight attribute when it is off', async () => {
    const el = await renderEl(<BsAccordion />, 'mp-accordion');
    expect(el.hasAttribute('highlight-active-tab')).toBe(false);
  });

  it('marks an initially open item', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header="One" isActive>
          Body
        </BsAccordionItem>
      </BsAccordion>,
    );
    expect(tabs(host)[0].hasAttribute('is-active')).toBe(true);
  });

  it('marks a disabled item', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header="One" disabled>
          Body
        </BsAccordionItem>
      </BsAccordion>,
    );
    expect(tabs(host)[0].hasAttribute('disabled')).toBe(true);
  });

  it('leaves both off by default', async () => {
    const host = await render(THREE);
    expect(tabs(host)[0].hasAttribute('is-active')).toBe(false);
    expect(tabs(host)[0].hasAttribute('disabled')).toBe(false);
  });

  it('renders a React node as the header, not only a string', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionItem header={<b data-rich="">Rich</b>}>Body</BsAccordionItem>
      </BsAccordion>,
    );
    expect(headers(host)[0].querySelector('[data-rich]')?.textContent).toBe('Rich');
  });
});

describe('BsAccordion — events', () => {
  it('maps the WC toggle event onto onTabToggle', async () => {
    const seen: CustomEvent[] = [];
    const el = await renderEl(
      <BsAccordion onTabToggle={(e) => seen.push(e)} />,
      'mp-accordion',
    );

    await emit(el, 'mp-accordion-tab-toggle', { index: 1, isActive: true });

    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toEqual({ index: 1, isActive: true });
  });
});

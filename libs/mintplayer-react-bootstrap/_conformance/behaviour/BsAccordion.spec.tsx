import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { BsAccordion, BsAccordionTab } from '@mintplayer/react-bootstrap/accordion';
import type { AccordionTabToggle } from '@mintplayer/react-bootstrap/accordion';

import { render } from './harness';

/**
 * `BsAccordion` / `BsAccordionTab` are generated from `@mintplayer/ui-core/accordion`
 * (#458 M4): one native `<details>` per tab, the `header` slot in the
 * `<summary>`, the body in the region. Each tab derives its ids from its own
 * id, so the header/region pairing is what is pinned here.
 */

const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLDetailsElement>('details.accordion-item')];
const summary = (row: Element) => row.querySelector('summary')!;
const region = (row: Element) => row.querySelector('[role="region"]')!;

/** Flip `open` the way a click does: the native toggle fires once, asynchronously. */
const flip = async (row: HTMLDetailsElement, open: boolean) => {
  await act(async () => {
    const toggled = new Promise((resolve) => row.addEventListener('toggle', resolve, { once: true }));
    row.open = open;
    await toggled;
  });
};

const THREE = (
  <BsAccordion>
    <BsAccordionTab header="One">First body</BsAccordionTab>
    <BsAccordionTab header="Two">Second body</BsAccordionTab>
    <BsAccordionTab header="Three">Third body</BsAccordionTab>
  </BsAccordion>
);

describe('BsAccordion — markup', () => {
  it('renders one row per tab inside the .accordion root', async () => {
    const host = await render(THREE);
    expect(host.querySelector('div.accordion')).not.toBeNull();
    expect(rows(host)).toHaveLength(3);
  });

  it('pairs each header with its own region, with ids unique across accordions', async () => {
    const host = await render(
      <>
        {THREE}
        {THREE}
      </>,
    );
    rows(host).forEach((row) => {
      expect(summary(row).getAttribute('aria-controls')).toBe(region(row).id);
      expect(region(row).getAttribute('aria-labelledby')).toBe(summary(row).id);
    });
    const ids = rows(host).map((row) => summary(row).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the header content and the body content apart', async () => {
    const host = await render(THREE);
    expect(summary(rows(host)[1]).textContent).toBe('Two');
    expect(region(rows(host)[1]).textContent).toBe('Second body');
  });

  it('renders a React node as the header, not only a string', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionTab header={<b data-rich="">Rich</b>}>Body</BsAccordionTab>
      </BsAccordion>,
    );
    expect(summary(rows(host)[0]).querySelector('[data-rich]')?.textContent).toBe('Rich');
  });

  it('renders an empty accordion without error', async () => {
    const host = await render(<BsAccordion />);
    expect(rows(host)).toHaveLength(0);
    expect(host.querySelector('div.accordion')).not.toBeNull();
  });
});

describe('BsAccordion — state', () => {
  it('groups the rows by name when single-open, and not when multi', async () => {
    const single = await render(THREE);
    const names = rows(single).map((row) => row.getAttribute('name'));
    expect(names[0]).toBeTruthy();
    expect(new Set(names).size).toBe(1);
    const multi = await render(
      <BsAccordion multi>
        <BsAccordionTab header="One">First</BsAccordionTab>
      </BsAccordion>,
    );
    expect(rows(multi)[0].hasAttribute('name')).toBe(false);
  });

  it('marks highlightActiveTab on the rows', async () => {
    const host = await render(
      <BsAccordion highlightActiveTab>
        <BsAccordionTab header="One">First</BsAccordionTab>
      </BsAccordion>,
    );
    expect(rows(host)[0].hasAttribute('data-highlight-active')).toBe(true);
  });

  it('opens an initially open tab', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionTab header="One" open>
          Body
        </BsAccordionTab>
      </BsAccordion>,
    );
    expect(rows(host)[0].open).toBe(true);
  });

  it('takes a disabled tab out of the tab order', async () => {
    const host = await render(
      <BsAccordion>
        <BsAccordionTab header="One" disabled>
          Body
        </BsAccordionTab>
      </BsAccordion>,
    );
    expect(summary(rows(host)[0]).getAttribute('aria-disabled')).toBe('true');
    expect(summary(rows(host)[0]).getAttribute('tabindex')).toBe('-1');
  });
});

describe('BsAccordion — events', () => {
  it('reports a row toggle through onTabToggle and the tab\'s onOpenChange', async () => {
    const seen: AccordionTabToggle[] = [];
    const opened: boolean[] = [];
    const host = await render(
      <BsAccordion onTabToggle={(change) => seen.push(change)}>
        <BsAccordionTab header="One">First</BsAccordionTab>
        <BsAccordionTab header="Two" onOpenChange={(open) => opened.push(open)}>Second</BsAccordionTab>
      </BsAccordion>,
    );
    await flip(rows(host)[1], true);
    expect(seen).toEqual([{ index: 1, active: true }]);
    expect(opened).toEqual([true]);
  });

  it('closes the open sibling when single-open', async () => {
    const host = await render(THREE);
    await flip(rows(host)[0], true);
    await flip(rows(host)[2], true);
    expect(rows(host).map((row) => row.open)).toEqual([false, false, true]);
  });

  it('forwards its ref to the root element', async () => {
    const ref = React.createRef<HTMLDivElement | null>();
    await render(<BsAccordion ref={ref} />);
    expect(ref.current?.classList.contains('accordion')).toBe(true);
  });
});

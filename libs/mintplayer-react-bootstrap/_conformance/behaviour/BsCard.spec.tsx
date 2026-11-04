import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  BsCard,
  BsCardBody,
  BsCardFooter,
  BsCardGroup,
  BsCardHeader,
  BsCardImg,
  BsCardLink,
  BsCardSubtitle,
  BsCardText,
  BsCardTitle,
} from '@mintplayer/react-bootstrap/card';
import { render, renderEl } from './harness';

/**
 * The card group is generated from `@mintplayer/ui-core/card` (#458 M4). Each
 * part renders Bootstrap's own markup: its class (plus the colour classes from
 * the core), a consumer `className` merged in, and its ref on the element it
 * renders. The image and the link are a box around the `<img>` / `<a>`, which
 * receives the consumer's other attributes.
 */

const PLAIN = [
  { name: 'BsCardBody', Component: BsCardBody, cls: 'card-body' },
  { name: 'BsCardGroup', Component: BsCardGroup, cls: 'card-group' },
  { name: 'BsCardSubtitle', Component: BsCardSubtitle, cls: 'card-subtitle' },
  { name: 'BsCardText', Component: BsCardText, cls: 'card-text' },
  { name: 'BsCardTitle', Component: BsCardTitle, cls: 'card-title' },
  { name: 'BsCardFooter', Component: BsCardFooter, cls: 'card-footer' },
  { name: 'BsCardHeader', Component: BsCardHeader, cls: 'card-header' },
] as const;

describe('React card parts — class merge and ref forwarding', () => {
  it.each(PLAIN)('$name renders its Bootstrap class and appends a consumer className', async ({ Component, cls }) => {
    const Any = Component as React.ElementType;
    const el = await renderEl(<Any className="extra">x</Any>, `.${cls}`);
    expect([...el.classList]).toEqual([cls, 'extra']);
    expect(el.getAttribute('data-mps')).toBe('card');
  });

  it.each(PLAIN)('$name forwards an object ref to the div it renders', async ({ Component, cls }) => {
    const Any = Component as React.ElementType;
    const ref = React.createRef<HTMLElement>();
    const el = await renderEl(<Any ref={ref}>x</Any>, `.${cls}`);
    expect(ref.current).toBe(el);
    expect(el.tagName).toBe('DIV');
  });

  it('BsCardTitle is a level-5 heading unless told otherwise', async () => {
    expect((await renderEl(<BsCardTitle>t</BsCardTitle>, '.card-title')).getAttribute('aria-level')).toBe('5');
    const el = await renderEl(<BsCardTitle level={3}>t</BsCardTitle>, '.card-title');
    expect(el.getAttribute('role')).toBe('heading');
    expect(el.getAttribute('aria-level')).toBe('3');
  });

  it('BsCardLink renders a spaced box around a real link carrying the href', async () => {
    const host = await render(
      <>
        <BsCardLink href="/a">A</BsCardLink>
        <BsCardLink href="/b" aria-label="Bee">B</BsCardLink>
      </>,
    );
    const links = [...host.querySelectorAll<HTMLAnchorElement>('a.card-link')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/a', '/b']);
    expect(links[1].getAttribute('aria-label')).toBe('Bee');
    expect(links.every((a) => a.parentElement!.classList.contains('card-link'))).toBe(true);
  });
});

describe('React card parts — contextual color', () => {
  it.each([
    { name: 'BsCardHeader', Component: BsCardHeader, cls: 'card-header' },
    { name: 'BsCardFooter', Component: BsCardFooter, cls: 'card-footer' },
  ])('$name emits text-bg-{color} between its own class and the consumer class', async ({ Component, cls }) => {
    const el = await renderEl(<Component color="primary" className="extra" />, `.${cls}`);
    expect([...el.classList]).toEqual([cls, 'text-bg-primary', 'extra']);
  });

  it.each([
    { name: 'BsCardHeader', Component: BsCardHeader, cls: 'card-header' },
    { name: 'BsCardFooter', Component: BsCardFooter, cls: 'card-footer' },
  ])('$name emits no text-bg class without a color', async ({ Component, cls }) => {
    const el = await renderEl(<Component />, `.${cls}`);
    expect(el.className).toBe(cls);
  });
});

describe('React BsCard — root', () => {
  it('is a plain div.card, not a custom element', async () => {
    const host = await render(<BsCard>x</BsCard>);
    expect(host.querySelector('mp-card')).toBeNull();
    expect(host.querySelector('div.card')!.textContent).toBe('x');
  });

  it('fills with the colour and its border, keeping a consumer className', async () => {
    const el = await renderEl(<BsCard color="primary" className="h-100" />, '.card');
    expect([...el.classList]).toEqual(['card', 'text-bg-primary', 'border-primary', 'h-100']);
  });

  it('colours only the border when outline is set', async () => {
    const el = await renderEl(<BsCard color="danger" outline />, '.card');
    expect([...el.classList]).toEqual(['card', 'bg-transparent', 'border-danger']);
  });

  it('forwards a callback ref as well as an object ref', async () => {
    const seen: (HTMLDivElement | null)[] = [];
    const host = await render(<BsCardHeader ref={(el) => { seen.push(el); }} />);
    expect(seen[0]).toBe(host.querySelector('.card-header'));
  });
});

describe('React BsCardImg — position', () => {
  it('defaults to card-img-top with an empty alt', async () => {
    const img = await renderEl<HTMLImageElement>(<BsCardImg src="a.png" />, 'img');
    expect(img.className).toBe('card-img-top');
    expect(img.parentElement!.classList.contains('card-img-top')).toBe(true);
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('src')).toBe('a.png');
  });

  it('renders card-img-bottom for position="bottom" and keeps a given alt', async () => {
    const img = await renderEl<HTMLImageElement>(<BsCardImg position="bottom" alt="Chart" />, 'img');
    expect(img.className).toBe('card-img-bottom');
    expect(img.getAttribute('alt')).toBe('Chart');
  });

  it('renders a card-img plus an overlay holding the children for position="overlay"', async () => {
    const host = await render(
      <BsCardImg position="overlay">
        <h5>Caption</h5>
      </BsCardImg>,
    );
    const img = host.querySelector('img')!;
    expect(img.className).toBe('card-img');
    expect(img.nextElementSibling!.className).toBe('card-img-overlay');
    expect(img.nextElementSibling!.querySelector('h5')!.textContent).toBe('Caption');
  });

  it('renders no overlay for a plain image', async () => {
    const host = await render(<BsCardImg position="top">c</BsCardImg>);
    expect(host.querySelector('.card-img-overlay')).toBeNull();
  });
});

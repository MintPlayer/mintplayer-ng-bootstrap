import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
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
 * The card helpers are the only React wrappers with logic of their own: they do
 * not wrap a web component, they render the light-DOM `div`/`img`/`a` that
 * `<mp-card>` slots and the global card sheet styles. Each one owns a class
 * contract (the Bootstrap class, a consumer's `className` merged in, a
 * `text-bg-{color}` modifier) and forwards its ref to the element it renders.
 * `BsCardHeader` additionally promotes a nested nav to `card-header-tabs` /
 * `card-header-pills`, re-applying when `navStyle` or the children change.
 */

const PLAIN = [
  { name: 'BsCardBody', Component: BsCardBody, cls: 'card-body', tag: 'DIV' },
  { name: 'BsCardGroup', Component: BsCardGroup, cls: 'card-group', tag: 'DIV' },
  { name: 'BsCardSubtitle', Component: BsCardSubtitle, cls: 'card-subtitle', tag: 'DIV' },
  { name: 'BsCardText', Component: BsCardText, cls: 'card-text', tag: 'DIV' },
  { name: 'BsCardTitle', Component: BsCardTitle, cls: 'card-title', tag: 'DIV' },
  { name: 'BsCardFooter', Component: BsCardFooter, cls: 'card-footer', tag: 'DIV' },
  { name: 'BsCardHeader', Component: BsCardHeader, cls: 'card-header', tag: 'DIV' },
  { name: 'BsCardLink', Component: BsCardLink, cls: 'card-link', tag: 'A' },
] as const;

describe('React card helpers — class merge and ref forwarding', () => {
  it.each(PLAIN)('$name renders its Bootstrap class and appends a consumer className', async ({ Component, cls }) => {
    const Any = Component as React.ElementType;
    const el = await renderEl(<Any className="extra">x</Any>, `.${cls}`);

    expect([...el.classList]).toEqual([cls, 'extra']);
  });

  it.each(PLAIN)('$name renders only its own class when no className is given', async ({ Component, cls }) => {
    const Any = Component as React.ElementType;
    const el = await renderEl(<Any>x</Any>, `.${cls}`);

    expect(el.className).toBe(cls);
  });

  it.each(PLAIN)('$name forwards an object ref to the element it renders', async ({ Component, cls, tag }) => {
    const Any = Component as React.ElementType;
    const ref = React.createRef<HTMLElement>();
    const el = await renderEl(<Any ref={ref}>x</Any>, `.${cls}`);

    expect(ref.current).toBe(el);
    expect(ref.current!.tagName).toBe(tag);
  });

  it('BsCardLink carries its href', async () => {
    const el = await renderEl<HTMLAnchorElement>(<BsCardLink href="/target">Go</BsCardLink>, 'a.card-link');

    expect(el.getAttribute('href')).toBe('/target');
  });
});

describe('React card helpers — contextual color', () => {
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

describe('React BsCardHeader — navStyle', () => {
  const header = (navStyle?: 'tabs' | 'pills') => (
    <BsCardHeader navStyle={navStyle}>
      <ul className="nav">
        <li>Tab</li>
      </ul>
    </BsCardHeader>
  );

  it('promotes the nested nav to card-header-tabs', async () => {
    const host = await render(header('tabs'));

    expect(host.querySelector('ul')!.classList.contains('card-header-tabs')).toBe(true);
    expect(host.querySelector('ul')!.classList.contains('card-header-pills')).toBe(false);
  });

  it('promotes the nested nav to card-header-pills', async () => {
    const host = await render(header('pills'));

    expect(host.querySelector('ul')!.classList.contains('card-header-pills')).toBe(true);
  });

  it('switches from tabs to pills when navStyle changes, dropping the old class', async () => {
    await render(header('tabs'));
    const host = await render(header('pills'));
    const nav = host.querySelector('ul')!;

    expect(nav.classList.contains('card-header-tabs')).toBe(false);
    expect(nav.classList.contains('card-header-pills')).toBe(true);
  });

  it('removes the promotion when navStyle is cleared', async () => {
    await render(header('tabs'));
    const host = await render(header(undefined));
    const nav = host.querySelector('ul')!;

    expect(nav.classList.contains('card-header-tabs')).toBe(false);
    expect(nav.classList.contains('card-header-pills')).toBe(false);
  });

  it('applies to a nav that arrives in later children', async () => {
    await render(<BsCardHeader navStyle="tabs">Plain</BsCardHeader>);
    const host = await render(
      <BsCardHeader navStyle="tabs">
        <nav>links</nav>
      </BsCardHeader>,
    );

    expect(host.querySelector('nav')!.classList.contains('card-header-tabs')).toBe(true);
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
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('src')).toBe('a.png');
  });

  it('renders card-img-bottom for position="bottom" and keeps a given alt', async () => {
    const img = await renderEl<HTMLImageElement>(<BsCardImg position="bottom" alt="Chart" className="x" />, 'img');

    expect([...img.classList]).toEqual(['card-img-bottom', 'x']);
    expect(img.getAttribute('alt')).toBe('Chart');
  });

  it('renders a card-img plus an overlay holding the children for position="overlay"', async () => {
    const ref = React.createRef<HTMLImageElement>();
    const host = await render(
      <BsCardImg position="overlay" ref={ref} className="x">
        <h5>Caption</h5>
      </BsCardImg>,
    );

    const img = host.querySelector('img')!;
    expect([...img.classList]).toEqual(['card-img', 'x']);
    expect(ref.current).toBe(img);
    expect(img.nextElementSibling!.className).toBe('card-img-overlay');
    expect(img.nextElementSibling!.querySelector('h5')!.textContent).toBe('Caption');
  });

  it('switches from overlay back to a plain image without leaving the overlay behind', async () => {
    await render(<BsCardImg position="overlay">c</BsCardImg>);
    const host = await render(<BsCardImg position="top" />);

    expect(host.querySelector('.card-img-overlay')).toBeNull();
    expect(host.querySelector('img')!.className).toBe('card-img-top');
  });
});

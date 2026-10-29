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
 * The card has no machine and no custom element (PRD #437 wave A): every
 * helper renders plain Bootstrap markup that the page baseline styles. Each
 * one owns a class contract (the Bootstrap class, a consumer's `className`
 * merged in, the colour classes from ui-core/card) and forwards its ref to the
 * element it renders. A nav in a header takes `card-header-tabs` /
 * `card-header-pills` itself.
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

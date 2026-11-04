import { hostCore } from '../../_conformance/host-core';
import {
  cardBodyCore,
  cardCore,
  cardFooterCore,
  cardGroupCore,
  cardHeaderCore,
  cardImgCore,
  cardLinkCore,
  cardSubtitleCore,
  cardTextCore,
  cardTitleCore,
} from './card';

afterEach(() => document.body.replaceChildren());

describe('card cores', () => {
  it('render the card and its caps in their colour', () => {
    expect(hostCore(cardCore, { color: 'primary', outline: true }).props().root['class']).toBe('card bg-transparent border-primary');
    expect(hostCore(cardHeaderCore, { color: null }).props().root['class']).toBe('card-header');
    expect(hostCore(cardFooterCore, { color: 'dark' }).props().root['class']).toBe('card-footer text-bg-dark');
  });

  it('render the plain parts', () => {
    expect([cardBodyCore, cardSubtitleCore, cardTextCore, cardGroupCore].map((core) => hostCore(core, {}).props().root['class']))
      .toEqual(['card-body', 'card-subtitle', 'card-text', 'card-group']);
  });

  it('render the title as a heading of its level, h5 by default', () => {
    expect(hostCore(cardTitleCore, { level: 2 }).props().root).toEqual({ class: 'card-title', role: 'heading', 'aria-level': '2' });
    expect(hostCore(cardTitleCore, { level: undefined as never }).props().root['aria-level']).toBe('5');
  });

  it('render an image, decorative without alt, with an overlay when asked', () => {
    expect(hostCore(cardImgCore, { position: 'overlay', src: '/a.png', alt: null }).props().view).toEqual({
      root: { class: 'card-img card-img-box' },
      img: { class: 'card-img', alt: '' },
      src: '/a.png',
      overlay: { class: 'card-img-overlay' },
    });
    expect(hostCore(cardImgCore, { position: undefined as never, src: null, alt: 'Cat' }).props().view).toMatchObject({ img: { class: 'card-img-top', alt: 'Cat' }, src: undefined, overlay: null });
  });

  it('render a link, with no href when there is none', () => {
    expect(hostCore(cardLinkCore, { href: '/x' }).props().view).toEqual({ root: { class: 'card-link' }, link: { class: 'card-link' }, href: '/x' });
    expect(hostCore(cardLinkCore, { href: null }).props().view.href).toBeUndefined();
  });
});

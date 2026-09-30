import { describe, expect, it } from 'vitest';

import {
  applyHeaderNavStyle,
  applyTextBgClass,
  clearPrefixedClasses,
  COLOR_NAMES,
  isCardColorName,
  isNavTargetNode,
} from './card-classes';

const div = (classes = '') => {
  const el = document.createElement('div');
  if (classes) el.className = classes;
  return el;
};

describe('isCardColorName', () => {
  it.each(COLOR_NAMES.map((name) => [name]))('accepts %s', (name) => {
    expect(isCardColorName(name)).toBe(true);
  });

  it.each([[null], [undefined], [''], ['Primary'], ['purple']])('rejects %s', (value) => {
    expect(isCardColorName(value)).toBe(false);
  });
});

describe('clearPrefixedClasses', () => {
  it('removes every class with the prefix, including adjacent ones, and keeps the rest', () => {
    const el = div('card text-bg-primary text-bg-dark border-info');
    clearPrefixedClasses(el, 'text-bg-');
    expect([...el.classList]).toEqual(['card', 'border-info']);
  });

  it('leaves an element without matching classes untouched', () => {
    const el = div('card');
    clearPrefixedClasses(el, 'border-');
    expect(el.className).toBe('card');
  });
});

describe('applyTextBgClass', () => {
  it('replaces a previous colour with the new one', () => {
    const el = div('card-header text-bg-primary');
    applyTextBgClass(el, 'danger');
    expect([...el.classList]).toEqual(['card-header', 'text-bg-danger']);
  });

  it('clears the colour for null or an unknown name', () => {
    const el = div('text-bg-primary');
    applyTextBgClass(el, null);
    expect(el.className).toBe('');
    el.classList.add('text-bg-info');
    applyTextBgClass(el, 'mauve');
    expect(el.className).toBe('');
  });
});

describe('applyHeaderNavStyle', () => {
  it.each([
    ['a <nav>', '<nav></nav>'],
    ['a <ul>', '<ul></ul>'],
    ['a .nav element', '<div class="nav"></div>'],
  ])('styles %s as tabs', (_what, markup) => {
    const host = div();
    host.innerHTML = markup;
    applyHeaderNavStyle(host, 'tabs');
    expect(host.firstElementChild!.classList.contains('card-header-tabs')).toBe(true);
  });

  it('switches tabs to pills and clears both for null', () => {
    const host = div();
    host.innerHTML = '<ul class="nav"></ul>';
    const nav = host.firstElementChild!;
    applyHeaderNavStyle(host, 'tabs');
    applyHeaderNavStyle(host, 'pills');
    expect([...nav.classList]).toEqual(['nav', 'card-header-pills']);
    applyHeaderNavStyle(host, null);
    expect([...nav.classList]).toEqual(['nav']);
  });

  it('styles only the first nav target', () => {
    const host = div();
    host.innerHTML = '<nav id="a"></nav><ul id="b"></ul>';
    applyHeaderNavStyle(host, 'pills');
    expect(host.querySelector('#a')!.classList.contains('card-header-pills')).toBe(true);
    expect(host.querySelector('#b')!.classList.contains('card-header-pills')).toBe(false);
  });

  it('does nothing without a nav target', () => {
    const host = div();
    host.innerHTML = '<p class="card-title"></p>';
    applyHeaderNavStyle(host, 'tabs');
    expect(host.innerHTML).toBe('<p class="card-title"></p>');
  });
});

describe('isNavTargetNode', () => {
  it.each([
    ['<nav>', document.createElement('nav'), true],
    ['<ul>', document.createElement('ul'), true],
    ['a .nav <div>', div('nav'), true],
    ['a plain <div>', div('card-title'), false],
    ['a text node', document.createTextNode('nav'), false],
  ])('%s -> %s', (_what, node, expected) => {
    expect(isNavTargetNode(node)).toBe(expected);
  });
});

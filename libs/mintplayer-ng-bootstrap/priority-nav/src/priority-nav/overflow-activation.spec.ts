import { isClosingActivation } from './overflow-activation';

describe('isClosingActivation', () => {
  let panel: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    panel = document.createElement('div');
    document.body.appendChild(panel);
  });

  /** The composed path of a click on `target`, as the browser would report it. */
  function pathOf(node: Node | null): EventTarget[] {
    return node ? [node, ...pathOf(node instanceof ShadowRoot ? node.host : node.parentNode)] : [window];
  }

  function add(html: string): HTMLElement {
    panel.insertAdjacentHTML('beforeend', html);
    return panel.lastElementChild as HTMLElement;
  }

  it('closes for a link, a button and menuitem-like roles', () => {
    expect(isClosingActivation(pathOf(add('<a href="#x">x</a>')), panel)).toBe(true);
    expect(isClosingActivation(pathOf(add('<button type="button">x</button>')), panel)).toBe(true);
    expect(isClosingActivation(pathOf(add('<div role="menuitem">x</div>')), panel)).toBe(true);
  });

  it('closes for a click on the content INSIDE a button', () => {
    const icon = add('<button type="button"><span>icon</span></button>').querySelector('span')!;
    expect(isClosingActivation(pathOf(icon), panel)).toBe(true);
  });

  it('keeps open for a nested-menu trigger', () => {
    expect(isClosingActivation(pathOf(add('<button aria-haspopup="menu">x</button>')), panel)).toBe(false);
    expect(isClosingActivation(pathOf(add('<button aria-expanded="false">x</button>')), panel)).toBe(false);
    expect(isClosingActivation(pathOf(add('<button aria-haspopup="false">x</button>')), panel)).toBe(true);
  });

  it('keeps open for disabled controls', () => {
    expect(isClosingActivation(pathOf(add('<button disabled>x</button>')), panel)).toBe(false);
    expect(isClosingActivation(pathOf(add('<a href="#x" aria-disabled="true">x</a>')), panel)).toBe(false);
  });

  it('keeps open for form fields, labels, summary and padding', () => {
    expect(isClosingActivation(pathOf(add('<input>')), panel)).toBe(false);
    expect(isClosingActivation(pathOf(add('<label>x</label>')), panel)).toBe(false);
    expect(isClosingActivation(pathOf(add('<details><summary>x</summary></details>').querySelector('summary')!), panel)).toBe(false);
    expect(isClosingActivation(pathOf(add('<span>text</span>')), panel)).toBe(false);
    expect(isClosingActivation(pathOf(panel), panel)).toBe(false);
  });

  it('a label wrapping its input keeps open from either click', () => {
    const label = add('<label><input type="checkbox"> x</label>');
    expect(isClosingActivation(pathOf(label), panel)).toBe(false);
    expect(isClosingActivation(pathOf(label.querySelector('input')!), panel)).toBe(false);
  });

  it('sees a trigger inside a shadow root through the composed path', () => {
    const host = add('<div></div>');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button aria-haspopup="menu" aria-expanded="false">menu</button>';
    expect(isClosingActivation(pathOf(shadow.querySelector('button')!), panel)).toBe(false);
  });

  it('ignores a click whose path does not pass through the panel', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    expect(isClosingActivation(pathOf(outside), panel)).toBe(false);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { FocusTrap, collectTabbables, containsComposed } from './focus-trap';
import { deepActiveElement } from './focus-restore';

/** Panel whose content is slotted from light DOM — the common case here. */
class SlotPanel extends HTMLElement {
  panel: HTMLElement;
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.panel = document.createElement('div');
    this.panel.appendChild(document.createElement('slot'));
    shadow.appendChild(this.panel);
  }
}
customElements.define('ft-slot-panel', SlotPanel);

function panelWith(html: string): HTMLElement {
  const panel = document.createElement('div');
  panel.innerHTML = html;
  document.body.appendChild(panel);
  return panel;
}

function tab(shift = false): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }));
}

describe('collectTabbables', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('finds tabbables in document order', () => {
    const panel = panelWith('<button id="a"></button><a id="b" href="#x"></a><input id="c">');
    expect(collectTabbables(panel).map((el) => el.id)).toEqual(['a', 'b', 'c']);
  });

  it('skips negative tabindex, disabled, inert and aria-hidden', () => {
    const panel = panelWith(`
      <button id="a"></button>
      <button id="skip1" tabindex="-1"></button>
      <button id="skip2" disabled></button>
      <div inert><button id="skip3"></button></div>
      <button id="skip4" aria-hidden="true"></button>
      <button id="b"></button>
    `);
    expect(collectTabbables(panel).map((el) => el.id)).toEqual(['a', 'b']);
  });

  it('skips a button inside a disabled fieldset', () => {
    // :disabled is inherited, which an own-attribute check would miss.
    const panel = panelWith('<fieldset disabled><button id="skip"></button></fieldset><button id="a"></button>');
    expect(collectTabbables(panel).map((el) => el.id)).toEqual(['a']);
  });

  it('skips display:none and hidden subtrees', () => {
    const panel = panelWith(`
      <div style="display: none"><button id="skip1"></button></div>
      <div hidden><button id="skip2"></button></div>
      <button id="a"></button>
    `);
    expect(collectTabbables(panel).map((el) => el.id)).toEqual(['a']);
  });

  it('follows slots to the light-DOM content actually rendered there', () => {
    // A querySelectorAll inside one root misses slotted consumer content
    // entirely — and for this library that IS the content.
    const host = document.createElement('ft-slot-panel') as SlotPanel;
    const projected = document.createElement('button');
    projected.id = 'projected';
    host.appendChild(projected);
    document.body.appendChild(host);

    expect(collectTabbables(host.panel).map((el) => el.id)).toEqual(['projected']);
  });

  it('uses slot fallback content when nothing is assigned', () => {
    const host = document.createElement('ft-slot-panel') as SlotPanel;
    const slot = host.panel.querySelector('slot')!;
    const fallback = document.createElement('button');
    fallback.id = 'fallback';
    slot.appendChild(fallback);
    document.body.appendChild(host);

    expect(collectTabbables(host.panel).map((el) => el.id)).toEqual(['fallback']);
  });

  it('descends into a nested shadow root', () => {
    const panel = panelWith('');
    const nested = document.createElement('div');
    const shadow = nested.attachShadow({ mode: 'open' });
    const inner = document.createElement('button');
    inner.id = 'inner';
    shadow.appendChild(inner);
    panel.appendChild(nested);

    expect(collectTabbables(panel).map((el) => el.id)).toEqual(['inner']);
  });

  it('treats <summary> as tabbable', () => {
    const panel = panelWith('<details><summary id="s">Title</summary><p>body</p></details>');
    expect(collectTabbables(panel).map((el) => el.id)).toEqual(['s']);
  });
});

describe('containsComposed', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('crosses a slot boundary', () => {
    const host = document.createElement('ft-slot-panel') as SlotPanel;
    const projected = document.createElement('button');
    host.appendChild(projected);
    document.body.appendChild(host);

    // The button's DOM parent is the host, not the panel — only the composed
    // path connects them.
    expect(host.panel.contains(projected)).toBe(false);
    expect(containsComposed(host.panel, projected)).toBe(true);
  });

  it('is false for an unrelated element', () => {
    const panel = panelWith('<button id="a"></button>');
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    expect(containsComposed(panel, outside)).toBe(false);
  });
});

describe('FocusTrap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the first tabbable on activate and returns focus on deactivate', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const panel = panelWith('<button id="a"></button><button id="b"></button>');

    const trap = new FocusTrap(() => panel);
    trap.activate();
    expect((deepActiveElement() as HTMLElement).id).toBe('a');

    trap.deactivate();
    expect(deepActiveElement()).toBe(trigger);
  });

  it('focuses the panel itself when it has no tabbable content', () => {
    // A dialog whose only content is text must still take focus, or the user is
    // never told it opened.
    const panel = panelWith('<p>Just a message.</p>');

    const trap = new FocusTrap(() => panel);
    trap.activate();

    expect(deepActiveElement()).toBe(panel);
    trap.deactivate();
    expect(panel.getAttribute('tabindex')).toBe('-1');
  });

  it('honours an explicit initial focus target', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    const second = panel.querySelector<HTMLElement>('#b')!;

    const trap = new FocusTrap(() => panel, { initialFocus: second });
    trap.activate();

    expect(deepActiveElement()).toBe(second);
    trap.deactivate();
  });

  it('leaves focus alone with initialFocus "none"', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const panel = panelWith('<button id="a"></button>');

    const trap = new FocusTrap(() => panel, { initialFocus: 'none' });
    trap.activate();

    expect(deepActiveElement()).toBe(trigger);
    trap.deactivate();
  });

  it('wraps Tab from the last tabbable back to the first', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    const trap = new FocusTrap(() => panel);
    trap.activate();
    panel.querySelector<HTMLElement>('#b')!.focus();

    tab();

    expect((deepActiveElement() as HTMLElement).id).toBe('a');
    trap.deactivate();
  });

  it('wraps Shift+Tab from the first tabbable back to the last', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    const trap = new FocusTrap(() => panel);
    trap.activate();

    tab(true);

    expect((deepActiveElement() as HTMLElement).id).toBe('b');
    trap.deactivate();
  });

  it('pulls focus back into the panel if it escaped', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const trap = new FocusTrap(() => panel);
    trap.activate();
    outside.focus();

    tab();

    expect((deepActiveElement() as HTMLElement).id).toBe('a');
    trap.deactivate();
  });

  it('lets Tab through when the enabled gate is closed', () => {
    // An inner trap must not fight its parent's while both are open.
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    const trap = new FocusTrap(() => panel, { enabled: () => false });
    trap.activate();
    panel.querySelector<HTMLElement>('#b')!.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    trap.deactivate();
  });

  it('stops listening after deactivate', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    const trap = new FocusTrap(() => panel);
    trap.activate();
    trap.deactivate();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('does not return focus to a detached trigger', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const panel = panelWith('<button id="a"></button>');

    const trap = new FocusTrap(() => panel);
    trap.activate();
    trigger.remove();

    expect(() => trap.deactivate()).not.toThrow();
  });

  it('activate() is idempotent', () => {
    const panel = panelWith('<button id="a"></button><button id="b"></button>');
    const trap = new FocusTrap(() => panel);
    trap.activate();
    panel.querySelector<HTMLElement>('#b')!.focus();
    trap.activate(); // must not re-run initial focus

    expect((deepActiveElement() as HTMLElement).id).toBe('b');
    trap.deactivate();
  });
});

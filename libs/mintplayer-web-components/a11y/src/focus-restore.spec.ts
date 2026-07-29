import { describe, it, expect, afterEach, vi } from 'vitest';
import { FocusRestore, deepActiveElement } from './focus-restore';

/** Host with an open shadow root holding a rebuildable list of buttons. */
class ListHost extends HTMLElement {
  container!: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.container = document.createElement('div');
    shadow.appendChild(this.container);
  }

  /** Destroy and recreate every row — the pattern the primitive exists for. */
  render(keys: string[]): void {
    this.container.innerHTML = '';
    for (const key of keys) {
      const row = document.createElement('button');
      row.dataset['focusKey'] = key;
      row.textContent = key;
      this.container.appendChild(row);
    }
  }

  row(key: string): HTMLElement | null {
    return this.container.querySelector<HTMLElement>(`[data-focus-key="${key}"]`);
  }
}
customElements.define('fr-list-host', ListHost);

/** Wraps a button in its own shadow root, to exercise nested-root resolution. */
class NestedHost extends HTMLElement {
  button: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.button = document.createElement('button');
    this.button.textContent = 'nested';
    shadow.appendChild(this.button);
  }
}
customElements.define('fr-nested-host', NestedHost);

function makeHost(keys: string[]): ListHost {
  const el = document.createElement('fr-list-host') as ListHost;
  document.body.appendChild(el);
  el.render(keys);
  return el;
}

function restoreFor(el: ListHost, announce?: (m: string) => void) {
  return new FocusRestore(() => el.shadowRoot, {
    selector: 'button',
    nameOf: (node) => node.textContent ?? 'Item',
    announce,
  });
}

describe('deepActiveElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves through a nested shadow root', () => {
    const el = document.createElement('fr-nested-host') as NestedHost;
    document.body.appendChild(el);
    el.button.focus();

    // document.activeElement stops at the host; the primitive must not.
    expect(document.activeElement).toBe(el);
    expect(deepActiveElement()).toBe(el.button);
  });
});

describe('FocusRestore', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not move focus when it was outside the root', () => {
    // The regression that matters most: a rebuild driven by an unrelated data
    // change must never steal focus from elsewhere on the page.
    const el = makeHost(['a', 'b', 'c']);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const focusRestore = restoreFor(el);
    focusRestore.capture();
    el.render(['a', 'b', 'c']);

    expect(focusRestore.restore()).toBe('unchanged');
    expect(deepActiveElement()).toBe(outside);
  });

  it('re-focuses the same logical row after a rebuild, silently', () => {
    const announce = vi.fn();
    const el = makeHost(['a', 'b', 'c']);
    el.row('b')!.focus();

    const focusRestore = restoreFor(el, announce);
    focusRestore.capture();
    el.render(['a', 'b', 'c']);

    expect(focusRestore.restore()).toBe('same');
    expect(deepActiveElement()).toBe(el.row('b'));
    // Surviving the rebuild is the normal case — announcing it every keystroke
    // would train the user to ignore the live region.
    expect(announce).not.toHaveBeenCalled();
  });

  it('survives a rebuild that reorders rows, following the key not the index', () => {
    const el = makeHost(['a', 'b', 'c']);
    el.row('c')!.focus();

    const focusRestore = restoreFor(el);
    focusRestore.capture();
    el.render(['c', 'b', 'a']);

    expect(focusRestore.restore()).toBe('same');
    expect(deepActiveElement()).toBe(el.row('c'));
  });

  it('clamps to the row at the same index when the captured row is gone, and announces', () => {
    const announce = vi.fn();
    const el = makeHost(['a', 'b', 'c']);
    el.row('b')!.focus();

    const focusRestore = restoreFor(el, announce);
    focusRestore.capture();
    el.render(['a', 'c']); // 'b' removed; index 1 is now 'c'

    expect(focusRestore.restore()).toBe('neighbour');
    expect(deepActiveElement()).toBe(el.row('c'));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce.mock.calls[0][0]).toContain('c');
  });

  it('clamps to the last row when the captured row was last', () => {
    const el = makeHost(['a', 'b', 'c']);
    el.row('c')!.focus();

    const focusRestore = restoreFor(el);
    focusRestore.capture();
    el.render(['a']);

    expect(focusRestore.restore()).toBe('neighbour');
    expect(deepActiveElement()).toBe(el.row('a'));
  });

  it('falls back to the container, made focusable, when nothing survives', () => {
    const announce = vi.fn();
    const el = makeHost(['a']);
    el.row('a')!.focus();

    const focusRestore = restoreFor(el, announce);
    focusRestore.capture();
    el.render([]);

    expect(focusRestore.restore()).toBe('container');
    expect(el.container.getAttribute('tabindex')).toBe('-1');
    expect(deepActiveElement()).toBe(el.container);
    expect(announce).toHaveBeenCalledWith('Nothing left to focus.');
  });

  it('ignores a focused node that was slotted from light DOM', () => {
    // A shadow-root rebuild does not destroy slotted content, so capturing it
    // would mean re-focusing a node that never moved.
    const el = makeHost(['a']);
    const slot = document.createElement('slot');
    el.container.appendChild(slot);
    const light = document.createElement('button');
    el.appendChild(light);
    light.focus();

    const focusRestore = restoreFor(el);
    focusRestore.capture();

    expect(focusRestore.restore()).toBe('unchanged');
  });

  it('resolves a key on a node inside a nested shadow root', () => {
    const el = makeHost([]);
    const nested = document.createElement('fr-nested-host') as NestedHost;
    nested.dataset['focusKey'] = 'nested-1';
    el.container.appendChild(nested);
    nested.button.focus();

    const focusRestore = new FocusRestore(() => el.shadowRoot, {
      selector: 'fr-nested-host',
      // The focused node is the inner button; the restorable candidate is the
      // host, so the key has to come off the enclosing custom element.
      keyOf: (node) => node.dataset['focusKey'] ?? null,
    });
    focusRestore.capture();

    // capture() walked into the nested root and found the button, whose own
    // key is absent — so nothing is recorded and focus is left alone.
    expect(focusRestore.restore()).toBe('unchanged');
    expect(deepActiveElement()).toBe(nested.button);
  });

  it('around() captures, rebuilds and restores in one call', () => {
    const el = makeHost(['a', 'b']);
    el.row('a')!.focus();

    const focusRestore = restoreFor(el);
    const result = focusRestore.around(() => {
      el.render(['a', 'b']);
      return 'rebuilt';
    });

    expect(result).toBe('rebuilt');
    expect(deepActiveElement()).toBe(el.row('a'));
  });

  it('restores even when the rebuild throws', () => {
    const el = makeHost(['a', 'b']);
    el.row('a')!.focus();

    const focusRestore = restoreFor(el);
    expect(() =>
      focusRestore.around(() => {
        el.render(['a', 'b']);
        throw new Error('rebuild failed');
      }),
    ).toThrow('rebuild failed');

    expect(deepActiveElement()).toBe(el.row('a'));
  });

  it('restore() without a capture is a no-op', () => {
    const el = makeHost(['a']);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    expect(restoreFor(el).restore()).toBe('unchanged');
    expect(deepActiveElement()).toBe(outside);
  });
});

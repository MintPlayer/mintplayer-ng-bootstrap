import { defineCore, type CoreBag } from './component';
import { applyElementBag, directiveInputs, directiveServerBag, elementCore, EMPTY_APPLIED_BAG } from './element-core';

interface Inputs {
  readonly size?: number;
}
interface State {
  readonly pressed: boolean;
}

/** A directive core with state, an attach step and an output. */
const toggleCore = defineCore<Inputs, State, CoreBag, { pressedChange: boolean }>({
  state: () => ({ pressed: false }),
  view: ({ inputs, state, hydrated }) => ({
    class: ['toggle', inputs.size ? `toggle-${inputs.size}` : null].filter(Boolean).join(' '),
    'aria-pressed': state.pressed ? 'true' : 'false',
    'data-live': hydrated,
  }),
  attach: (api) => {
    const onClick = () => {
      api.setState({ pressed: !api.state().pressed });
      api.emit('pressedChange', api.state().pressed);
    };
    api.host.addEventListener('click', onClick);
    return () => api.host.removeEventListener('click', onClick);
  },
});

const options = { idPrefix: 'bs-toggle', bag: (props: CoreBag) => ({ ...props, 'data-mps': 'toggle' }) };

describe('elementCore (#458 directives)', () => {
  it('renders the bag at once, keeping the consumer classes', () => {
    const el = document.createElement('button');
    el.className = 'mine';
    elementCore(toggleCore, el, { size: 2 }, options);
    expect(el.className).toBe('mine toggle toggle-2');
    expect(el.getAttribute('aria-pressed')).toBe('false');
    expect(el.getAttribute('data-mps')).toBe('toggle');
    expect(el.hasAttribute('data-live')).toBe(false);
  });

  it('attaches, re-renders on state, emits a lowercased DOM event, and detaches', () => {
    const el = document.createElement('button');
    const host = elementCore(toggleCore, el, {}, options);
    host.attach();
    expect(el.getAttribute('data-live')).toBe('');
    const events: boolean[] = [];
    el.addEventListener('pressedchange', (e) => events.push((e as CustomEvent<boolean>).detail));
    el.click();
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(events).toEqual([true]);
    host.detach();
    el.click();
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('updates with new inputs, removing the classes it no longer wants', () => {
    const el = document.createElement('button');
    const host = elementCore(toggleCore, el, { size: 2 }, options);
    host.update({ size: 3 });
    expect(el.className).toBe('toggle toggle-3');
    host.update({});
    expect(el.className).toBe('toggle');
  });

  it('computes the server bag purely', () => {
    expect(directiveServerBag(toggleCore, { size: 1 }, options)).toEqual({ class: 'toggle toggle-1', 'aria-pressed': 'false', 'data-live': false, 'data-mps': 'toggle' });
  });

  it('merges a binding over the manifest defaults', () => {
    expect(directiveInputs<Inputs>({ size: 1 }, undefined)).toEqual({ size: 1 });
    expect(directiveInputs<Inputs>({ size: 1 }, { size: 4 })).toEqual({ size: 4 });
  });

  it('refuses a core that consumes a context', () => {
    const consuming = defineCore<Inputs, State, CoreBag, Record<never, never>, string>({
      consume: { name: 'x', defaultValue: '' },
      view: () => ({}),
    });
    expect(() => elementCore(consuming, document.createElement('div'), {}, options)).toThrow(/component form/);
  });

  it('applyElementBag diffs attributes and drops false/null', () => {
    const el = document.createElement('div');
    const first = applyElementBag(el, EMPTY_APPLIED_BAG, { a: '1', b: true, c: null });
    expect(el.getAttribute('a')).toBe('1');
    expect(el.getAttribute('b')).toBe('');
    expect(el.hasAttribute('c')).toBe(false);
    applyElementBag(el, first, { a: null, b: false });
    expect(el.hasAttribute('a')).toBe(false);
    expect(el.hasAttribute('b')).toBe(false);
  });
});

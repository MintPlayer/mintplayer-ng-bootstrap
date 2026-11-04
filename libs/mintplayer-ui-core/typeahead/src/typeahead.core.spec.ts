import { el, hostCore } from '../../_conformance/host-core';
import { typeaheadCore, type TypeaheadInputs, type TypeaheadView } from './typeahead.core';
import type { TypeaheadSubscribable } from './types';

const inputs = (o: Partial<TypeaheadInputs> = {}): TypeaheadInputs => ({
  provider: null,
  debounceMs: 0,
  minLength: 1,
  disabled: false,
  itemText: null,
  itemKey: null,
  name: 'q',
  inputLabel: 'Search',
  loadingLabel: null,
  noResultsLabel: null,
  resultsLabel: null,
  errorText: null,
  value: '',
  ...o,
});

const markup = ({ view }: { view: TypeaheadView }) =>
  el('div', view.root,
    el('input', view.input),
    el('div', view.listbox, ...view.options.map((o) => el('div', o.bag, o.text))));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const mount = (o: Partial<TypeaheadInputs> = {}) => {
  const h = hostCore(typeaheadCore, inputs(o), { models: ['value'], markup });
  h.attach();
  const input = () => h.host.querySelector<HTMLInputElement>('input[role=combobox]')!;
  const type = async (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    h.render();
  };
  const key = (k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    h.render();
    return event;
  };
  return { ...h, input, type, key };
};

describe('typeaheadCore view', () => {
  it('renders a named combobox with an empty listbox and no status on the server', () => {
    const h = hostCore(typeaheadCore, inputs({ value: 'ab', errorText: 'Required' }), { models: ['value'], label: 'Find' });
    const { view } = h.props();
    expect(view.root['class']).toBe('mp-typeahead');
    expect(view.input).toMatchObject({ class: 'form-control', type: 'text', name: 'q' });
    expect(view.term).toBe('ab');
    expect(view.listbox['class']).toBe('dropdown-menu');
    expect(view.options).toEqual([]);
    expect(view.live.attrs['class']).toBe('visually-hidden');
    expect(view.error).toMatchObject({ text: 'Required' });
  });

  it('keys and labels its options with itemKey / itemText, falling back to the index', () => {
    const h = hostCore(typeaheadCore, inputs({ itemText: (i) => i.name, itemKey: (i) => i.id }));
    h.state().items = [{ id: 7, name: 'Seven' }, { id: null, name: 'None' }];
    const { options } = h.props().view;
    expect(options.map((o) => [o.key, o.text, o.bag['data-index']])).toEqual([['7', 'Seven', '0'], ['1', 'None', '1']]);
    expect(options[0].bag['class']).toBe('dropdown-item');
  });

  it('defaults the item text to item.text, else String(item)', () => {
    const h = hostCore(typeaheadCore, inputs(), { models: ['value'] });
    h.state().items = [{ text: 'A' }, 'b'];
    expect(h.props().view.options.map((o) => o.text)).toEqual(['A', 'b']);
  });

  it('starts from an empty term without a value', () => {
    const h = hostCore(typeaheadCore, inputs({ value: undefined as never }), { models: ['value'] });
    expect(h.state().value).toBe('');
  });
});

describe('typeaheadCore attached', () => {
  afterEach(() => document.body.replaceChildren());

  it('queries the provider on input, opens, highlights with the arrows and picks with Enter', async () => {
    const provider = vi.fn(async (term: string) => [`${term}1`, `${term}2`]);
    const h = mount({ provider });
    await h.type('ab');
    expect(provider).toHaveBeenCalledWith('ab', expect.anything());
    expect(h.events('searchStart')).toEqual(['ab']);
    expect(h.changes('value')).toEqual(['ab']);
    expect(h.state()).toMatchObject({ open: true, status: 'ready', items: ['ab1', 'ab2'] });
    expect(h.events('openChange')).toEqual([true]);

    expect(h.key('ArrowDown').defaultPrevented).toBe(true);
    expect(h.state().activeIndex).toBe(0);
    h.key('Enter');
    expect(h.events('itemSelect')).toEqual([{ item: 'ab1', value: 'ab1' }]);
    expect(h.input().value).toBe('ab1');
    expect(h.state().open).toBe(false);
  });

  it('submits the term on Enter with nothing highlighted, and ignores keys it does not handle', async () => {
    const h = mount();
    h.input().value = 'x';
    expect(h.key('a').defaultPrevented).toBe(false);
    h.key('Enter');
    expect(h.events('termSubmit')).toHaveLength(1);
  });

  it('picks a clicked option, keeping focus in the input on mousedown', async () => {
    const h = mount({ provider: async () => ['one', 'two'] });
    await h.type('o');
    const option = h.host.querySelectorAll<HTMLElement>('[role=option]')[1];
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    option.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    option.click();
    expect(h.events('itemSelect')).toEqual([{ item: 'two', value: 'two' }]);

    const elsewhere = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    h.input().dispatchEvent(elsewhere);
    expect(elsewhere.defaultPrevented).toBe(false);
    h.host.click();
    expect(h.events('itemSelect')).toHaveLength(1);
  });

  it('closes on blur', async () => {
    const h = mount({ provider: async () => ['one'] });
    await h.type('o');
    h.input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(h.state().open).toBe(false);
  });

  it('ignores events from other elements in the host', async () => {
    const provider = vi.fn(async () => []);
    const h = mount({ provider });
    const other = h.host.appendChild(document.createElement('input'));
    other.dispatchEvent(new Event('input', { bubbles: true }));
    other.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    other.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();
    expect(provider).not.toHaveBeenCalled();
  });

  it('adapts an observable source: first emission answers, an error is reported', async () => {
    const unsubscribe = vi.fn();
    const ok: TypeaheadSubscribable<readonly string[]> = {
      subscribe: (o) => {
        o.next(['x']);
        return { unsubscribe };
      },
    };
    const h = mount({ provider: () => ok });
    await h.type('x');
    expect(h.state().items).toEqual(['x']);
    expect(unsubscribe).toHaveBeenCalled();

    const failing: TypeaheadSubscribable<readonly string[]> = {
      subscribe: (o) => {
        o.error(new Error('boom'));
        return { unsubscribe: () => undefined };
      },
    };
    h.setInputs({ provider: () => failing });
    await h.type('y');
    expect(h.events('loadError')).toHaveLength(1);
    expect(h.state().status).toBe('error');
  });

  it('adapts an observable that completes empty, and unsubscribes one aborted by a newer term', async () => {
    const empty: TypeaheadSubscribable<readonly string[]> = {
      subscribe: (o) => {
        o.complete();
        return { unsubscribe: () => undefined };
      },
    };
    const h = mount({ provider: () => empty });
    await h.type('e');
    expect(h.state().items).toEqual([]);

    const unsubscribe = vi.fn();
    let calls = 0;
    const pending: TypeaheadSubscribable<readonly string[]> = {
      subscribe: (o) => {
        if (++calls > 1) o.next(['late']);
        return { unsubscribe };
      },
    };
    h.setInputs({ provider: () => pending });
    h.input().value = 'p';
    h.input().dispatchEvent(new Event('input', { bubbles: true }));
    await h.type('pq');
    expect(unsubscribe).toHaveBeenCalled();
    expect(h.state().items).toEqual(['late']);
  });

  it('applies a consumer value as a programmatic set, never echoing its own term', async () => {
    const provider = vi.fn(async () => ['a']);
    const h = mount({ provider });
    h.setInputs({ value: 'set' });
    expect(h.input().value).toBe('set');
    expect(h.state().value).toBe('set');
    expect(provider).not.toHaveBeenCalled();
    expect(h.changes('value')).toEqual([]);

    await h.type('typed');
    h.setInputs({ value: 'typed' });
    expect(h.state().value).toBe('typed');
    h.setInputs({ disabled: true });
    expect(h.props().view.input['disabled']).toBeTruthy();
  });

  it('focuses the input through its method, and stops listening once disposed', async () => {
    const provider = vi.fn(async () => []);
    const h = mount({ provider });
    h.call('focus');
    expect(document.activeElement).toBe(h.input());
    const input = h.input();
    h.dispose();
    input.value = 'z';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(provider).not.toHaveBeenCalled();
    h.setInputs({ value: 'after' });
  });
});

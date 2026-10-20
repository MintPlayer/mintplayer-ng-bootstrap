import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-typeahead';
import type { MpTypeahead } from './mp-typeahead';
import type { TypeaheadProvider } from '@mintplayer/ui-core/typeahead';

/**
 * The web-component front of the headless typeahead core (#436): light tier,
 * form-associated, the same ARIA bags as the Angular/React/Vue fronts.
 */
interface Item {
  text: string;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const settle = async (el: MpTypeahead<Item>) => {
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
};

function mount(attrs = '') {
  document.body.innerHTML = `<mp-typeahead ${attrs}></mp-typeahead>`;
  return document.querySelector('mp-typeahead') as unknown as MpTypeahead<Item>;
}

function recordingProvider() {
  const calls: { term: string; signal: AbortSignal }[] = [];
  const answers: ReturnType<typeof deferred<Item[]>>[] = [];
  const provider: TypeaheadProvider<Item> = (term, { signal }) => {
    calls.push({ term, signal });
    const d = deferred<Item[]>();
    answers.push(d);
    return d.promise;
  };
  return { provider, calls, answers };
}

function type(el: MpTypeahead<Item>, text: string) {
  const input = el.querySelector('input') as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const key = (el: MpTypeahead<Item>, k: string) => {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  el.querySelector('input')!.dispatchEvent(event);
  return event;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('mp-typeahead', () => {
  it('renders in the light DOM with the combobox contract and the scope stamped', async () => {
    const el = mount('input-label="Street"');
    await el.updateComplete;
    expect(el.shadowRoot).toBeNull();
    const input = el.querySelector('input')!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-label')).toBe('Street');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('data-mps')).toBe('typeahead');
    const listbox = el.querySelector('ul[role=listbox]') as HTMLElement;
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(listbox.hidden).toBe(true);
  });

  it('a host aria-label wins over input-label', async () => {
    const el = mount('input-label="Street" aria-label="Straat"');
    await el.updateComplete;
    expect(el.querySelector('input')!.getAttribute('aria-label')).toBe('Straat');
  });

  it('debounce-ms from the attribute; a superseded request is aborted and its late answer ignored', async () => {
    vi.useFakeTimers();
    const el = mount('debounce-ms="100"');
    const { provider, calls, answers } = recordingProvider();
    el.provider = provider;
    type(el, 'k');
    vi.advanceTimersByTime(50);
    type(el, 'kru');
    vi.advanceTimersByTime(100);
    expect(calls.map((c) => c.term)).toEqual(['kru']);
    type(el, 'kruis');
    vi.advanceTimersByTime(100);
    expect(calls[0].signal.aborted).toBe(true);
    vi.useRealTimers();
    answers[1].resolve([{ text: 'Kruishoutem' }]);
    answers[0].resolve([{ text: 'stale' }]);
    await settle(el);
    expect([...el.querySelectorAll('li[role=option]')].map((o) => o.textContent?.trim())).toEqual(['Kruishoutem']);
  });

  it('itemRenderer receives the term; keyboard moves aria-activedescendant and Enter picks', async () => {
    const el = mount('debounce-ms="0"');
    const { provider, answers } = recordingProvider();
    el.provider = provider;
    el.itemRenderer = (item, term) => {
      const b = document.createElement('b');
      b.textContent = `${item.text}|${term}`;
      return b;
    };
    const selected: unknown[] = [];
    el.addEventListener('select', (e) => selected.push((e as CustomEvent).detail));
    const changes: string[] = [];
    el.addEventListener('value-change', (e) => changes.push((e as CustomEvent).detail.value));

    type(el, 'ker');
    answers[0].resolve([{ text: 'Kerkstraat' }, { text: 'Kerkhof' }]);
    await settle(el);
    const options = [...el.querySelectorAll('li[role=option]')];
    expect(options[0].querySelector('b')!.textContent).toBe('Kerkstraat|ker');
    expect(options[0].querySelector('b')!.hasAttribute('data-mps')).toBe(false);

    expect(key(el, 'ArrowDown').defaultPrevented).toBe(true);
    key(el, 'ArrowDown');
    await el.updateComplete;
    const input = el.querySelector('input')!;
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id);
    key(el, 'Enter');
    await el.updateComplete;
    expect(selected).toEqual([{ item: { text: 'Kerkhof' }, value: 'Kerkhof' }]);
    expect(changes).toEqual(['ker', 'Kerkhof']);
    expect(el.value).toBe('Kerkhof');
    expect(el.selectedItem).toEqual({ text: 'Kerkhof' });
    expect(input.value).toBe('Kerkhof');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('value is a property that never queries, and the form value is the term under name', async () => {
    const el = mount('name="street" debounce-ms="0"');
    const { provider, calls } = recordingProvider();
    el.provider = provider;
    el.value = 'Molenstraat';
    await el.updateComplete;
    expect(el.querySelector('input')!.value).toBe('Molenstraat');
    expect(calls).toEqual([]);
    expect(el.formValue()).toBe('Molenstraat');
    el.removeAttribute('name');
    expect(el.formValue()).toBeNull();
    // The inner input never submits on its own.
    expect(el.querySelector('input')!.hasAttribute('name')).toBe(false);
  });

  it('disabled disables the input and closes the list', async () => {
    const el = mount('debounce-ms="0"');
    el.provider = recordingProvider().provider;
    type(el, 'k');
    await el.updateComplete;
    el.disabled = true;
    await el.updateComplete;
    const input = el.querySelector('input')!;
    expect(input.disabled).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('error-text wires aria-errormessage and aria-describedby to the message node', async () => {
    const el = mount('error-text="Pick a street"');
    await el.updateComplete;
    const input = el.querySelector('input')!;
    const id = input.getAttribute('aria-errormessage')!;
    expect(id).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector(`[id="${id}"]`)!.textContent).toBe('Pick a street');
  });
});

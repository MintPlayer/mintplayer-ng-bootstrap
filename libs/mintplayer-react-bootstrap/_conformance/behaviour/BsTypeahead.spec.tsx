import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BsTypeahead } from '../../typeahead/src/BsTypeahead';
import type { TypeaheadProvider } from '@mintplayer/ui-core/typeahead';

/**
 * The React front of the headless typeahead core (#436): same machine, same
 * ARIA bags, React's own JSX. Covers the issue's four capabilities through the
 * React API: debounce, abortable provider, renderItem with the term, and a
 * controlled value with onValueChange.
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

let container: HTMLElement;
let root: Root;
let calls: { term: string; signal: AbortSignal }[];
let answers: ReturnType<typeof deferred<Item[]>>[];
let provider: TypeaheadProvider<Item>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  calls = [];
  answers = [];
  provider = (term, { signal }) => {
    calls.push({ term, signal });
    const d = deferred<Item[]>();
    answers.push(d);
    return d.promise;
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const input = () => container.querySelector('input') as HTMLInputElement;
const options = () => Array.from(container.querySelectorAll('li[role=option]')) as HTMLElement[];

/** React listens to `input` events through its own value tracker; set the value the way the browser does. */
async function type(text: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input(), text);
    input().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function resolve(index: number, items: Item[]) {
  await act(async () => {
    answers[index].resolve(items);
    await answers[index].promise;
  });
}

describe('BsTypeahead (React front)', () => {
  it('renders the combobox contract from the core', async () => {
    await act(async () => root.render(<BsTypeahead provider={provider} debounceMs={0} inputLabel="Street" />));
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-label')).toBe('Street');
    expect(input().getAttribute('autocomplete')).toBe('off');
    const listbox = container.querySelector('ul[role=listbox]') as HTMLElement;
    expect(input().getAttribute('aria-controls')).toBe(listbox.id);
    expect(listbox.hidden).toBe(true);
    expect(container.querySelector('.mp-typeahead')!.getAttribute('data-mps')).toBe('typeahead');
  });

  it('debounces, aborts a superseded request and ignores its late answer', async () => {
    vi.useFakeTimers();
    await act(async () => root.render(<BsTypeahead provider={provider} debounceMs={200} />));
    await type('k');
    await act(async () => vi.advanceTimersByTime(100));
    await type('kru');
    await act(async () => vi.advanceTimersByTime(200));
    expect(calls.map((c) => c.term)).toEqual(['kru']);
    await type('kruis');
    await act(async () => vi.advanceTimersByTime(200));
    expect(calls[0].signal.aborted).toBe(true);
    vi.useRealTimers();
    await resolve(1, [{ text: 'Kruishoutem' }]);
    await resolve(0, [{ text: 'stale' }]);
    expect(options().map((o) => o.textContent)).toEqual(['Kruishoutem']);
  });

  it('renderItem receives the item and the current term', async () => {
    await act(async () =>
      root.render(
        <BsTypeahead<Item>
          provider={provider}
          debounceMs={0}
          renderItem={(item, term) => (
            <>
              <b>{item.text}</b>|<i>{term}</i>
            </>
          )}
        />,
      ),
    );
    await type('kru');
    await resolve(0, [{ text: 'Kruishoutem' }]);
    expect(options()[0].querySelector('b')!.textContent).toBe('Kruishoutem');
    expect(options()[0].querySelector('i')!.textContent).toBe('kru');
  });

  it('a controlled value follows typing and picks; onSelect gets the item; selection by keyboard', async () => {
    const onSelect = vi.fn();
    function Host() {
      const [value, setValue] = useState('');
      return (
        <>
          <BsTypeahead<Item> provider={provider} debounceMs={0} value={value} onValueChange={setValue} onSelect={onSelect} />
          <output>{value}</output>
        </>
      );
    }
    await act(async () => root.render(<Host />));
    await type('ker');
    expect(container.querySelector('output')!.textContent).toBe('ker');
    await resolve(0, [{ text: 'Kerkstraat' }, { text: 'Kerkhof' }]);
    await act(async () => {
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    await act(async () => {
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[1].id);
    await act(async () => {
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledWith({ text: 'Kerkhof' }, 'Kerkhof');
    expect(container.querySelector('output')!.textContent).toBe('Kerkhof');
    expect(input().value).toBe('Kerkhof');
  });

  it('a consumer value write sets the text without querying', async () => {
    await act(async () => root.render(<BsTypeahead provider={provider} debounceMs={0} value="Molenstraat" />));
    expect(input().value).toBe('Molenstraat');
    expect(calls).toEqual([]);
  });
});

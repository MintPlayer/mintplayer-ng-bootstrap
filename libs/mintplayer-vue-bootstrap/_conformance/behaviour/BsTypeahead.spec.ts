import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import BsTypeahead from '../../typeahead/src/BsTypeahead.vue';
import type { TypeaheadProvider } from '@mintplayer/ui-core/typeahead';

/**
 * The Vue front of the headless typeahead core (#436): same machine, same
 * ARIA bags, Vue's own template. Covers the issue's four capabilities through
 * the Vue API: debounce, abortable provider, the #item scoped slot with the
 * term, and v-model.
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

const open: VueWrapper[] = [];
afterEach(() => {
  while (open.length) open.pop()!.unmount();
  vi.useRealTimers();
});

function setup() {
  const calls: { term: string; signal: AbortSignal }[] = [];
  const answers: ReturnType<typeof deferred<Item[]>>[] = [];
  const provider: TypeaheadProvider<Item> = (term, { signal }) => {
    calls.push({ term, signal });
    const d = deferred<Item[]>();
    answers.push(d);
    return d.promise;
  };
  return { calls, answers, provider };
}

function mountHost(render: () => ReturnType<typeof h>) {
  const wrapper = mount(defineComponent({ setup: () => render }), { attachTo: document.body });
  open.push(wrapper);
  return wrapper;
}

async function type(wrapper: VueWrapper, text: string) {
  await wrapper.find('input').setValue(text);
}

async function settle(promise: Promise<unknown>) {
  await promise;
  await nextTick();
  await nextTick();
}

describe('BsTypeahead (Vue front)', () => {
  it('renders the combobox contract from the core and forwards attrs except role', async () => {
    const { provider } = setup();
    const wrapper = mountHost(() => h(BsTypeahead, { provider, debounceMs: 0, inputLabel: 'Street', id: 'street', role: 'none' }));
    const input = wrapper.find('input').element;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.id).toBe('street');
    expect(input.getAttribute('aria-label')).toBe('Street');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    const listbox = wrapper.find('ul[role=listbox]').element as HTMLElement;
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(listbox.hidden).toBe(true);
  });

  it('debounces, aborts a superseded request and ignores its late answer', async () => {
    vi.useFakeTimers();
    const { provider, calls, answers } = setup();
    const wrapper = mountHost(() => h(BsTypeahead, { provider, debounceMs: 200 }));
    await type(wrapper, 'k');
    vi.advanceTimersByTime(100);
    await type(wrapper, 'kru');
    vi.advanceTimersByTime(200);
    expect(calls.map((c) => c.term)).toEqual(['kru']);
    await type(wrapper, 'kruis');
    vi.advanceTimersByTime(200);
    expect(calls[0].signal.aborted).toBe(true);
    vi.useRealTimers();
    answers[1].resolve([{ text: 'Kruishoutem' }]);
    answers[0].resolve([{ text: 'stale' }]);
    await settle(Promise.all([answers[0].promise, answers[1].promise]));
    expect(wrapper.findAll('li[role=option]').map((o) => o.text())).toEqual(['Kruishoutem']);
  });

  it('the #item slot receives the item and the current term', async () => {
    const { provider, answers } = setup();
    const wrapper = mountHost(() =>
      h(BsTypeahead, { provider, debounceMs: 0 }, { item: ({ item, term }: { item: Item; term: string }) => [h('b', item.text), h('i', term)] }),
    );
    await type(wrapper, 'kru');
    answers[0].resolve([{ text: 'Kruishoutem' }]);
    await settle(answers[0].promise);
    expect(wrapper.find('li[role=option] b').text()).toBe('Kruishoutem');
    expect(wrapper.find('li[role=option] i').text()).toBe('kru');
  });

  it('v-model follows typing and picks; select emits the item; keyboard picks', async () => {
    const { provider, answers } = setup();
    const model = ref('');
    const onSelect = vi.fn();
    const wrapper = mountHost(() =>
      h(BsTypeahead, {
        provider,
        debounceMs: 0,
        modelValue: model.value,
        'onUpdate:modelValue': (v: string) => (model.value = v),
        onSelect,
      }),
    );
    await type(wrapper, 'ker');
    expect(model.value).toBe('ker');
    answers[0].resolve([{ text: 'Kerkstraat' }, { text: 'Kerkhof' }]);
    await settle(answers[0].promise);
    const input = wrapper.find('input');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-activedescendant')).toBe(wrapper.findAll('li[role=option]')[1].attributes('id'));
    await input.trigger('keydown', { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith({ text: 'Kerkhof' }, 'Kerkhof');
    expect(model.value).toBe('Kerkhof');
  });

  it('a v-model write sets the text without querying', async () => {
    const { provider, calls } = setup();
    const model = ref('');
    const wrapper = mountHost(() => h(BsTypeahead, { provider, debounceMs: 0, modelValue: model.value }));
    model.value = 'Molenstraat';
    await nextTick();
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Molenstraat');
    expect(calls).toEqual([]);
  });
});

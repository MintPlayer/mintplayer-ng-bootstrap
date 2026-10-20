import { TypeaheadMachine } from './typeahead-machine';
import type { TypeaheadOptions, TypeaheadProvider } from './types';

interface Item {
  text: string;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function make(overrides: Partial<TypeaheadOptions<Item>> = {}) {
  const calls: { term: string; signal: AbortSignal }[] = [];
  const answers: ReturnType<typeof deferred<Item[]>>[] = [];
  const provider: TypeaheadProvider<Item> = (term, { signal }) => {
    calls.push({ term, signal });
    const d = deferred<Item[]>();
    answers.push(d);
    return d.promise;
  };
  const cb = {
    onChange: vi.fn(),
    onSelect: vi.fn(),
    onSubmit: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onSearch: vi.fn(),
    onError: vi.fn(),
  };
  const machine = new TypeaheadMachine<Item>({ id: 'ta', provider, debounceMs: 0, ...cb, ...overrides });
  return { machine, calls, answers, cb };
}

describe('TypeaheadMachine', () => {
  afterEach(() => vi.useRealTimers());

  it('starts idle and closed with the given value', () => {
    const { machine } = make({ value: 'kru' });
    expect(machine.snapshot).toMatchObject({ term: 'kru', open: false, status: 'idle', items: [], activeIndex: -1, selectedItem: null });
  });

  it('typing opens the list in loading state, queries the trimmed term, and announces the count', async () => {
    const { machine, calls, answers, cb } = make();
    machine.setTerm(' kru ');
    expect(cb.onChange).toHaveBeenCalledWith(' kru ');
    expect(machine.snapshot).toMatchObject({ open: true, status: 'loading' });
    expect(cb.onOpen).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.term)).toEqual(['kru']);
    expect(cb.onSearch).toHaveBeenCalledWith('kru');
    answers[0].resolve([{ text: 'Kruishoutem' }, { text: 'Kruibeke' }]);
    await flush();
    expect(machine.snapshot).toMatchObject({ status: 'ready', activeIndex: -1, announcement: '2 results found' });
    expect(machine.snapshot.items).toHaveLength(2);
  });

  it('a superseded request is aborted and its late answer never lands', async () => {
    const { machine, calls, answers } = make();
    machine.setTerm('kru');
    machine.setTerm('kruis');
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].signal.aborted).toBe(false);
    answers[1].resolve([{ text: 'Kruishoutem' }]);
    answers[0].resolve([{ text: 'stale' }]);
    await flush();
    expect(machine.snapshot.items.map((i) => i.text)).toEqual(['Kruishoutem']);
  });

  it('debounces: only the settled term is requested, after the quiet time', () => {
    vi.useFakeTimers();
    const { machine, calls } = make({ debounceMs: 200 });
    machine.setTerm('k');
    vi.advanceTimersByTime(100);
    machine.setTerm('kru');
    vi.advanceTimersByTime(199);
    expect(calls).toEqual([]);
    expect(machine.snapshot).toMatchObject({ open: true, status: 'loading' });
    vi.advanceTimersByTime(1);
    expect(calls.map((c) => c.term)).toEqual(['kru']);
  });

  it('a term below min-length closes, clears and aborts without querying', () => {
    const { machine, calls } = make({ minLength: 2 });
    machine.setTerm('kr');
    expect(calls).toHaveLength(1);
    machine.setTerm('k');
    expect(calls).toHaveLength(1);
    expect(calls[0].signal.aborted).toBe(true);
    expect(machine.snapshot).toMatchObject({ open: false, status: 'idle', items: [] });
    machine.setTerm('');
    expect(calls).toHaveLength(1);
  });

  it('a rejected provider shows no suggestions, reports the error, and an AbortError is silent', async () => {
    const { machine, answers, cb } = make();
    machine.setTerm('kru');
    answers[0].reject(new Error('boom'));
    await flush();
    expect(machine.snapshot).toMatchObject({ status: 'error', items: [], open: true });
    expect(cb.onError).toHaveBeenCalledTimes(1);
    machine.setTerm('krui');
    answers[1].reject(new DOMException('Aborted', 'AbortError'));
    await flush();
    expect(cb.onError).toHaveBeenCalledTimes(1);
  });

  it('pick writes the item text, remembers the item, closes, and fires onChange + onSelect', async () => {
    const { machine, answers, cb } = make();
    machine.setTerm('kru');
    answers[0].resolve([{ text: 'Kruishoutem' }]);
    await flush();
    machine.pick(0);
    expect(machine.snapshot).toMatchObject({ term: 'Kruishoutem', open: false, selectedItem: { text: 'Kruishoutem' } });
    expect(cb.onChange).toHaveBeenLastCalledWith('Kruishoutem');
    expect(cb.onSelect).toHaveBeenCalledWith({ text: 'Kruishoutem' }, 'Kruishoutem');
    expect(cb.onClose).toHaveBeenCalledTimes(1);
  });

  it('any later text change clears the pick; setValue never queries and clears it too', async () => {
    const { machine, answers, calls, cb } = make();
    machine.setTerm('kru');
    answers[0].resolve([{ text: 'Kruishoutem' }]);
    await flush();
    machine.pick(0);
    machine.setTerm('Kruishoutem!');
    expect(machine.snapshot.selectedItem).toBeNull();
    const before = calls.length;
    cb.onChange.mockClear();
    machine.setValue('Molenstraat');
    expect(machine.snapshot).toMatchObject({ term: 'Molenstraat', selectedItem: null, open: false, status: 'idle' });
    expect(calls).toHaveLength(before);
    expect(cb.onChange).not.toHaveBeenCalled();
  });

  describe('keyboard', () => {
    async function ready() {
      const t = make();
      t.machine.setTerm('kru');
      t.answers[0].resolve([{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
      await flush();
      return t;
    }

    it('ArrowDown/ArrowUp move the active option without wrapping; Home/End jump', async () => {
      const { machine } = await ready();
      expect(machine.keydown('ArrowDown')).toBe(true);
      expect(machine.snapshot.activeIndex).toBe(0);
      machine.keydown('ArrowDown');
      machine.keydown('ArrowDown');
      machine.keydown('ArrowDown');
      expect(machine.snapshot.activeIndex).toBe(2);
      machine.keydown('ArrowUp');
      expect(machine.snapshot.activeIndex).toBe(1);
      machine.keydown('Home');
      expect(machine.snapshot.activeIndex).toBe(0);
      machine.keydown('End');
      expect(machine.snapshot.activeIndex).toBe(2);
    });

    it('ArrowUp from nothing active lands on the last option', async () => {
      const { machine } = await ready();
      machine.keydown('ArrowUp');
      expect(machine.snapshot.activeIndex).toBe(2);
    });

    it('Enter picks the active option, else submits; Escape closes; Tab closes but is not consumed', async () => {
      const { machine, cb } = await ready();
      machine.keydown('ArrowDown');
      expect(machine.keydown('Enter')).toBe(true);
      expect(cb.onSelect).toHaveBeenCalledWith({ text: 'A' }, 'A');
      expect(machine.snapshot.open).toBe(false);
      expect(machine.keydown('Enter')).toBe(true);
      expect(cb.onSubmit).toHaveBeenCalledWith('A');

      machine.keydown('ArrowDown'); // re-open with the items we still have
      expect(machine.snapshot.open).toBe(true);
      expect(machine.keydown('Escape')).toBe(true);
      expect(machine.snapshot.open).toBe(false);
      expect(machine.keydown('Escape')).toBe(false);

      machine.keydown('ArrowDown');
      expect(machine.keydown('Tab')).toBe(false);
      expect(machine.snapshot.open).toBe(false);
    });

    it('ignores modifier chords', async () => {
      const { machine } = await ready();
      expect(machine.keydown('ArrowDown', { ctrlKey: true })).toBe(false);
      expect(machine.snapshot.activeIndex).toBe(-1);
    });
  });

  it('disabled closes, aborts and refuses typing', () => {
    const { machine, calls, cb } = make();
    machine.setTerm('kru');
    machine.setDisabled(true);
    expect(calls[0].signal.aborted).toBe(true);
    expect(machine.snapshot).toMatchObject({ disabled: true, open: false });
    machine.setTerm('x');
    expect(machine.snapshot.term).toBe('kru');
    expect(cb.onChange).toHaveBeenCalledTimes(1);
  });

  it('changing the provider reference cancels and clears; the same reference is a no-op', () => {
    const { machine, calls } = make();
    const same = machine.provider;
    machine.setTerm('kru');
    machine.provider = same;
    expect(calls[0].signal.aborted).toBe(false);
    machine.provider = async () => [];
    expect(calls[0].signal.aborted).toBe(true);
    expect(machine.snapshot).toMatchObject({ open: false, items: [], status: 'idle' });
  });

  it('the announcement clears itself after the configured time', async () => {
    vi.useFakeTimers();
    const { machine, answers } = make({ announcementClearMs: 1500 });
    machine.setTerm('kru');
    answers[0].resolve([{ text: 'A' }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(machine.snapshot.announcement).toBe('1 result found');
    vi.advanceTimersByTime(1500);
    expect(machine.snapshot.announcement).toBe('');
  });

  it('destroy aborts the in-flight request and drops the late answer', async () => {
    const { machine, calls, answers } = make();
    machine.setTerm('kru');
    machine.destroy();
    expect(calls[0].signal.aborted).toBe(true);
    answers[0].resolve([{ text: 'late' }]);
    await flush();
    expect(machine.snapshot.items).toEqual([]);
  });
});

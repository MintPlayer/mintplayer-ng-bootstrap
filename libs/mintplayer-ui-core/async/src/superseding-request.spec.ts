import { abortError, SupersedingRequest } from './superseding-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('SupersedingRequest', () => {
  afterEach(() => vi.useRealTimers());

  it('runs synchronously with no debounce and resolves the value', async () => {
    const runner = new SupersedingRequest();
    const result = await runner.run(async () => 'a');
    expect(result).toEqual({ value: 'a', aborted: false });
    expect(runner.pending).toBe(false);
  });

  it('aborts the previous call when a newer one starts, and drops its late answer', async () => {
    const runner = new SupersedingRequest();
    const first = deferred<string>();
    const second = deferred<string>();
    const signals: AbortSignal[] = [];
    const p1 = runner.run(({ signal }) => {
      signals.push(signal);
      return first.promise;
    });
    const p2 = runner.run(({ signal }) => {
      signals.push(signal);
      return second.promise;
    });
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    second.resolve('kruishoutem');
    first.resolve('stale');
    expect(await p1).toEqual({ value: null, aborted: true });
    expect(await p2).toEqual({ value: 'kruishoutem', aborted: false });
  });

  it('treats an AbortError rejection as a cancellation, never as an error', async () => {
    const onError = vi.fn();
    const runner = new SupersedingRequest({ onError });
    const result = await runner.run(async () => {
      throw abortError();
    });
    expect(result.aborted).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports other errors and resolves null without aborted', async () => {
    const onError = vi.fn();
    const runner = new SupersedingRequest({ onError });
    const result = await runner.run(async () => {
      throw new Error('boom');
    });
    expect(result).toEqual({ value: null, aborted: false });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('debounces: only the last call inside the window runs, after the window', async () => {
    vi.useFakeTimers();
    const runner = new SupersedingRequest({ debounceMs: 200 });
    const calls: string[] = [];
    const p1 = runner.run(async () => calls.push('k'));
    vi.advanceTimersByTime(100);
    const p2 = runner.run(async () => calls.push('kru'));
    vi.advanceTimersByTime(199);
    expect(calls).toEqual([]);
    expect(runner.pending).toBe(true);
    vi.advanceTimersByTime(1);
    expect(await p1).toEqual({ value: null, aborted: true });
    expect(await p2).toEqual({ value: 1, aborted: false });
    expect(calls).toEqual(['kru']);
  });

  it('cancel aborts an in-flight call and clears a waiting one', async () => {
    vi.useFakeTimers();
    const runner = new SupersedingRequest({ debounceMs: 50 });
    const waiting = runner.run(async () => 'never');
    runner.cancel();
    vi.advanceTimersByTime(100);
    expect(await waiting).toEqual({ value: null, aborted: true });

    const live = new SupersedingRequest();
    const d = deferred<string>();
    let seen: AbortSignal | undefined;
    const p = live.run(({ signal }) => {
      seen = signal;
      return d.promise;
    });
    live.cancel();
    expect(seen?.aborted).toBe(true);
    d.resolve('late');
    expect(await p).toEqual({ value: null, aborted: true });
  });

  it('dispose refuses further runs', async () => {
    const runner = new SupersedingRequest();
    runner.dispose();
    const call = vi.fn(async () => 'x');
    expect(await runner.run(call)).toEqual({ value: null, aborted: true });
    expect(call).not.toHaveBeenCalled();
  });
});

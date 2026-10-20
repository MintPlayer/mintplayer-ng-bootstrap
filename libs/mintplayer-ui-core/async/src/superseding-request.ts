/**
 * What every abortable provider call receives. Aborts when a newer call
 * supersedes this one, when the owner cancels, or when it is disposed.
 */
export interface AbortableRequest {
  readonly signal: AbortSignal;
}

export interface SupersedingRequestOptions {
  /** Quiet time before a call runs; every `run` inside it restarts the wait. 0 runs synchronously. */
  debounceMs?: number;
  /** Receives errors that are not aborts. Aborts are always silent. */
  onError?: (error: unknown) => void;
  /** Replaced in tests. */
  now?: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
}

export interface RunResult<R> {
  /** The settled value, or `null` when the call was superseded or cancelled. */
  value: R | null;
  /** True when `value` is null because of an abort rather than a null result. */
  aborted: boolean;
}

/**
 * One lifecycle for "the latest request wins": debounce, abort the previous
 * call, hand the new call an `AbortSignal`, and drop its answer if it was
 * superseded before it settled. Lifted from the tree-select search path
 * (`mp-tree-select` runRequest + onSearchInput) so the typeahead, tree-select
 * and both datatable fetch paths share it instead of carrying three copies.
 *
 * An `AbortError` thrown by the call counts as a cancellation and is never
 * reported; any other rejection reaches `onError` and resolves `{ value: null,
 * aborted: false }`.
 */
export class SupersedingRequest {
  #controller: AbortController | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #disposed = false;
  readonly #debounceMs: number;
  readonly #onError?: (error: unknown) => void;
  readonly #timers: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };

  constructor(options: SupersedingRequestOptions = {}) {
    this.#debounceMs = Math.max(0, options.debounceMs ?? 0);
    this.#onError = options.onError;
    this.#timers = options.now ?? { setTimeout, clearTimeout };
  }

  get debounceMs(): number {
    return this.#debounceMs;
  }

  /** True while a call is in flight or waiting out the debounce. */
  get pending(): boolean {
    return this.#timer !== null || this.#controller !== null;
  }

  /**
   * Schedule `call`. Any waiting or in-flight call is cancelled first. Resolves
   * when this call settles, or with `aborted: true` as soon as it is superseded.
   */
  run<R>(call: (request: AbortableRequest) => Promise<R>): Promise<RunResult<R>> {
    if (this.#disposed) return Promise.resolve({ value: null, aborted: true });
    this.cancel();
    if (this.#debounceMs === 0) return this.#start(call);
    return new Promise<RunResult<R>>((resolve) => {
      const timer = this.#timers.setTimeout(() => {
        if (this.#timer === timer) this.#timer = null;
        this.#onTimerCleared.delete(timer);
        void this.#start(call).then(resolve);
      }, this.#debounceMs);
      this.#timer = timer;
      // A later `run`/`cancel` clears the timer; settle this promise as aborted then.
      this.#onTimerCleared.set(timer, () => resolve({ value: null, aborted: true }));
    });
  }

  /** Cancel the waiting or in-flight call, if any. */
  cancel(): void {
    if (this.#timer !== null) {
      this.#timers.clearTimeout(this.#timer);
      this.#onTimerCleared.get(this.#timer)?.();
      this.#onTimerCleared.delete(this.#timer);
      this.#timer = null;
    }
    if (this.#controller) {
      this.#controller.abort();
      this.#controller = null;
    }
  }

  /** Cancel and refuse further runs. */
  dispose(): void {
    this.cancel();
    this.#disposed = true;
  }

  readonly #onTimerCleared = new Map<ReturnType<typeof setTimeout>, () => void>();

  async #start<R>(call: (request: AbortableRequest) => Promise<R>): Promise<RunResult<R>> {
    const controller = new AbortController();
    this.#controller = controller;
    try {
      const value = await call({ signal: controller.signal });
      if (controller.signal.aborted) return { value: null, aborted: true };
      return { value, aborted: false };
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return { value: null, aborted: true };
      this.#onError?.(error);
      return { value: null, aborted: false };
    } finally {
      if (this.#controller === controller) this.#controller = null;
    }
  }
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/** The rejection an abortable call should throw when it notices `signal.aborted`. */
export function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

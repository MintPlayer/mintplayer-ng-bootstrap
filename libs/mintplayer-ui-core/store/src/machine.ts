/**
 * A readable store: the current immutable snapshot and a way to be told when it
 * changes. This is the whole contract a front needs to bridge a core into its own
 * reactivity (Angular `signal`, React `useSyncExternalStore`, Vue `shallowRef`,
 * Lit `requestUpdate`). No reactivity library lives in a core.
 */
export interface Store<S extends object> {
  /** The current state. A new object every time it changes; never mutated in place. */
  readonly snapshot: S;
  /** Called with the new snapshot after every committed change. Returns the unsubscribe. */
  subscribe(listener: (snapshot: S) => void): () => void;
}

/** The snapshot type of a store or machine, for bridges generic over the machine class. */
export type SnapshotOf<M> = M extends Store<infer S> ? S : never;

/**
 * Base class for component cores.
 *
 * Commands mutate state only through {@link update}; each committed update
 * replaces the snapshot with a new object and notifies subscribers once, after
 * the outermost {@link batch} ends. A command that touches several keys therefore
 * costs one render per front, which is what the four-front bridge spike (S1 in
 * docs/prd/typeahead-wc-436.md) asserts.
 */
export abstract class Machine<S extends object> implements Store<S> {
  #state: S;
  readonly #listeners = new Set<(snapshot: S) => void>();
  #depth = 0;
  #dirty = false;
  #destroyed = false;

  protected constructor(initial: S) {
    this.#state = initial;
  }

  get snapshot(): S {
    return this.#state;
  }

  subscribe(listener: (snapshot: S) => void): () => void {
    if (this.#destroyed) return () => undefined;
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /**
   * Merge `patch` into the snapshot. Keys whose value is identical (`Object.is`)
   * are ignored; if nothing changed, nothing is notified. The patch may be a
   * function of the current snapshot, for read-modify-write commands.
   */
  protected update(patch: Partial<S> | ((current: S) => Partial<S>)): void {
    if (this.#destroyed) return;
    const next = typeof patch === 'function' ? patch(this.#state) : patch;
    const keys = Object.keys(next) as (keyof S)[];
    const changed = keys.some((key) => !Object.is(this.#state[key], next[key]));
    if (!changed) return;
    this.#state = { ...this.#state, ...next };
    this.#dirty = true;
    if (this.#depth === 0) this.#flush();
  }

  /** Run `fn` with notifications held back until it returns. Nests. */
  protected batch(fn: () => void): void {
    this.#depth += 1;
    try {
      fn();
    } finally {
      this.#depth -= 1;
      if (this.#depth === 0) this.#flush();
    }
  }

  /** Drop every subscriber and refuse further updates. Subclasses abort their work first. */
  destroy(): void {
    this.#destroyed = true;
    this.#listeners.clear();
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  #flush(): void {
    if (!this.#dirty) return;
    this.#dirty = false;
    const snapshot = this.#state;
    // Copy: a listener may unsubscribe (or subscribe another) while we iterate.
    [...this.#listeners].forEach((listener) => listener(snapshot));
  }
}

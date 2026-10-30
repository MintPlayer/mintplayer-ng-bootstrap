/**
 * The runtime contract of a compiled component (PRD #437 D10).
 *
 * A component is a headless core (this file's `ComponentCore`), a view
 * template (`templates/<name>.view.vue`) and a manifest
 * (`<group>.component.ts`). `@mintplayer/nx-component-compiler` generates the
 * Angular, React, Vue and Lit components from the three; each of them hosts
 * the core through its front's `useCore` helper, which owns the parts every
 * front used to write by hand: inputs and internal state, the deterministic
 * id, the hydrated flag, the client-only attachment, events, and context
 * handed from a component to its descendants.
 *
 * Everything here is plain data and functions: no DOM until `attach`, no
 * reactivity library. `view` is pure, so a server render and the first client
 * render agree.
 */

/** An attribute bag, as `connect()` functions return them. */
export type CoreBag = Record<string, string | number | boolean | null>;

/**
 * A two-way binding a view hands a composed child: `v-model:x="view.binding"`
 * reads `value` into the child's model input and calls `set` with each change.
 */
export interface ModelBinding<T> {
  readonly value: T;
  readonly set: (value: T) => void;
}

/**
 * A value handed from a component to its descendants: `provide` on the outer
 * core, `consume` on the inner one. Each front maps it onto its own mechanism
 * (an Angular `InjectionToken`, a React context, a Vue `provide` key, an
 * ancestor walk in Lit); the object itself is the identity.
 */
export interface CoreContext<T> {
  readonly name: string;
  readonly defaultValue: T;
}

export function defineContext<T>(name: string, defaultValue: T): CoreContext<T> {
  return { name, defaultValue };
}

/**
 * One child a content query found (the manifest's `content`): the inputs the
 * consumer declared on it and on the `within` wrapper around it, if any. They
 * are as written: React and Vue read the declaration, not a component, so an
 * omitted input is missing rather than defaulted, and Vue's boolean shorthand is `''`.
 */
export interface ContentChild<I = Record<string, unknown>, W = Record<string, unknown>> {
  readonly inputs: Readonly<Partial<I>>;
  readonly within: Readonly<Partial<W>> | null;
}

function sameRecord(a: object | null, b: object | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return sameInputs(a, b);
}

/** Two query results with the same entries: lets a front keep the previous array, so the input is unchanged. */
export function sameContent(a: readonly ContentChild[], b: readonly ContentChild[]): boolean {
  return a.length === b.length && a.every((entry, i) => sameRecord(entry.inputs, b[i].inputs) && sameRecord(entry.within, b[i].within));
}

/** A declared boolean as a content query reports it: `true`, `''` (an attribute), `'true'`. */
export function contentFlag(value: unknown): boolean {
  return value === true || value === '' || value === 'true';
}

/** What `view` and `provide` see. */
export interface ViewArgs<I, S, C, E = Record<never, never>> {
  readonly inputs: Readonly<I>;
  readonly state: Readonly<S>;
  /** Deterministic per instance: identical on the server and on hydration. */
  readonly id: string;
  /** False on the server and for the first client render (PRD D9). */
  readonly hydrated: boolean;
  /** The consumed context's value, or its default without a provider. */
  readonly context: C;
  /** The consumer's `aria-label` on the component, which names its role node. */
  readonly label: string | null;
  /**
   * The live api, for a handler the view hands a composed child (an `@output`
   * handler, a `ModelBinding`'s `set`): null on the server and before attaching.
   * Never call it from `view` itself, which stays pure.
   */
  readonly api: () => CoreApi<I, S, E> | null;
}

/** What `attach`, `inputsChanged` and the methods may do. Client only. */
export interface CoreApi<I, S, E> {
  /** The template's root element (the host itself where the root is `mp-host`). */
  readonly host: HTMLElement;
  inputs(): Readonly<I>;
  state(): Readonly<S>;
  setState(patch: Partial<S>): void;
  /** Fires an output: an Angular `output()`, a React `on<Name>` prop, a Vue emit, a DOM event in Lit. */
  emit<K extends keyof E & string>(name: K, detail: E[K]): void;
}

/** A core's method implementations, from the public signatures `M` (`{ toggle(force?: boolean): void }`). */
export type CoreMethods<I, S, E, M> = {
  readonly [K in keyof M]: M[K] extends (...args: infer A) => infer R ? (api: CoreApi<I, S, E>, ...args: A) => R : never;
};

export interface ComponentCore<I, S, P, E = Record<never, never>, C = undefined, PC = undefined, M = Record<never, never>> {
  /** The context this component reads. */
  readonly consume?: CoreContext<C>;
  /** The context this component hands its descendants, with `provide` computing the value. */
  readonly provides?: CoreContext<PC>;
  /**
   * Internal state, seeded from the first inputs. `seed` is what `prefetch`
   * resolved for these inputs, on the server after it settles and on the client
   * from the transfer state (#448); absent when there is none.
   */
  state?(inputs: Readonly<I>, seed?: unknown): S;
  /**
   * Server only: data the first render needs, loaded before the server
   * serializes. The bridges run it through `runPrefetch`
   * (`@mintplayer/ui-core/transfer-state`), which owns the timeout; the result
   * must be JSON, because it is handed to the client under `transferKey`.
   * Return undefined when there is nothing to load.
   */
  prefetch?(inputs: Readonly<I>, signal: AbortSignal): Promise<unknown> | undefined;
  /**
   * The key the prefetched seed is transferred under: request identity, never
   * instance identity, so server and client agree whatever else renders around
   * them. Undefined turns both the prefetch and the transfer off.
   */
  transferKey?(inputs: Readonly<I>): string | undefined;
  /**
   * A seed that arrives after the state was created: the inputs that name the
   * prefetch (a `fetch`, a `stateKey`) were delivered late, after an async step
   * of the consumer's own. Returns the state with the seed applied, or `state`
   * unchanged when the seed answers another query. Called before those inputs
   * reach `inputsChanged`, so the core can recognise its seeded data there.
   */
  adopt?(state: Readonly<S>, inputs: Readonly<I>, seed: unknown): S;
  /** The template's props. Pure. */
  view(args: ViewArgs<I, S, C, E>): P;
  /**
   * Attributes for the front's own host element where the template root is NOT
   * the host (Angular and Lit only; React and Vue have no host). An `mp-host`
   * template needs none: its root's bag lands on the host.
   */
  host?(props: P): CoreBag;
  provide?(args: ViewArgs<I, S, C, E>): PC;
  /** Wires DOM behaviour after the first client render; returns its disposer. */
  attach?(api: CoreApi<I, S, E>): (() => void) | void;
  /** An input changed after `attach`. `prev` holds the inputs before the change. */
  inputsChanged?(api: CoreApi<I, S, E>, prev: Readonly<I>): void;
  /** Public methods, exposed on the Angular component, the Lit element and the Vue instance. */
  readonly methods?: CoreMethods<I, S, E, M>;
}

/** Identity, typed: `export const navbarCore = defineCore<NavbarInputs, ...>({ ... })`. */
export function defineCore<I, S, P, E = Record<never, never>, C = undefined, PC = undefined, M = Record<never, never>>(
  core: ComponentCore<I, S, P, E, C, PC, M>,
): ComponentCore<I, S, P, E, C, PC, M> {
  return core;
}

/** Shallow equality of two input objects. */
export function sameInputs(a: object, b: object): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/**
 * The part of hosting a core that is the same in every front: state, the api
 * and the attach/inputsChanged lifecycle. A front supplies how to read inputs,
 * how to store state reactively, and how to emit; it calls `attachTo` after its
 * first client render and `inputs` whenever it sees new inputs.
 */
export interface CoreRuntime<I, S, E> {
  /** The live api, or null before `attachTo`. */
  readonly api: CoreApi<I, S, E> | null;
  attachTo(host: HTMLElement): void;
  /** Report the current inputs; calls `inputsChanged` when attached and they differ from the last ones seen. */
  inputs(inputs: Readonly<I>): void;
  call(name: string, args: unknown[]): unknown;
  dispose(): void;
}

export interface CoreRuntimeHooks<I, S, E> {
  inputs(): Readonly<I>;
  state(): Readonly<S>;
  setState(next: S): void;
  emit(name: keyof E & string, detail: unknown): void;
  /**
   * Two-way inputs: a state key that shares an input's name is the live value
   * (InputField.model). When setState changes one away from its input, the
   * front writes it back (a Lit property, an Angular model(), a Vue update: event).
   */
  readonly models?: readonly (keyof I & keyof S & string)[];
  writeModel?(name: keyof I & keyof S & string, value: unknown): void;
}

export function coreRuntime<I, S, P, E, C, PC, M>(
  core: ComponentCore<I, S, P, E, C, PC, M>,
  hooks: CoreRuntimeHooks<I, S, E>,
): CoreRuntime<I, S, E> {
  let api: CoreApi<I, S, E> | null = null;
  let dispose: (() => void) | void;
  let last: Readonly<I> | null = null;
  return {
    get api() {
      return api;
    },
    attachTo(host) {
      if (api) return;
      api = {
        host,
        inputs: hooks.inputs,
        state: hooks.state,
        setState: (patch) => {
          const next = { ...hooks.state(), ...patch };
          hooks.setState(next);
          const inputs = hooks.inputs();
          hooks.models
            ?.filter((name) => name in patch && !Object.is(next[name], inputs[name]))
            .forEach((name) => hooks.writeModel?.(name, next[name]));
        },
        emit: (name, detail) => hooks.emit(name, detail),
      };
      // Inputs that changed between the first report and attaching (a form writing its
      // value during creation) are delivered now; the state was seeded before them.
      const seed = last;
      last = hooks.inputs();
      dispose = core.attach?.(api);
      if (seed && !sameInputs(seed, last)) core.inputsChanged?.(api, seed);
    },
    inputs(inputs) {
      // Before attaching, keep the first inputs seen: they are what the state was seeded from.
      if (!api) {
        last ??= inputs;
        return;
      }
      const prev = last;
      last = inputs;
      if (api && prev && !sameInputs(prev, inputs)) core.inputsChanged?.(api, prev);
    },
    call(name, args) {
      const method = (core.methods as Record<string, unknown> | undefined)?.[name] as ((api: CoreApi<I, S, E>, ...rest: unknown[]) => unknown) | undefined;
      if (!method) throw new Error(`No method ${name} on this component`);
      if (!api) return undefined;
      return method(api, ...args);
    },
    dispose() {
      dispose?.();
      dispose = undefined;
      api = null;
    },
  };
}

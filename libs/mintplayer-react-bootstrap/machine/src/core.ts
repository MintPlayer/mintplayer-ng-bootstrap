import { createContext, use, useContext, useEffect, useId, useRef, useState, type Context, type RefObject } from 'react';
import { coreRuntime, type ComponentCore, type CoreContext, type ViewArgs } from '@mintplayer/ui-core/component';
import { runPrefetch } from '@mintplayer/ui-core/transfer-state';
import { MpSsr } from './transfer-state';

const contexts = new WeakMap<CoreContext<unknown>, Context<unknown>>();
const NONE = createContext<unknown>(undefined);

/** The React context for a core context: one per context object. */
export function reactCoreContext<T>(context: CoreContext<T>): Context<T> {
  let found = contexts.get(context as CoreContext<unknown>);
  if (!found) {
    found = createContext<unknown>(context.defaultValue);
    found.displayName = context.name;
    contexts.set(context as CoreContext<unknown>, found);
  }
  return found as Context<T>;
}

export interface UseCoreOptions {
  /** Prefix of the deterministic id, e.g. `bs-navbar`. */
  readonly idPrefix: string;
  /** The consumer's `aria-label`. */
  readonly label?: string | null;
  /** The template's root element. */
  readonly rootRef: RefObject<HTMLElement | null>;
  /** Calls the output prop for an event name; `undefined` when the consumer passed none. */
  readonly emit: (name: string, detail: unknown) => void;
}

export interface CoreHandle<P, PC> {
  readonly props: P;
  readonly provided: PC;
  call(name: string, args: unknown[]): unknown;
}

/**
 * Host a `ComponentCore` in a generated React component (PRD #437 D10). The
 * id comes from `useId`, so the server render and hydration agree.
 */
export function useCore<I, S, P, E, C, PC, M>(core: ComponentCore<I, S, P, E, C, PC, M>, inputs: I, options: UseCoreOptions): CoreHandle<P, PC> {
  const id = `${options.idPrefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const consumed = useContext((core.consume ? reactCoreContext(core.consume) : NONE) as Context<C | undefined>);
  const [hydrated, setHydrated] = useState(false);
  // #448: the server suspends on the prefetch (one per key per request); the
  // client seeds from what the server transferred under the same key.
  const ssr = useContext(MpSsr);
  const [transferKey] = useState(() => (ssr && core.transferKey ? core.transferKey(inputs) : undefined));
  let seed: unknown;
  if (ssr && transferKey) {
    if (!ssr.server) seed = ssr.store.get(transferKey);
    else if (core.prefetch) {
      let pending = ssr.pending.get(transferKey);
      if (!pending) {
        pending = runPrefetch(core, inputs, { timeout: ssr.prefetchTimeout }).then((result) => {
          if (result) ssr.store.set(result.key, result.seed);
          return result;
        });
        ssr.pending.set(transferKey, pending);
      }
      seed = use(pending)?.seed;
    }
  }
  const [state, setState] = useState<S>(() => (core.state ? core.state(inputs, seed) : ({} as S)));
  // Read once, after the commit (StrictMode renders twice): a later table with the same query fetches fresh.
  useEffect(() => {
    if (ssr && transferKey && !ssr.server) ssr.store.remove(transferKey);
  }, [ssr, transferKey]);

  const latest = useRef({ inputs, state, emit: options.emit });
  latest.current = { inputs, state, emit: options.emit };
  const [runtime] = useState(() =>
    coreRuntime(core, {
      inputs: () => latest.current.inputs,
      state: () => latest.current.state,
      setState: (next) => {
        latest.current.state = next;
        setState(next);
      },
      emit: (name, detail) => latest.current.emit(name, detail),
    }),
  );
  const rootRef = options.rootRef;
  useEffect(() => {
    setHydrated(true);
    if (rootRef.current) runtime.attachTo(rootRef.current);
    return () => runtime.dispose();
  }, [runtime, rootRef]);
  // Every commit; the runtime compares the inputs shallowly.
  useEffect(() => runtime.inputs(inputs));

  const args: ViewArgs<I, S, C, E> = {
    inputs,
    state,
    id,
    hydrated,
    context: (consumed ?? core.consume?.defaultValue) as C,
    label: options.label ?? null,
    api: () => runtime.api,
  };
  return {
    props: core.view(args),
    provided: core.provide?.(args) as PC,
    call: (name, callArgs) => runtime.call(name, callArgs),
  };
}

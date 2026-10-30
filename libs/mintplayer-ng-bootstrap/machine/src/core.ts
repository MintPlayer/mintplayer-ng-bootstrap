import {
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  makeStateKey,
  PendingTasks,
  PLATFORM_ID,
  signal,
  TransferState,
  untracked,
  type Provider,
  type Signal,
  type Type,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { coreRuntime, type ComponentCore, type CoreBag, type CoreContext, type ViewArgs } from '@mintplayer/ui-core/component';
import { runPrefetch } from '@mintplayer/ui-core/transfer-state';
import { useHostProps } from './host-props';
import { MACHINE_SSR_OPTIONS } from './ssr';

const tokens = new WeakMap<CoreContext<unknown>, InjectionToken<Signal<unknown>>>();

/** The Angular token for a core context: one per context object. */
export function coreContextToken<T>(context: CoreContext<T>): InjectionToken<Signal<T>> {
  let token = tokens.get(context as CoreContext<unknown>);
  if (!token) {
    token = new InjectionToken<Signal<unknown>>(`mp-core-context:${context.name}`);
    tokens.set(context as CoreContext<unknown>, token);
  }
  return token as InjectionToken<Signal<T>>;
}

/** Provides `context` to the component's content, read from the component's `useCore().provided`. */
export function provideCoreContext<T>(context: CoreContext<T>, component: Type<{ readonly provided: Signal<T> }>): Provider {
  return { provide: coreContextToken(context), useFactory: () => inject(component).provided };
}

export interface UseCoreOptions<I, P> {
  readonly inputs: () => I;
  /** Prefix of the deterministic id, e.g. `bs-navbar`. */
  readonly idPrefix: string;
  /** The outputs by name; `api.emit` calls their `emit`. */
  readonly outputs?: Readonly<Record<string, { emit(detail: never): void }>>;
  /** The host element's bag, where the template root is the host (`mp-host`). Default: `core.host`. */
  readonly hostBag?: (props: P) => CoreBag | null | undefined;
  /** Two-way inputs (`model()`), by name; written back when the core changes the state of the same name. */
  readonly models?: Readonly<Record<string, { set(value: never): void }>>;
}

export interface CoreHandle<P, PC> {
  /** The template's props. */
  readonly props: Signal<P>;
  /** The value this component provides to its content. */
  readonly provided: Signal<PC>;
  /** Runs a core method; does nothing before the first client render. */
  call(name: string, args: unknown[]): unknown;
}

/**
 * Host a `ComponentCore` in a generated Angular component (PRD #437 D10).
 * Call it in a field initializer. The template's root is the host element
 * where `hostBag` is given, else the host's first element child.
 */
export function useCore<I, S, P, E, C, PC, M>(core: ComponentCore<I, S, P, E, C, PC, M>, options: UseCoreOptions<I, P>): CoreHandle<P, PC> {
  const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const consumed = core.consume ? inject(coreContextToken(core.consume), { optional: true, skipSelf: true }) : null;
  const id = inject(BsIdService).next(options.idPrefix);
  // Read once: a host attribute is static content, and Angular does not observe it.
  const label = element.getAttribute('aria-label');
  const hydrated = signal(false);
  // The state is seeded at its first read, in the first change detection: the
  // template's bindings have set the inputs by then. In the constructor they
  // have not, and the server would render a bound model input's default.
  const written = signal<S | null>(null);
  const server = isPlatformServer(inject(PLATFORM_ID));
  const transfer = core.transferKey ? inject(TransferState) : null;
  /** Server only: starts the prefetch with the first inputs that name one (a `transferKey`), however late they arrive. */
  let prefetchOnce: ((inputs: I) => void) | null = null;
  /** Client only: the transferred seed is still unread, because no inputs have named its key yet. */
  let transferArmed = !server && !!transfer;
  let seeded: S | null = null;
  const seed = (): S => {
    if (seeded) return seeded;
    const inputs = untracked(options.inputs);
    // The baseline the state was seeded from: inputs that change before attaching
    // (a form control writing its value) reach inputsChanged on attach.
    runtime.inputs(inputs);
    return (seeded = core.state ? core.state(inputs, server ? undefined : takeTransferred(inputs)) : ({} as S));
  };
  /**
   * The server's prefetched seed for these inputs, read once: a later instance with the same query fetches fresh (#448).
   * Inputs without a key (a `fetch` the consumer sets after an async step) leave it armed for the next delivery.
   */
  const takeTransferred = (inputs: I): unknown => {
    const key = transferArmed && transfer ? core.transferKey?.(inputs) : undefined;
    if (!transfer || !key) return undefined;
    transferArmed = false;
    const stateKey = makeStateKey<unknown>(key);
    if (!transfer.hasKey(stateKey)) return undefined;
    const value = transfer.get(stateKey, undefined);
    transfer.remove(stateKey);
    return value;
  };
  if (server && transfer && core.prefetch) {
    // Outside the state computed, which must not write signals: the first change
    // detection seeds the loading snapshot, this replaces it before serialization.
    const pendingTasks = inject(PendingTasks);
    const ssr = inject(MACHINE_SSR_OPTIONS);
    const abort = new AbortController();
    inject(DestroyRef).onDestroy(() => abort.abort());
    prefetchOnce = (inputs) => {
      void pendingTasks.run(async () => {
        const result = await runPrefetch(core, inputs, { timeout: ssr.prefetchTimeout, signal: abort.signal });
        if (!result || abort.signal.aborted) return;
        transfer.set(makeStateKey<unknown>(result.key), result.seed);
        written.set(core.state!(inputs, result.seed));
      });
    };
  }
  const state = computed(() => written() ?? seed());

  const args = computed<ViewArgs<I, S, C, E>>(() => ({
    inputs: options.inputs(),
    state: state(),
    id,
    hydrated: hydrated(),
    context: (consumed ? consumed() : core.consume?.defaultValue) as C,
    label,
    api: () => runtime.api,
  }));
  const props = computed(() => core.view(args()));
  const provided = computed(() => core.provide?.(args()) as PC);

  const hostBag = options.hostBag ?? core.host?.bind(core);
  if (hostBag) useHostProps(() => hostBag(props()));

  const runtime = coreRuntime(core, {
    inputs: () => untracked(options.inputs),
    state: () => untracked(state),
    setState: (next) => written.set(next),
    emit: (name, detail) => options.outputs?.[name]?.emit(detail as never),
    models: Object.keys(options.models ?? {}) as never,
    writeModel: (name, value) => options.models?.[name]?.set(value as never),
  });
  afterNextRender(() => {
    hydrated.set(true);
    const root = options.hostBag ? element : (element.firstElementChild as HTMLElement | null);
    if (root) runtime.attachTo(root);
  });
  effect(() => {
    const inputs = options.inputs();
    untracked(() => {
      // A seed whose key the first inputs did not name: applied before the inputs reach the core,
      // so its inputsChanged sees the seeded page as the answer rather than reloading it.
      if (transferArmed && core.adopt) {
        const late = takeTransferred(inputs);
        if (late !== undefined) written.set(core.adopt(state(), inputs, late));
      }
      runtime.inputs(inputs);
      // Armed until the inputs name a prefetch: a `fetch` or `stateKey` can arrive after the first delivery.
      if (prefetchOnce && core.transferKey?.(inputs)) {
        const start = prefetchOnce;
        prefetchOnce = null;
        start(inputs);
      }
    });
  });
  inject(DestroyRef).onDestroy(() => runtime.dispose());

  return { props, provided, call: (name, callArgs) => runtime.call(name, callArgs) };
}

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { coreRuntime, type ComponentCore, type CoreBag, type CoreContext, type CoreRuntime, type ViewArgs } from '@mintplayer/ui-core/component';
import { applyHostProps, EMPTY_HOST_PROPS } from './host-props';

const symbols = new WeakMap<CoreContext<unknown>, symbol>();

/** The property a provider element exposes a core context under: one per context object. */
function contextSymbol(context: CoreContext<unknown>): symbol {
  let symbol = symbols.get(context);
  if (!symbol) {
    symbol = Symbol(context.name);
    symbols.set(context, symbol);
  }
  return symbol;
}

/** The elements that read a provider's context: re-rendered when the value changes. */
const consumers = new WeakMap<Element, Set<ReactiveControllerHost & HTMLElement>>();

/**
 * The nearest ancestor's value for `context`, crossing shadow roots, or its
 * default. The reader subscribes to that provider, which pushes its changes:
 * a consumer's own update has no way to see a provider's state move.
 */
function readContext<T>(host: ReactiveControllerHost & HTMLElement, context: CoreContext<T>): T {
  const symbol = contextSymbol(context as CoreContext<unknown>);
  for (let node: Node | null = host.parentNode; node; node = node instanceof ShadowRoot ? node.host : node.parentNode) {
    const read = (node as unknown as Record<symbol, (() => T) | undefined>)[symbol];
    if (read) {
      const set = consumers.get(node as Element) ?? new Set();
      consumers.set(node as Element, set.add(host));
      return read();
    }
  }
  return context.defaultValue;
}

const sameContext = (a: unknown, b: unknown): boolean =>
  a === b ||
  (!!a && !!b && typeof a === 'object' && typeof b === 'object' &&
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(([k, v]) => (b as Record<string, unknown>)[k] === v));

let counter = 0;

export interface CoreControllerOptions<I, P> {
  readonly inputs: () => I;
  /** Prefix of the deterministic id, e.g. `mp-navbar`. */
  readonly idPrefix: string;
  /** The host element's bag, where the template root is the host (`mp-host`). Default: `core.host`. */
  readonly hostBag?: (props: P) => CoreBag | null | undefined;
  /** Two-way inputs: properties written back when the core changes the state of the same name. */
  readonly models?: readonly string[];
}

/**
 * Host a `ComponentCore` in a generated Lit element (PRD #437 D10). The
 * element renders in the light DOM; `props()` is the template's props, and
 * applies the host bag as a side effect, so call it once per `render()`.
 * Outputs are DOM events named after the event, lowercased.
 */
export class CoreController<I, S, P, E, C, PC, M> implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #core: ComponentCore<I, S, P, E, C, PC, M>;
  readonly #options: CoreControllerOptions<I, P>;
  readonly #id: string;
  readonly #runtime: CoreRuntime<I, S, E>;
  #state: S | undefined;
  #label: string | null | undefined;
  #hydrated = false;
  #applied = EMPTY_HOST_PROPS;
  #provided: unknown;

  constructor(host: ReactiveControllerHost & HTMLElement, core: ComponentCore<I, S, P, E, C, PC, M>, options: CoreControllerOptions<I, P>) {
    this.#host = host;
    this.#core = core;
    this.#options = options;
    this.#id = `${options.idPrefix}-${++counter}`;
    this.#runtime = coreRuntime(core, {
      inputs: options.inputs,
      state: () => this.#currentState,
      setState: (next) => {
        this.#state = next;
        host.requestUpdate();
      },
      models: options.models as never,
      writeModel: (name, value) => ((host as unknown as Record<string, unknown>)[name] = value),
      emit: (name, detail) => host.dispatchEvent(new CustomEvent(name.toLowerCase(), { detail, bubbles: true, composed: true })),
    });
    host.addController(this);
    if (core.provides) {
      (host as unknown as Record<symbol, () => PC>)[contextSymbol(core.provides as CoreContext<unknown>)] = () =>
        core.provide?.(this.#args()) as PC;
    }
  }

  get #currentState(): S {
    // Seeded lazily: the inputs are not set yet while the element constructs.
    return (this.#state ??= this.#core.state ? this.#core.state(this.#options.inputs()) : ({} as S));
  }

  #args(): ViewArgs<I, S, C> {
    return {
      inputs: this.#options.inputs(),
      state: this.#currentState,
      id: this.#id,
      hydrated: this.#hydrated,
      context: (this.#core.consume ? readContext(this.#host, this.#core.consume) : undefined) as C,
      label: this.#label ?? null,
    };
  }

  hostConnected(): void {
    // The consumer's label, before the host bag writes its own aria-label.
    if (this.#label === undefined) this.#label = this.#host.getAttribute('aria-label');
    // Moved by a parent's template after rendering once: re-attach on the next update.
    if (!this.#runtime.api && (this.#host as { hasUpdated?: boolean }).hasUpdated) this.#host.requestUpdate();
  }

  hostDisconnected(): void {
    // Re-subscribes on its next read, under whichever provider it lands in.
    if (this.#core.consume) this.#unsubscribe();
    this.#runtime.dispose();
    this.#hydrated = false;
  }

  hostUpdated(): void {
    if (!this.#runtime.api) {
      const root = this.#options.hostBag ? this.#host : (this.#host.firstElementChild as HTMLElement | null);
      if (!root) return;
      this.#hydrated = true;
      this.#runtime.attachTo(root);
      this.#host.requestUpdate();
      return;
    }
    this.#runtime.inputs(this.#options.inputs());
    this.#notifyConsumers();
  }

  #unsubscribe(): void {
    for (let node: Node | null = this.#host.parentNode; node; node = node instanceof ShadowRoot ? node.host : node.parentNode) {
      consumers.get(node as Element)?.delete(this.#host);
    }
  }

  /** A provider re-renders its consumers when the value it provides changed. */
  #notifyConsumers(): void {
    if (!this.#core.provides || !this.#core.provide) return;
    const next = this.#core.provide(this.#args());
    if (sameContext(next, this.#provided)) return;
    this.#provided = next;
    consumers.get(this.#host)?.forEach((consumer) => (consumer.isConnected ? consumer.requestUpdate() : consumers.get(this.#host)?.delete(consumer)));
  }

  /** The template's props; also applies the host bag. */
  props(): P {
    const props = this.#core.view(this.#args());
    const hostBag = this.#options.hostBag ?? this.#core.host?.bind(this.#core);
    if (hostBag) this.#applied = applyHostProps(this.#host, this.#applied, hostBag(props) ?? {});
    return props;
  }

  call(name: string, args: unknown[]): unknown {
    return this.#runtime.call(name, args);
  }
}

/**
 * Hosts a D10 core in jsdom the way a generated front does (`coreRuntime`
 * underneath), so a core's own spec can drive `view`, `attach`,
 * `inputsChanged` and its methods without a framework.
 *
 * A core finds its DOM by role and class inside the host, so a spec renders
 * the slice of the template the core touches with `markup` (re-run on every
 * `render()`), applying the view's bags with `applyBag`.
 */
import { coreRuntime, type ComponentCore, type CoreApi, type ViewArgs } from '@mintplayer/ui-core/component';

type Bag = Record<string, string | number | boolean | null | undefined>;

/** Writes a bag onto an element the way the fronts' attribute setters do. */
export function applyBag(el: Element, bag: Bag | null | undefined): Element {
  Object.entries(bag ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => el.setAttribute(k, v === true ? '' : String(v)));
  return el;
}

/**
 * Rewrites an element's attributes from a bag, keeping the node: what a front's
 * re-render does to markup it keeps (an overlay kept after a close, #465).
 */
export function patchBag(el: Element, bag: Bag | null | undefined): Element {
  Array.from(el.attributes).map((a) => el.removeAttribute(a.name));
  return applyBag(el, bag);
}

/** `<tag>` with the bag applied and the given children. */
export function el(tag: string, bag?: Bag | null, ...children: (Node | string | null | undefined)[]): HTMLElement {
  const node = document.createElement(tag);
  applyBag(node, bag);
  node.append(...children.filter((c): c is Node | string => c !== null && c !== undefined));
  return node;
}

export interface HostCoreOptions<I, S, P, E, C> {
  id?: string;
  label?: string | null;
  hydrated?: boolean;
  context?: C;
  /** Seed handed to `state`. */
  seed?: unknown;
  /** Builds the host's children from the current props. */
  markup?: (props: P, host: HTMLElement) => Node | Node[] | null | void;
  /** Host element; a connected `div` by default. */
  host?: HTMLElement;
  models?: readonly string[];
}

export interface HostedCore<I, S, P, E> {
  readonly host: HTMLElement;
  readonly emitted: { name: keyof E & string; detail: unknown }[];
  /** The details of every emit of `name`, in order. */
  events<K extends keyof E & string>(name: K): E[K][];
  readonly models: { name: string; value: unknown }[];
  /** Every value written back to the model `name` (listed in `options.models`), in order. */
  changes<K extends keyof I & string>(name: K): I[K][];
  state(): S;
  inputs(): I;
  props(): P;
  /** Rebuilds the markup from the current props. */
  render(): void;
  /**
   * Attaches like a front after its first client render (renders first; pass
   * false to keep DOM a spec prepared, e.g. a value typed before hydration).
   */
  attach(rerender?: boolean): CoreApi<I, S, E>;
  readonly api: CoreApi<I, S, E> | null;
  setInputs(patch: Partial<I>): void;
  call(name: string, ...args: unknown[]): unknown;
  dispose(): void;
}

export function hostCore<I, S, P, E, C, PC, M>(
  core: ComponentCore<I, S, P, E, C, PC, M>,
  initial: I,
  options: HostCoreOptions<I, S, P, E, C> = {},
): HostedCore<I, S, P, E> {
  const host = options.host ?? document.createElement('div');
  const id = options.id ?? 'mp-test';
  host.id ||= id;
  if (!host.isConnected) document.body.append(host);
  let inputs = initial;
  let state = (core.state?.(initial, options.seed) ?? ({} as S)) as S;
  const emitted: { name: keyof E & string; detail: unknown }[] = [];
  const models: { name: string; value: unknown }[] = [];
  let attached = false;

  const args = (): ViewArgs<I, S, C, E> => ({
    inputs,
    state,
    id,
    hydrated: options.hydrated ?? attached,
    context: options.context as C,
    label: options.label ?? null,
    api: () => runtime.api,
  });
  const props = () => core.view(args());
  const render = () => {
    if (!options.markup) return;
    const nodes = options.markup(props(), host);
    if (nodes === undefined) return;
    host.replaceChildren(...(nodes === null ? [] : Array.isArray(nodes) ? nodes : [nodes]));
  };

  const runtime = coreRuntime(core, {
    inputs: () => inputs,
    state: () => state,
    setState: (next) => (state = next),
    emit: (name, detail) => emitted.push({ name, detail }),
    models: options.models as never,
    // Like a front: the value lands in the input too, so an unchanged repeat writes nothing.
    writeModel: (name, value) => {
      models.push({ name, value });
      inputs = { ...inputs, [name]: value };
    },
  });
  runtime.inputs(inputs);

  return {
    host,
    emitted,
    events: (name) => emitted.filter((e) => e.name === name).map((e) => e.detail) as never,
    models,
    changes: (name) => models.filter((m) => m.name === name).map((m) => m.value) as never,
    state: () => state,
    inputs: () => inputs,
    props,
    render,
    attach(rerender = true) {
      attached = true;
      if (rerender) render();
      runtime.attachTo(host);
      return runtime.api!;
    },
    get api() {
      return runtime.api;
    },
    setInputs(patch) {
      inputs = { ...inputs, ...patch };
      runtime.inputs(inputs);
    },
    call: (name, ...a) => runtime.call(name, a),
    dispose() {
      runtime.dispose();
      host.remove();
    },
  };
}

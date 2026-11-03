import { coreRuntime, type ComponentCore, type CoreBag, type ViewArgs } from './component';

/**
 * Hosting a directive core on an element the consumer rendered (#458 §4.3).
 *
 * A directive is a `ComponentCore` without a template: its `view` returns the
 * bag for the element it is placed on. Angular and React host it through their
 * `useCore` (the bag is a host bag there); Vue's custom directive and Lit's
 * element-part directive have no component around them, so both drive this
 * imperative host instead.
 *
 * A directive core cannot `consume` a context here: neither a Vue directive
 * nor a Lit part can reach one. Such a core is exposed as a renderless
 * component in Vue instead (PRD decision S4).
 */
export interface ElementCoreOptions<P, I = unknown> {
  /** Prefix of the element's id, e.g. `bs-row`. */
  readonly idPrefix: string;
  /** The element's bag from the view's props (the generated front adds the group's scope). */
  readonly bag: (props: P) => CoreBag | null | undefined;
  /** The manifest's input defaults: a binding passes only what the consumer wrote. */
  readonly defaults?: Partial<I>;
  /** Every render's props, after the bag is written (an overlay directive renders its panel from them). */
  readonly onProps?: (props: P) => void;
}

/** A binding's value over the manifest's defaults. */
export const directiveInputs = <I>(defaults: Partial<I> | undefined, value: Partial<I> | null | undefined): I => ({ ...defaults, ...value }) as I;

export interface ElementCore<I> {
  /** Wire the core's behaviour (`attach`): after the element is in the document. */
  attach(): void;
  /** New inputs from the directive's binding. */
  update(inputs: I): void;
  /** Undo `attach`; the bag stays on the element. */
  detach(): void;
  call(name: string, args: unknown[]): unknown;
}

/** What `applyElementBag` wrote last time, so the next call can diff against it. */
export interface AppliedBag {
  readonly attrs: CoreBag;
  readonly classes: readonly string[];
}

export const EMPTY_APPLIED_BAG: AppliedBag = { attrs: {}, classes: [] };

const absent = (v: unknown) => v === null || v === undefined || v === false;

/**
 * Write a bag onto an element, diffed against the previous write. `class` is
 * merged token by token, so the consumer's own classes survive.
 */
export function applyElementBag(element: Element, previous: AppliedBag, bag: CoreBag): AppliedBag {
  const { class: className, ...attrs } = bag;
  const classes = typeof className === 'string' ? className.split(/\s+/).filter(Boolean) : [];
  element.classList.remove(...previous.classes.filter((name) => !classes.includes(name)));
  if (classes.length) element.classList.add(...classes);
  Object.keys(previous.attrs)
    .filter((name) => absent(attrs[name]))
    .forEach((name) => element.removeAttribute(name));
  Object.entries(attrs)
    .filter(([, value]) => !absent(value))
    .filter(([name, value]) => !Object.is(previous.attrs[name], value))
    .forEach(([name, value]) => element.setAttribute(name, value === true ? '' : String(value)));
  return { attrs, classes };
}

let counter = 0;

/**
 * The bag a directive core puts on its element before anything ran: what a
 * server renderer writes (Vue's `getSSRProps`). Pure. The id differs from the
 * client's, which rewrites it when the directive is created.
 */
export function directiveServerBag<I, S, P, E, C, PC, M>(core: ComponentCore<I, S, P, E, C, PC, M>, inputs: I, options: ElementCoreOptions<P>): CoreBag {
  const state = core.state ? core.state(inputs) : ({} as S);
  const args: ViewArgs<I, S, C, E> = { inputs, state, id: `${options.idPrefix}-ssr`, hydrated: false, context: core.consume?.defaultValue as C, label: null, api: () => null };
  return options.bag(core.view(args)) ?? {};
}

/** Host a directive core on `element`; renders its bag at once. */
export function elementCore<I, S, P, E, C, PC, M>(
  core: ComponentCore<I, S, P, E, C, PC, M>,
  element: HTMLElement,
  inputs: I,
  options: ElementCoreOptions<P>,
): ElementCore<I> {
  if (core.consume) throw new Error(`${options.idPrefix}: a directive core that consumes a context needs the component form`);
  const id = element.id || `${options.idPrefix}-${++counter}`;
  const label = element.getAttribute('aria-label');
  let current = inputs;
  let state: S = core.state ? core.state(inputs) : ({} as S);
  let hydrated = false;
  let applied = EMPTY_APPLIED_BAG;
  const render = () => {
    const args: ViewArgs<I, S, C, E> = { inputs: current, state, id, hydrated, context: undefined as C, label, api: () => runtime.api };
    const props = core.view(args);
    applied = applyElementBag(element, applied, options.bag(props) ?? {});
    options.onProps?.(props);
  };
  const runtime = coreRuntime(core, {
    inputs: () => current,
    state: () => state,
    setState: (next) => {
      state = next;
      render();
    },
    // Outputs are DOM events on the consumer's element, lowercased, as in Lit.
    emit: (name, detail) => element.dispatchEvent(new CustomEvent(name.toLowerCase(), { detail, bubbles: true, composed: true })),
  });
  runtime.inputs(current);
  render();
  return {
    attach() {
      if (runtime.api) return;
      hydrated = true;
      runtime.attachTo(element);
      render();
    },
    update(next) {
      current = next;
      runtime.inputs(next);
      render();
    },
    detach() {
      runtime.dispose();
      hydrated = false;
    },
    call: (name, args) => runtime.call(name, args),
  };
}

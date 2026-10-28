import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { AttrBag } from './props-directive';

/** What `applyHostProps` wrote last time, so the next call can diff against it. */
export interface HostPropsState {
  readonly attrs: AttrBag;
  readonly classes: readonly string[];
}

export const EMPTY_HOST_PROPS: HostPropsState = { attrs: {}, classes: [] };

const absent = (v: unknown) => v === null || v === undefined || v === false;

/**
 * Apply a core's attribute bag to a light-DOM element's own host: the Lit
 * twin of Angular's `useHostProps`, for a compiled template whose root is
 * marked `mp-host`. Diffs against the previous call; `class` is merged token
 * by token, so classes the consumer put on the element survive.
 *
 *     this.#host = applyHostProps(this, this.#host, view.root);
 */
export function applyHostProps(host: Element, previous: HostPropsState, bag: AttrBag): HostPropsState {
  const { class: className, ...attrs } = bag;
  const classes = typeof className === 'string' ? className.split(/\s+/).filter(Boolean) : [];
  host.classList.remove(...previous.classes.filter((name) => !classes.includes(name)));
  if (classes.length) host.classList.add(...classes);
  Object.keys(previous.attrs)
    .filter((name) => absent(attrs[name]))
    .forEach((name) => host.removeAttribute(name));
  Object.entries(attrs)
    .filter(([, value]) => !absent(value))
    .filter(([name, value]) => !Object.is(previous.attrs[name], value))
    .forEach(([name, value]) => host.setAttribute(name, value === true ? '' : String(value)));
  return { attrs, classes };
}

/**
 * A top-level node a compiled template rendered into a light-DOM host: a
 * stamped native element, or lit's markers and whitespace. A custom element is
 * never the template's, even once stamped: an `<mp-navbar-nav>` stamps itself.
 */
export const ownedByTemplate = (node: Node): boolean =>
  node.nodeType === Node.COMMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) ||
  (node instanceof Element && node.hasAttribute('data-mps') && !node.localName.includes('-'));

/**
 * The authored children of a light-DOM element whose compiled template places
 * them (the Lit side of a template's `<slot>`s). They are taken out of the
 * host before the first render, grouped by `slot` attribute; a child appended
 * later is adopted into its group and the host re-renders. Nodes keep their
 * identity: the template renders them as binding values.
 *
 *     readonly #children = new LightChildren(this);
 *     protected override willUpdate() { this.#children.capture(); }
 *     render() { return navbarTemplate({ …, slots: this.#children.slots }); }
 */
export class LightChildren implements ReactiveController {
  #slots: Record<string, Node[]> | null = null;
  #observer: MutationObserver | null = null;

  constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
    host.addController(this);
  }

  /** The captured children by slot name (`default` for unnamed); empty groups are absent. */
  get slots(): Readonly<Record<string, Node[] | undefined>> {
    return this.#slots ?? {};
  }

  /** Take the authored children out of the host; a no-op after the first call. */
  capture(): void {
    this.#slots ??= takeLightChildren(this.host);
  }

  hostConnected(): void {
    this.#observer = new MutationObserver(() => this.#adopt());
    this.#observer.observe(this.host, { childList: true });
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  #adopt(): void {
    if (!this.#slots) return;
    // A captured node the template placed directly in the host is not a stray:
    // adopting it again would re-render, re-insert and re-adopt it forever.
    const captured = new Set(Object.values(this.#slots).flat());
    const strays = takeLightChildren(this.host, (node) => captured.has(node) || ownedByTemplate(node));
    if (Object.keys(strays).length === 0) return;
    Object.entries(strays).forEach(([name, nodes]) => (this.#slots![name] = [...(this.#slots![name] ?? []), ...nodes]));
    this.host.requestUpdate();
  }
}

/**
 * Take a light-DOM element's authored children out of it, grouped by their
 * `slot` attribute (`default` for the rest), so its compiled template can
 * place them. Comments and whitespace-only text are dropped.
 */
export function takeLightChildren(host: Element, keep: (node: Node) => boolean = () => false): Record<string, Node[]> {
  const groups: Record<string, Node[]> = {};
  [...host.childNodes]
    .filter((node) => !keep(node))
    .forEach((node) => {
      node.parentNode?.removeChild(node);
      if (node.nodeType === Node.COMMENT_NODE || (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())) return;
      const slot = node instanceof Element ? node.getAttribute('slot') : null;
      (groups[slot ?? 'default'] ??= []).push(node);
    });
  return groups;
}

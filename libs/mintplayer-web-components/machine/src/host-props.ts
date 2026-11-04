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

/** A host's forwarded attributes (`takeHostAttrs`), and the host they came from. */
export interface HostAttrs {
  readonly host: HTMLElement;
  readonly attrs: Readonly<Record<string, string>>;
}

/**
 * Host transparency for a compiled template whose role lives on an inner
 * `mp-attrs` node (#458): the Lit twin of Angular's `useHostAttrs`. A
 * consumer's `aria-*`, `id` and `tabindex` on the element belong on that node.
 * `id` and `tabindex` are moved (no duplicate id, no dead tab stop on the
 * host); `aria-*` are copied. Read once, before the first render. A consumer
 * `role` is never taken: the inner node's role is the core's contract.
 */
export function takeHostAttrs(host: HTMLElement): HostAttrs {
  const attrs: Record<string, string> = Object.fromEntries(
    Array.from(host.attributes)
      .filter(({ name }) => name.startsWith('aria-') || name === 'id' || name === 'tabindex')
      .map(({ name, value }) => [name, value]),
  );
  ['id', 'tabindex'].filter((name) => name in attrs).forEach((name) => host.removeAttribute(name));
  return { host, attrs };
}

/**
 * The inner node's bag with the host's forwarded attributes written over it:
 * the consumer's word wins. Except an `id` the bag sets itself, which the
 * core's own references (a `label for`, an `aria-controls`) point at: then the
 * consumer's id goes back to the host instead.
 */
export function forwardHostAttrs(bag: AttrBag | null | undefined, forwarded: HostAttrs | null | undefined): AttrBag {
  const own = bag ?? {};
  if (!forwarded) return own;
  const { id, ...rest } = forwarded.attrs;
  const ownId = own['id'] !== null && own['id'] !== undefined;
  if (ownId && id && forwarded.host.id !== id) forwarded.host.id = id;
  return { ...own, ...rest, ...(id && !ownId ? { id } : {}) };
}

/**
 * A top-level node a compiled template rendered into a light-DOM host: a
 * stamped native element, a composed child it marked `data-mp-owned`, or lit's
 * markers and whitespace. A custom element is otherwise never the template's,
 * even once stamped: an `<mp-navbar-nav>` stamps itself.
 */
export const ownedByTemplate = (node: Node): boolean =>
  node.nodeType === Node.COMMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) ||
  (node instanceof Element &&
    (node.hasAttribute('data-mp-owned') || (node.hasAttribute('data-mps') && !node.localName.includes('-'))));

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
    this.#observer = new MutationObserver((records) => this.#adopt(records, true));
    this.#observer.observe(this.host, { childList: true });
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  /** Nodes appended since the last render are adopted now, so this render places them. */
  hostUpdate(): void {
    this.#adopt(this.#observer?.takeRecords() ?? [], false);
  }

  /**
   * What the render itself inserted is the template's, whatever it is: a
   * render callback's text or unstamped element lands directly in the host.
   */
  hostUpdated(): void {
    this.#observer?.takeRecords();
  }

  #adopt(records: MutationRecord[], rerender: boolean): void {
    if (!this.#slots) return;
    const added = new Set(records.flatMap((record) => [...record.addedNodes]));
    // A captured node the template placed directly in the host is not a stray:
    // adopting it again would re-render, re-insert and re-adopt it forever.
    const captured = new Set(Object.values(this.#slots).flat());
    const strays = takeLightChildren(this.host, (node) => !added.has(node) || captured.has(node) || ownedByTemplate(node));
    if (Object.keys(strays).length === 0) return;
    Object.entries(strays).forEach(([name, nodes]) => (this.#slots![name] = [...(this.#slots![name] ?? []), ...nodes]));
    if (rerender) this.host.requestUpdate();
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

/**
 * The attribute converter of a compiled boolean input: present means true, except
 * the literal `"false"`, so `show-labels="false"` switches a default-true flag off
 * (HTML's presence rule alone could not), and removing the attribute restores the
 * input's default. Reflects as an empty attribute.
 */
export const booleanAttribute = (fallback: boolean) => ({
  fromAttribute: (value: string | null): boolean => (value === null ? fallback : value !== 'false'),
  toAttribute: (value: unknown): string | null => (value ? '' : null),
});

/**
 * The attribute converter of a compiled string input: removing the attribute
 * restores the input's default rather than leaving `null` in a property the core
 * types as a string. An input typed as a literal union passes its `values`, and
 * an attribute naming none of them restores the default too.
 */
export const stringAttribute = <T extends string | null | undefined>(fallback: T, values?: readonly string[]) => ({
  fromAttribute: (value: string | null): string | T => (value === null || (values && !values.includes(value)) ? fallback : value),
  toAttribute: (value: unknown): string | null => (value === null || value === undefined ? null : String(value)),
});

/**
 * The attribute converter of a compiled number input: a missing, empty or
 * non-numeric attribute restores the input's default, so the core never sees NaN.
 */
export const numberAttribute = <T extends number | null | undefined>(fallback: T) => ({
  fromAttribute: (value: string | null): number | T => {
    const parsed = value === null || value.trim() === '' ? NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },
  toAttribute: (value: unknown): string | null => (value === null || value === undefined ? null : String(value)),
});

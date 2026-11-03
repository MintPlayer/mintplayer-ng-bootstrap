import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { sameContent, type ContentChild } from '@mintplayer/ui-core/component';

/** The event a queried child (or its wrapper) fires after it updated: its parent re-reads. */
const CONTENT_CHANGE = 'mp-content-change';

/** Fired by a generated element that a parent's content query reads. */
export function notifyContentChange(element: HTMLElement): void {
  element.dispatchEvent(new Event(CONTENT_CHANGE, { bubbles: true }));
}

type LentSlots = Readonly<Record<string, Node[] | undefined>>;
type Queried = HTMLElement & { readonly contentInputs?: Record<string, unknown>; readonly lentSlots?: LentSlots };

/** Same slots: per slot, the same captured array (a capture adopting nodes replaces it). */
const sameLent = (a: readonly LentSlots[], b: readonly LentSlots[]): boolean =>
  a.length === b.length &&
  a.every((slots, i) => {
    const keys = new Set([...Object.keys(slots), ...Object.keys(b[i])]);
    return [...keys].every((key) => slots[key] === b[i][key]);
  });

/**
 * A manifest content query in Lit (PRD #437 D10): every `tag` element in the
 * host's light content, in document order, with the inputs of the nearest
 * `within` element around it. Re-read when such a child is added, removed or
 * updated; the host re-renders only when the result changed.
 */
export class ContentQuery implements ReactiveController {
  value: readonly ContentChild[] = [];
  /** Each child's lent slots (a declaration's captured `slot=` children), in the same order (#458 Q15). */
  lent: readonly LentSlots[] = [];
  #observer: MutationObserver | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly tag: string,
    private readonly within: string | null,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this.#refresh();
    this.#observer = new MutationObserver((records) => {
      if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some((node) => this.#concerns(node)))) this.#changed();
    });
    this.#observer.observe(this.host, { childList: true, subtree: true });
    this.host.addEventListener(CONTENT_CHANGE, this.#changed);
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.host.removeEventListener(CONTENT_CHANGE, this.#changed);
  }

  hostUpdate(): void {
    this.#refresh();
  }

  #concerns(node: Node): boolean {
    if (!(node instanceof Element)) return false;
    const selector = this.within ? `${this.tag}, ${this.within}` : this.tag;
    return node.matches(selector) || !!node.querySelector(selector);
  }

  readonly #changed = (): void => {
    if (this.#refresh()) this.host.requestUpdate();
  };

  /** Re-reads the content; true when the result changed. */
  #refresh(): boolean {
    // A child of a nested host of the same kind is that host's, not ours: a tab
    // page's body (moved into our pane) may hold a tab control of its own.
    const host = this.host.localName;
    const elements = [...this.host.querySelectorAll<Queried>(this.tag)].filter((element) => element.parentElement?.closest(host) === this.host);
    const lent = elements.map((element) => ({ ...(element.lentSlots ?? {}) }));
    const next = elements.map((element) => {
      const wrapper = this.within ? element.parentElement?.closest<Queried>(this.within) : null;
      return { inputs: element.contentInputs ?? {}, within: wrapper && this.host.contains(wrapper) ? (wrapper.contentInputs ?? {}) : null };
    });
    const sameInputs = sameContent(this.value, next);
    const sameSlots = sameLent(this.lent, lent);
    if (sameInputs && sameSlots) return false;
    if (!sameInputs) this.value = next;
    if (!sameSlots) this.lent = lent;
    return true;
  }
}

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { sameContent, type ContentChild } from '@mintplayer/ui-core/component';

/** The event a queried child (or its wrapper) fires after it updated: its parent re-reads. */
const CONTENT_CHANGE = 'mp-content-change';

/** Fired by a generated element that a parent's content query reads. */
export function notifyContentChange(element: HTMLElement): void {
  element.dispatchEvent(new Event(CONTENT_CHANGE, { bubbles: true }));
}

type Queried = HTMLElement & { readonly contentInputs?: Record<string, unknown> };

/**
 * A manifest content query in Lit (PRD #437 D10): every `tag` element in the
 * host's light content, in document order, with the inputs of the nearest
 * `within` element around it. Re-read when such a child is added, removed or
 * updated; the host re-renders only when the result changed.
 */
export class ContentQuery implements ReactiveController {
  value: readonly ContentChild[] = [];
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
    const next = [...this.host.querySelectorAll<Queried>(this.tag)].map((element) => {
      const wrapper = this.within ? element.parentElement?.closest<Queried>(this.within) : null;
      return { inputs: element.contentInputs ?? {}, within: wrapper && this.host.contains(wrapper) ? (wrapper.contentInputs ?? {}) : null };
    });
    if (sameContent(this.value, next)) return false;
    this.value = next;
    return true;
  }
}

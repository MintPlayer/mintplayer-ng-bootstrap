import { nothing, render } from 'lit';
import { AsyncDirective, directive, PartType, type ChildPart, type DirectiveResult, type PartInfo } from 'lit/async-directive.js';
import { createBodyHost, removeBodyHost } from '@mintplayer/ui-core/overlay';

let counter = 0;

/**
 * The compiled form of a view's `<teleport to="body">` (#458 §4.4): the content
 * renders into a `div[data-mp-overlay]` at the end of `<body>`, outside every
 * clipping ancestor, while the directive is connected. The host copies the
 * declaring position's `data-bs-theme`, `dir` and `lang`. Nothing renders where
 * the directive sits, and nothing at all without a document (server).
 *
 *     html`${bodyTeleport(html`<div class="modal">...</div>`)}`
 */
class BodyTeleportDirective extends AsyncDirective {
  readonly #id = `mp-overlay-${++counter}`;
  #host: HTMLElement | null = null;
  #content: unknown = nothing;
  #from: Element | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) throw new Error('bodyTeleport() must be used in child position');
  }

  render(_content: unknown): typeof nothing {
    return nothing;
  }

  override update(part: ChildPart, [content]: [unknown]): typeof nothing {
    this.#content = content;
    this.#from = part.parentNode instanceof Element ? part.parentNode : (part.parentNode as Node | null)?.parentElement ?? null;
    if (this.isConnected) this.#mount();
    return nothing;
  }

  #mount(): void {
    if (typeof document === 'undefined' || !document.body) return;
    this.#host ??= createBodyHost(document, this.#id, this.#from);
    render(this.#content, this.#host);
  }

  protected override disconnected(): void {
    if (!this.#host) return;
    render(nothing, this.#host);
    removeBodyHost(document, this.#id);
    this.#host = null;
  }

  protected override reconnected(): void {
    this.#mount();
  }
}

/** Render `content` into a body host while connected (see `BodyTeleportDirective`). */
export const bodyTeleport: (content: unknown) => DirectiveResult = directive(BodyTeleportDirective);

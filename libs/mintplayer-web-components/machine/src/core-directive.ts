import { noChange, nothing, render } from 'lit';
import { AsyncDirective, directive, PartType, type DirectiveResult, type ElementPart, type PartInfo } from 'lit/async-directive.js';
import { directiveInputs, elementCore, type ComponentCore, type ElementCore, type ElementCoreOptions } from '@mintplayer/ui-core/component';
import { createBodyHost, removeBodyHost } from '@mintplayer/ui-core/overlay';

/** The content an overlay directive's panel renders: its second argument. */
export type OverlayContent = () => unknown;

export interface CoreDirectiveOptions<P, I> extends ElementCoreOptions<P, I> {
  /**
   * An overlay directive (#458 M6): the panel to render from the props, null while hidden. It renders
   * into a body host at the end of <body>, with the directive's content.
   */
  readonly overlay?: (props: P, content: OverlayContent | undefined) => unknown;
}

let overlays = 0;

/**
 * A directive core as a Lit element-part directive (#458 §4.3):
 *
 *     html`<div ${bsRow()}><div ${bsCol({ md: 6 })}>…</div></div>`
 *
 * The argument is the inputs object. Outputs are DOM events on the element,
 * lowercased. The core attaches once the element is connected, after the
 * render that created it, and detaches while the part is disconnected.
 */
export function coreDirective<I, S, P, E, C, PC, M>(
  core: ComponentCore<I, S, P, E, C, PC, M>,
  options: CoreDirectiveOptions<P, I>,
): (inputs?: Partial<I>, content?: OverlayContent) => DirectiveResult {
  class CoreElementDirective extends AsyncDirective {
    #host: ElementCore<I> | null = null;
    #element: Element | null = null;
    #content: OverlayContent | undefined;
    readonly #overlayId = `mp-overlay-d${++overlays}`;
    #overlayHost: HTMLElement | null = null;

    /** Render the overlay's panel into its body host, or remove both (`overlay` only). */
    #renderOverlay(props: P): void {
      const panel = options.overlay?.(props, this.#content) ?? null;
      if (typeof document === 'undefined' || !document.body) return;
      if (panel === null || !this.isConnected) return this.#closeOverlay();
      this.#overlayHost ??= createBodyHost(document, this.#overlayId, this.#element);
      render(panel, this.#overlayHost);
    }

    #closeOverlay(): void {
      if (!this.#overlayHost) return;
      render(nothing, this.#overlayHost);
      removeBodyHost(document, this.#overlayId);
      this.#overlayHost = null;
    }

    constructor(part: PartInfo) {
      super(part);
      if (part.type !== PartType.ELEMENT) throw new Error(`${options.idPrefix} is an element directive: put it in an element's attribute position`);
    }

    render(_inputs?: Partial<I>, _content?: OverlayContent): unknown {
      return noChange;
    }

    override update(part: ElementPart, [value, content]: [Partial<I>?, OverlayContent?]): unknown {
      const inputs = directiveInputs(options.defaults, value);
      this.#content = content;
      if (!this.#host || this.#element !== part.element) {
        this.#host?.detach();
        this.#element = part.element;
        const host = (this.#host = elementCore(core, part.element as HTMLElement, inputs, options.overlay ? { ...options, onProps: (props) => this.#renderOverlay(props) } : options));
        // The element is not in the document yet while its template commits.
        queueMicrotask(() => {
          if (this.#host === host && this.isConnected) host.attach();
        });
      } else {
        this.#host.update(inputs);
      }
      return noChange;
    }

    protected override disconnected(): void {
      this.#host?.detach();
      this.#closeOverlay();
    }

    protected override reconnected(): void {
      this.#host?.attach();
    }
  }
  return directive(CoreElementDirective);
}

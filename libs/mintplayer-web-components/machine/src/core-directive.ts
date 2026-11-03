import { noChange } from 'lit';
import { AsyncDirective, directive, PartType, type DirectiveResult, type ElementPart, type PartInfo } from 'lit/async-directive.js';
import { directiveInputs, elementCore, type ComponentCore, type ElementCore, type ElementCoreOptions } from '@mintplayer/ui-core/component';

/**
 * A directive core as a Lit element-part directive (#458 §4.3):
 *
 *     html`<div ${bsRow()}><div ${bsCol({ md: 6 })}>…</div></div>`
 *
 * The argument is the inputs object. Outputs are DOM events on the element,
 * lowercased. The core attaches once the element is connected, after the
 * render that created it, and detaches while the part is disconnected.
 */
export function coreDirective<I, S, P, E, C, PC, M>(core: ComponentCore<I, S, P, E, C, PC, M>, options: ElementCoreOptions<P, I>): (inputs?: Partial<I>) => DirectiveResult {
  class CoreElementDirective extends AsyncDirective {
    #host: ElementCore<I> | null = null;
    #element: Element | null = null;

    constructor(part: PartInfo) {
      super(part);
      if (part.type !== PartType.ELEMENT) throw new Error(`${options.idPrefix} is an element directive: put it in an element's attribute position`);
    }

    render(_inputs?: Partial<I>): unknown {
      return noChange;
    }

    override update(part: ElementPart, [value]: [Partial<I>?]): unknown {
      const inputs = directiveInputs(options.defaults, value);
      if (!this.#host || this.#element !== part.element) {
        this.#host?.detach();
        this.#element = part.element;
        const host = (this.#host = elementCore(core, part.element as HTMLElement, inputs, options));
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
    }

    protected override reconnected(): void {
      this.#host?.attach();
    }
  }
  return directive(CoreElementDirective);
}

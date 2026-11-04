import { nothing } from 'lit';
import { Directive, directive, PartType, type DirectiveResult, type PartInfo } from 'lit/directive.js';

/**
 * The compiled form of a view's `<instance-style :name :css />` (#458 M4): a `<style>`
 * holding one instance's own sheet, rendered where the tag sits. Lit does not bind
 * inside a template's `<style>`, so the directive owns the element and rewrites its
 * text; a null `css` renders nothing.
 *
 *     html`${instanceStyle(view.layoutCss)}`
 */
class InstanceStyleDirective extends Directive {
  #element: HTMLStyleElement | null = null;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.CHILD) throw new Error('instanceStyle() must be used in child position');
  }

  render(css: string | null | undefined): HTMLStyleElement | typeof nothing {
    if (!css) return nothing;
    this.#element ??= document.createElement('style');
    if (this.#element.textContent !== css) this.#element.textContent = css;
    return this.#element;
  }
}

export const instanceStyle: (css: string | null | undefined) => DirectiveResult<typeof InstanceStyleDirective> = directive(InstanceStyleDirective);

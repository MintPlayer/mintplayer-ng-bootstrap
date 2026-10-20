import { Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';

/** An attribute bag as a core's `connect()` returns it. `null`/`undefined`/`false` remove the attribute; `true` sets it empty. */
export type PropBag = Record<string, string | number | boolean | null | undefined>;

/**
 * Attribute names a bag may never set. A bag is data the core computed, but a
 * generic setter is still an injection sink, so URL-bearing and script-bearing
 * attributes are refused outright rather than sanitised.
 */
const REFUSED = new Set(['href', 'src', 'srcdoc', 'xlink:href', 'style', 'action', 'formaction', 'data']);

function isRefused(name: string): boolean {
  return REFUSED.has(name) || name.startsWith('on');
}

/**
 * Apply a core's attribute bag to the host element — the Angular stand-in for
 * JSX/Lit/Vue attribute spread. The directive diffs the previous and next bag:
 * a key that disappears is *removed* from the DOM (a stale
 * `aria-activedescendant` would otherwise survive a close), and unchanged keys
 * are not rewritten.
 *
 * Attributes are written through `Renderer2`, so they land in the server-
 * rendered HTML and are re-applied identically after hydration (spike S2 in
 * docs/prd/typeahead-wc-436.md). Consumers never see a bag: the front's own
 * template binds `[mpProps]="api().input"` on its own nodes.
 */
@Directive({ selector: '[mpProps]' })
export class MpPropsDirective {
  readonly mpProps = input<PropBag | null | undefined>(null);

  private readonly element = inject(ElementRef).nativeElement as Element;
  private readonly renderer = inject(Renderer2);
  private applied: PropBag = {};

  constructor() {
    effect(() => this.apply(this.mpProps() ?? {}));
  }

  private apply(next: PropBag): void {
    const previous = this.applied;
    Object.keys(previous)
      .filter((name) => !(name in next) || next[name] === null || next[name] === undefined || next[name] === false)
      .forEach((name) => this.renderer.removeAttribute(this.element, name));
    Object.entries(next)
      .filter(([name, value]) => value !== null && value !== undefined && value !== false)
      .filter(([name]) => {
        if (isRefused(name)) {
          throw new Error(`[mpProps] refuses to set "${name}"; bind it explicitly in the template.`);
        }
        return true;
      })
      .filter(([name, value]) => !Object.is(previous[name], value))
      .forEach(([name, value]) => this.renderer.setAttribute(this.element, name, value === true ? '' : String(value)));
    this.applied = next;
  }
}

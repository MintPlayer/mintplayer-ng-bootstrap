import { effect, ElementRef, inject, Renderer2 } from '@angular/core';
import { applyPropBag, type PropBag } from './props.directive';

/**
 * Apply a core's attribute bag to the component's own host element: the host
 * twin of `[mpProps]`, for a compiled template whose root is marked `mp-host`
 * (the root element IS the host, so the template holds only its children).
 *
 * Diffs like `[mpProps]` and writes through `Renderer2`, so the attributes are
 * in the server-rendered HTML. `class` is merged token by token, never
 * written as an attribute: the consumer's own classes on the host survive.
 *
 *     constructor() { useHostProps(() => this.view().root); }
 */
export function useHostProps(bag: () => PropBag | null | undefined): void {
  const element = inject(ElementRef).nativeElement as Element;
  const renderer = inject(Renderer2);
  let applied: PropBag = {};
  let classes: string[] = [];
  effect(() => {
    const { class: className, ...rest } = bag() ?? {};
    const next = typeof className === 'string' ? className.split(/\s+/).filter(Boolean) : [];
    classes.filter((name) => !next.includes(name)).forEach((name) => renderer.removeClass(element, name));
    next.filter((name) => !classes.includes(name)).forEach((name) => renderer.addClass(element, name));
    classes = next;
    applied = applyPropBag(renderer, element, applied, rest);
  });
}

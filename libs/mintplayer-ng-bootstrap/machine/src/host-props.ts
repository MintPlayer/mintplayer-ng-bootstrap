import { effect, ElementRef, inject, Renderer2 } from '@angular/core';
import { takeHostAria } from '@mintplayer/ng-bootstrap/a11y';
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
export function useHostProps(bag: () => PropBag | null | undefined, target?: () => Element | null): void {
  const host = inject(ElementRef).nativeElement as Element;
  const renderer = inject(Renderer2);
  let applied: PropBag = {};
  let classes: string[] = [];
  effect(() => {
    // `target`: another element than the host (a structural directive's anchor), not placed yet in the constructor.
    const element = target ? target() : host;
    const { class: className, ...rest } = bag() ?? {};
    if (!element) return;
    const next = typeof className === 'string' ? className.split(/\s+/).filter(Boolean) : [];
    classes.filter((name) => !next.includes(name)).forEach((name) => renderer.removeClass(element, name));
    next.filter((name) => !classes.includes(name)).forEach((name) => renderer.addClass(element, name));
    classes = next;
    applied = applyPropBag(renderer, element, applied, rest);
  });
}

/** A host's forwarded attributes (`useHostAttrs`), and the host they came from. */
export interface HostAttrs {
  readonly host: HTMLElement;
  readonly attrs: PropBag;
}

/**
 * Host transparency for a compiled template whose role lives on an inner
 * `mp-attrs` node (#458): a consumer's `aria-*`, `id` and `tabindex` on the
 * host belong on that node, which binds the result as `[mpHostAttrs]`. `id`
 * and `tabindex` are moved (no duplicate id, no dead tab stop on the host);
 * `aria-*` are copied. Read once, in a field initializer, so the server render
 * already carries them where AT reads them. A consumer `role` is never taken:
 * the inner node's role is the core's contract.
 */
export function useHostAttrs(): HostAttrs {
  const host = inject(ElementRef).nativeElement as HTMLElement;
  return { host, attrs: takeHostAria(host) };
}

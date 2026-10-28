import { noChange } from 'lit';
import { Directive, directive, PartType, type ElementPart, type PartInfo } from 'lit/directive.js';

/** An attribute bag as a `@mintplayer/ui-core` `connect()` returns it. */
export type AttrBag = Record<string, string | number | boolean | null | undefined>;

const REFUSED = new Set(['href', 'src', 'srcdoc', 'xlink:href', 'style', 'action', 'formaction', 'data']);

/**
 * Apply a core's attribute bag to the element it sits on — Lit's stand-in for
 * JSX/Vue attribute spread, and the twin of Angular's `[mpProps]`. Diffs the
 * previous bag: a key that disappears (or becomes null/false) is removed, so a
 * stale `aria-activedescendant` never survives a close. URL- and
 * script-bearing names are refused, as in the Angular directive.
 *
 *     html`<input ${props(api.input)}>`
 */
class PropsDirective extends Directive {
  #applied: AttrBag = {};

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) throw new Error('props() must be used in element position');
  }

  render(_bag: AttrBag): typeof noChange {
    return noChange;
  }

  override update(part: ElementPart, [bag]: [AttrBag]): typeof noChange {
    const el = part.element;
    const absent = (v: unknown) => v === null || v === undefined || v === false;
    Object.keys(this.#applied)
      .filter((name) => !(name in bag) || absent(bag[name]))
      .forEach((name) => el.removeAttribute(name));
    Object.entries(bag)
      .filter(([, value]) => !absent(value))
      .filter(([name]) => {
        if (REFUSED.has(name) || name.startsWith('on')) throw new Error(`props() refuses to set "${name}"`);
        return true;
      })
      .filter(([name, value]) => !Object.is(this.#applied[name], value))
      .forEach(([name, value]) => el.setAttribute(name, value === true ? '' : String(value)));
    this.#applied = { ...bag };
    return noChange;
  }
}

export const props = directive(PropsDirective);

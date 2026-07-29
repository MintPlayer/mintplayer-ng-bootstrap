/**
 * Assert that every token of an IDREF attribute resolves in the tree the
 * *browser* would search.
 *
 * The bug this catches, and why it needs a helper rather than a convention: an
 * IDREF attribute resolves only within the containing tree of the element that
 * **holds** it — its shadow root if it is inside one, otherwise the document. It
 * never crosses a shadow boundary in either direction, and a dangling reference
 * fails completely silently: no console warning, no visual change, and the
 * attribute sits there in devtools looking correct.
 *
 * Three tests in this repo were green while asserting relationships that resolve
 * to nothing, because they checked the attribute's *string value*
 * (`expect(el.getAttribute('aria-controls')).toBe('panel-1')`) or resolved the id
 * in the wrong root (`shadowRoot.querySelector('#' + id)` for an attribute held
 * on the host). Both pass regardless of whether a screen reader can follow the
 * reference.
 *
 * Applied across the ~26 IDREF sites in the library this fails on exactly the
 * six known-dead ones: `mp-time-list`'s `aria-activedescendant`, `mp-ribbon` ↔
 * `mp-ribbon-tab` in both directions, `mp-checkbox`'s two forwarded attributes,
 * and `mp-dropdown-menu`'s `label-id`.
 */
export function expectIdrefResolves(el: Element, attribute: string): void {
  const raw = el.getAttribute(attribute);
  if (raw === null) {
    throw new Error(
      `Expected <${el.localName}> to carry ${attribute}, but the attribute is absent.`,
    );
  }

  const ids = raw.split(/\s+/).filter(Boolean);
  if (ids.length === 0) {
    throw new Error(`<${el.localName}> has an empty ${attribute}.`);
  }

  // getRootNode() is the whole point: resolve against the HOLDER's root, which
  // is the tree the browser searches. Using `document` here, or the shadow root
  // of some other element, is the mistake that let the dead references ship.
  const root = el.getRootNode() as Document | ShadowRoot;
  const unresolved = ids.filter((id) => !findById(root, id));

  if (unresolved.length > 0) {
    throw new Error(
      `${attribute}="${raw}" on <${el.localName}> does not resolve: `
        + `${unresolved.map((id) => `#${id}`).join(', ')} `
        + `${unresolved.length === 1 ? 'is' : 'are'} not in the holder's `
        + `${root instanceof ShadowRoot ? 'shadow root' : 'document'}. `
        + `IDREFs never cross a shadow boundary — mint both ends in the same render(), or pass a string name instead.`,
    );
  }
}

/** Assert that an IDREF attribute is absent, or present and fully resolvable. */
export function expectNoDanglingIdref(el: Element, attribute: string): void {
  if (!el.hasAttribute(attribute)) return;
  expectIdrefResolves(el, attribute);
}

const IDREF_ATTRIBUTES = [
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-activedescendant',
  'aria-errormessage',
  'aria-owns',
  'aria-details',
  'aria-flowto',
] as const;

/**
 * Walk a subtree (crossing shadow roots) and assert that no IDREF attribute
 * anywhere dangles. Use as a blanket regression net in a component's ARIA spec.
 */
export function expectNoDanglingIdrefsIn(root: Element | ShadowRoot): void {
  for (const el of collectElements(root)) {
    for (const attribute of IDREF_ATTRIBUTES) {
      expectNoDanglingIdref(el, attribute);
    }
  }
}

function findById(root: Document | ShadowRoot, id: string): Element | null {
  if (typeof (root as Document).getElementById === 'function') {
    return (root as Document).getElementById(id);
  }
  // Older ShadowRoot implementations lack getElementById. CSS.escape guards ids
  // that are not valid selectors on their own (leading digits, colons).
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id;
  return (root as unknown as ParentNode).querySelector(`#${escaped}`);
}

function collectElements(root: Element | ShadowRoot): Element[] {
  const out: Element[] = [];
  const visit = (node: Element | ShadowRoot): void => {
    for (const child of Array.from(node.children)) {
      out.push(child);
      if (child.shadowRoot) visit(child.shadowRoot);
      visit(child);
    }
  };
  if (root instanceof Element) out.push(root);
  visit(root);
  return out;
}

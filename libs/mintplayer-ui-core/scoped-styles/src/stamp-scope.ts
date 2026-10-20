/** The attribute a scoped sheet's selectors match on. Fronts write it literally in their templates. */
export const SCOPE_ATTRIBUTE = 'data-mps';

export function validateScope(scope: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(scope)) {
    throw new Error(
      `scoped styles: invalid scope ${JSON.stringify(scope)} — expected a ` +
        `lowercase identifier (the component name without its mp- prefix)`,
    );
  }
}

/**
 * Imperatively stamp a DOM subtree with a scope — for DOM a template cannot
 * see (`innerHTML` output, `document.createElement`, an overlay panel built by
 * hand). Skips subtrees that already belong to another scope. Stamp BEFORE a
 * consumer's node is appended: stamping recurses, and a consumer's DOM must
 * never carry a component's scope.
 */
export function stampScope(root: Element, scope: string): void {
  validateScope(scope);
  const existing = root.getAttribute(SCOPE_ATTRIBUTE);
  if (existing !== null && existing !== scope) return;
  root.setAttribute(SCOPE_ATTRIBUTE, scope);
  Array.from(root.children).forEach((child) => stampScope(child, scope));
}

/**
 * A component's consumer links (its captured child elements), marked with a
 * Bootstrap class and the component's scope, so the scoped Bootstrap part
 * (`.nav-link:where([data-mps])`) styles them. Idempotent: an element calls it on every update.
 */
export function markLinks(nodes: readonly Node[], className: string, scope: string): void {
  nodes
    .filter((node): node is Element => node instanceof Element)
    .forEach((link) => {
      link.classList.add(className);
      link.setAttribute('data-mps', scope);
    });
}

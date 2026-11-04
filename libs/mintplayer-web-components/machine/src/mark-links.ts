/**
 * A component's consumer links (its captured child elements), marked with a
 * Bootstrap class only. Consumer DOM is never stamped: the nav part reaches
 * it through its anchor (`.nav-link:where([data-mps], :is(.nav, .navbar-nav)[data-mps] *)`). Idempotent: an element calls it on every update.
 */
export function markLinks(nodes: readonly Node[], className: string): void {
  nodes
    .filter((node): node is Element => node instanceof Element)
    .forEach((link) => link.classList.add(className));
}

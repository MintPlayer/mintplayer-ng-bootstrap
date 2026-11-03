/**
 * The element an overlay renders into (#458 §4.4): a `div` at the end of
 * `<body>`, outside every `overflow: hidden` / `position: relative` ancestor of
 * the component that opened it. Each front renders the overlay's template into
 * it (Angular an embedded view, React a portal, Vue `<Teleport>`, Lit `render`).
 *
 * The overlay leaves the declaring tree, so it loses what it inherited there.
 * The host copies the inherited state that changes how it renders: the colour
 * mode (`data-bs-theme`), the direction and the language. Custom properties set
 * on an ancestor do not follow (documented in the CHANGELOG).
 */
export const BODY_HOST_ATTRIBUTE = 'data-mp-overlay';

/** The inherited attributes a body host copies from its declaring position. */
export const INHERITED_ATTRIBUTES = ['data-bs-theme', 'dir', 'lang'] as const;

/**
 * Append a body host for overlay `id`, after removing any host already there
 * under the same id: the copy a server rendered, which the client replaces with
 * its own (the server's nodes belong to no client view).
 *
 * @param from The overlay's declaring position (its anchor's parent element).
 */
export function createBodyHost(doc: Document, id: string, from: Element | null): HTMLElement {
  removeBodyHost(doc, id);
  const host = doc.createElement('div');
  host.setAttribute(BODY_HOST_ATTRIBUTE, id);
  INHERITED_ATTRIBUTES.forEach((name) => {
    const value = from?.closest(`[${name}]`)?.getAttribute(name);
    if (value) host.setAttribute(name, value);
  });
  doc.body.appendChild(host);
  return host;
}

/** Remove the body host of overlay `id`, if there is one. */
export function removeBodyHost(doc: Document, id: string): void {
  // Read by attribute, not by a CSS selector: an id is never escaped wrong this way.
  Array.from(doc.body.children)
    .filter((el) => el.getAttribute(BODY_HOST_ATTRIBUTE) === id)
    .forEach((el) => el.remove());
}

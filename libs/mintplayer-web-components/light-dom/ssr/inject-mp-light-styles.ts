import { MP_LIGHT_STYLE_TAGS } from './mp-light-styles-chrome.generated';

/**
 * Injects the light-tier components' rescoped stylesheets into
 * server-rendered HTML so they are styled with JavaScript disabled. Unlike
 * the DSD injectors, Tier-L components have no shadow root — their styles
 * are document-level — so this is a per-component head insertion, gated on
 * the component's tag appearing in the page.
 *
 * Idempotent: a page already carrying a component's
 * `data-mp-light-styles="<key>"` marker is left alone (and the client-side
 * `installLightStyles` sees the marker and skips its own install, so
 * hydration never double-applies).
 */
export function injectMpLightStyles(html: string): string {
  let tags = '';
  for (const [tag, key, styleTag] of MP_LIGHT_STYLE_TAGS) {
    if (!html.includes(`<${tag}`)) continue;
    if (html.includes(`data-mp-light-styles="${key}"`)) continue;
    tags += styleTag;
  }
  if (!tags) return html;
  return html.replace(/<\/head>/i, `${tags}</head>`);
}

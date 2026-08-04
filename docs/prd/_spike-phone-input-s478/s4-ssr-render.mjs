// S4.3 server side — renders `<s4-country-list>` to Declarative Shadow DOM with
// @lit-labs/ssr, exactly the way `tools/lit-ssr-utils/gen-*-chrome.mjs` does,
// except per-request so the spec can pick the SERVER's locale independently of
// the browser's. That is the whole point: it manufactures the ICU/locale skew a
// real deployment gets for free.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';

const { render } = await import('@lit-labs/ssr');
const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
const { html, nothing } = await import('lit');
await import('./s4-element.mjs');

export async function renderSsrPage({ serverLocale, clientLocale, hydrate = true, dev = false }) {
  const ssr = await collectResult(
    render(html`<s4-country-list locale=${serverLocale ?? nothing}></s4-country-list>`),
  );

  // The shadow markup was produced with the SERVER's locale; the host tag is then
  // rewritten to carry the CLIENT's, so hydration is handed two different strings
  // for the same part — exactly the skew a real deployment gets for free.
  const withClientAttr =
    clientLocale === undefined
      ? ssr
      : serverLocale === undefined
        ? ssr.replace('<s4-country-list', `<s4-country-list locale="${clientLocale}"`)
        : ssr.replace(`locale="${serverLocale}"`, `locale="${clientLocale}"`);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>S4.3 SSR hydration — server=${serverLocale ?? '(runtime default)'} client=${clientLocale ?? '(runtime default)'}</title>
  </head>
  <body>
    <p id="meta" data-server-locale="${serverLocale ?? ''}" data-client-locale="${clientLocale ?? ''}">
      server rendered with ${serverLocale ?? 'runtime default'} (node ICU ${process.versions.icu})
    </p>
    ${withClientAttr}
    ${hydrate ? `<script type="module" src="/s4-client${dev ? '.dev' : ''}.bundle.js"></script>` : ''}
  </body>
</html>`;
}

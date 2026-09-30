/**
 * The real renderer the DSD-chrome generators inject into `runChromeGenerator`
 * when a spec has not handed them a fake.
 *
 * Order is load-bearing and is why everything here is a dynamic import inside
 * the function rather than a static import at the top: the global DOM shim must
 * be installed BEFORE `lit` is evaluated and before any built element module
 * runs its `customElements.define`. A static import would also install the shim
 * process-wide the moment a spec imported a generator, which is the side effect
 * the generators' `main()` refactor exists to avoid.
 *
 * @param {string[]} entryUrls built element modules (`file:` URLs) to load
 *   after the shim, in order, so their elements are defined for `render()`.
 * @returns {Promise<{ html: Function, render: (template: unknown) => Promise<string> }>}
 */
export async function createLitRenderer(entryUrls = []) {
  await import('@lit-labs/ssr/lib/install-global-dom-shim.js');
  const { render } = await import('@lit-labs/ssr');
  const { collectResult } = await import('@lit-labs/ssr/lib/render-result.js');
  const { html } = await import('lit');
  await entryUrls.reduce((loaded, url) => loaded.then(() => import(url)), Promise.resolve());
  return { html, render: (template) => collectResult(render(template)) };
}

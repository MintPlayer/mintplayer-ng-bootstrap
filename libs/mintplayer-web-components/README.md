# mintplayer-web-components

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build mintplayer-web-components` to build the library.

## Running unit tests

Run `nx test mintplayer-web-components` to execute the unit tests via [Vitest](https://vitest.dev/).

## Architecture and styling

The `mp-*` custom elements are the Lit front of the framework-neutral TypeScript cores in
`@mintplayer/ui-core`, for apps without a framework. The Angular, React and Vue libraries do **not**
use these elements; they render their own HTML from the same cores.

- **Every element is generated** from a D10 source and renders in the light DOM. Its CSS is scoped
  onto a `data-mps` attribute and installed once per page, together with the Bootstrap partials its
  markup uses. Load only the page-level Bootstrap baseline globally.
- Consumer content is passed with `slot="…"` children or, for a slot that takes arguments, a
  `<slot>Renderer` property.

See **Styling and encapsulation** in the [workspace README](../../README.md).

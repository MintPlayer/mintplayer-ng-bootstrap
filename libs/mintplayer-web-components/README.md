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

- **Generated elements** (every component with a D10 manifest) render in the light DOM. Their CSS is
  scoped onto a `data-mps` attribute and installed once per page, together with the Bootstrap partial
  their markup uses. Load only the page-level Bootstrap baseline globally.
- **A few hand-written, slot-based elements** (checkbox, toggle button, tab control, pagination, shell…)
  keep a shadow root and take your content through native `<slot>`s.

See **Styling and encapsulation** in the [workspace README](../../README.md).

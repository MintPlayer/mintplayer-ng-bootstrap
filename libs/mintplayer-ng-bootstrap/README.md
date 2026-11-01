# mintplayer-ng-bootstrap

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test mintplayer-ng-bootstrap` to execute the unit tests.

## Architecture and styling

Each component here is the Angular front of a framework-neutral TypeScript core in
`@mintplayer/ui-core` (state, keyboard, ARIA, async lifecycles). It renders its own HTML from that
core. It does **not** wrap or render a web component, so server rendering emits real markup.

- **Styles ship per component.** A component installs its own scoped sheet and the Bootstrap partial
  its markup uses, once per page, when it first renders (written into `<head>` during SSR). Your
  global stylesheet loads only the page-level Bootstrap baseline, never component partials. A component
  and its styles can ship in the lazy chunk of the page that uses it.
- **Light DOM, emulated encapsulation.** No shadow root. The component's CSS is scoped at build time onto
  a `data-mps` attribute, like Angular's `_ngcontent`. Your CSS and Bootstrap's utilities reach anything
  you render into a component, page CSS also reaches its internals, and its own rules cannot leak out.

See **Styling and encapsulation** in the [workspace README](../../README.md).

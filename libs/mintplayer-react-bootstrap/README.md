# mintplayer-react-bootstrap

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test mintplayer-react-bootstrap` to execute the unit tests via [Vitest](https://vitest.dev/).

## Styling and encapsulation

Most components keep a shadow root and take your content through native slots, so your stylesheets
reach that content normally.

``BsDatatable`, `BsTreeview`, `BsTreeSelect` and `BsQueryBuilder`` mount DOM you author (row / node templates, cell renderers,
editor factories) and therefore render in the **light DOM**, with their own CSS scoped at build time
onto a `data-mps` attribute — the same device Angular uses for `_ngcontent`. Your styles and
Bootstrap's utilities reach anything you render into them; in exchange, page CSS also reaches their
internals, exactly as emulated encapsulation behaves elsewhere. `::part()` and `::slotted()` no
longer address them.

See **Styling and encapsulation** in the [workspace README](../../README.md) for the full contract
and the migration table.

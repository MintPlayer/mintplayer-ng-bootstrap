# mintplayer-web-components

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build mintplayer-web-components` to build the library.

## Running unit tests

Run `nx test mintplayer-web-components` to execute the unit tests via [Vitest](https://vitest.dev/).

## Styling and encapsulation

Most components keep a shadow root and take your content through native slots, so your stylesheets
reach that content normally.

``<mp-datatable>`, `<mp-treeview>`, `<mp-tree-select>` and the `<mp-query-builder>` family` mount DOM you author (row / node templates, cell renderers,
editor factories) and therefore render in the **light DOM**, with their own CSS scoped at build time
onto a `data-mps` attribute — the same device Angular uses for `_ngcontent`. Your styles and
Bootstrap's utilities reach anything you render into them; in exchange, page CSS also reaches their
internals, exactly as emulated encapsulation behaves elsewhere. `::part()` and `::slotted()` no
longer address them.

See **Styling and encapsulation** in the [workspace README](../../README.md) for the full contract
and the migration table.

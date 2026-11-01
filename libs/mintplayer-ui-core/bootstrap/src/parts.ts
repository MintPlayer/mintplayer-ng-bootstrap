// The per-component Bootstrap parts (#452, docs/prd/per-component-styles-452.md).
// Each is one stock partial in the shared `mp.bootstrap.components` sublayer, in
// two variants under ONE registry key:
//
// - `bootstrap<Partial>`: attribute-scoped, `:where([data-mps])` on the leftmost
//   class the partial owns. It matches only DOM a @mintplayer component rendered
//   (and stamped). Every component installs this one.
// - `bootstrap<Partial>Page`: verbatim stock Bootstrap, for raw Bootstrap markup a
//   page component renders itself. Installing it replaces the scoped copy (it
//   matches a superset with identical specificity), so a page never holds two.
//
// `order` is the partial's position in stock bootstrap.scss: the registry keeps
// part sheets in that order, so equal-specificity ties between partials
// (`.card-header-tabs` over `.nav-tabs`) resolve as in stock Bootstrap.
//
// ONE MODULE PER PART (parts/<partial>.part.ts, also one file each in the published
// lib): bundlers assign whole modules to chunks, so a single module holding every
// part would land, with all its CSS, in the chunk of the first importer (the app
// shell). Separate modules let each part ride the lazy chunk of whoever installs it.

export type { BootstrapPart } from './bootstrap-part';
export * from './parts/containers.part';
export * from './parts/grid.part';
export * from './parts/tables.part';
export * from './parts/forms.part';
export * from './parts/transitions.part';
export * from './parts/dropdown.part';
export * from './parts/button-group.part';
export * from './parts/nav.part';
export * from './parts/navbar.part';
export * from './parts/card.part';
export * from './parts/accordion.part';
export * from './parts/breadcrumb.part';
export * from './parts/pagination.part';
export * from './parts/badge.part';
export * from './parts/alert.part';
export * from './parts/progress.part';
export * from './parts/list-group.part';
export * from './parts/close.part';
export * from './parts/toasts.part';
export * from './parts/modal.part';
export * from './parts/tooltip.part';
export * from './parts/popover.part';
export * from './parts/carousel.part';
export * from './parts/spinners.part';
export * from './parts/offcanvas.part';
export * from './parts/placeholders.part';

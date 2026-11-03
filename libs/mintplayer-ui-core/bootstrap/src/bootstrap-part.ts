/**
 * One stock Bootstrap partial, compiled into the shared `mp.bootstrap.components`
 * layer (#452, docs/prd/per-component-styles-452.md). Each partial ships in two
 * variants under ONE registry key:
 *
 * - `bootstrap<Partial>`: attribute-scoped, `:where([data-mps])` on the leftmost
 *   class the partial owns. It matches only DOM a @mintplayer component rendered
 *   (and stamped). Every component installs this one.
 * - `bootstrap<Partial>Page`: verbatim stock Bootstrap, for raw Bootstrap markup a
 *   page component renders itself. Installing it replaces the scoped copy (it
 *   matches a superset with identical specificity), so a page never holds two.
 *
 * ONE SUBPATH ENTRY PER PART: `@mintplayer/ui-core/bootstrap/<partial>`. Bundlers
 * assign whole modules to chunks, and esbuild (Angular's application builder) does
 * so by file-level reachability: a barrel re-exporting every part, once reachable
 * from the app shell, dragged every part the app used anywhere into an initial
 * chunk (measured). `@mintplayer/ui-core/bootstrap` itself holds only the install
 * functions and this type, and imports no part.
 */
export interface BootstrapPart {
  /** Registry key, `bootstrap-<partial>`: one copy per page, whichever variant. */
  readonly key: string;
  readonly css: string;
  /** The verbatim variant: it replaces a scoped copy already installed under `key`. */
  readonly page: boolean;
  /**
   * Position of the partial in stock bootstrap.scss (BOOTSTRAP_PARTIAL_ORDER): the
   * registry keeps part sheets in that order, so equal-specificity ties between
   * partials (`.card-header-tabs` over `.nav-tabs`) resolve as in stock Bootstrap.
   */
  readonly order: number;
}

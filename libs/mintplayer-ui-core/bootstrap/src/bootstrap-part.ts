/**
 * One stock Bootstrap partial, compiled into the shared `mp.bootstrap.components`
 * layer (#452, docs/prd/per-component-styles-452.md).
 */
export interface BootstrapPart {
  /** Registry key, `bootstrap-<partial>`: one copy per page, whichever variant. */
  readonly key: string;
  readonly css: string;
  /** The verbatim variant: it replaces a scoped copy already installed under `key`. */
  readonly page: boolean;
  /** Position of the partial in stock bootstrap.scss (BOOTSTRAP_PARTIAL_ORDER). */
  readonly order: number;
}

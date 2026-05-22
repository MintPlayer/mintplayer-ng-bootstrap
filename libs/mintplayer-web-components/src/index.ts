/**
 * @mintplayer/web-components — framework-agnostic Lit web component library.
 *
 * This primary entry intentionally exports nothing. Consumers should import
 * the specific sub-entrypoint they need:
 *
 *   import '@mintplayer/web-components/card';
 *   import { MpScheduler } from '@mintplayer/web-components/scheduler';
 *
 * Each sub-entrypoint side-effect-registers its element classes via
 * `customElements.define()` and re-exports the class for typed consumers.
 *
 * The full list of sub-entrypoints lives in this package's `exports` field
 * in `package.json` and in `docs/prd/wc-inventory.md` in the source repo.
 */
export {};

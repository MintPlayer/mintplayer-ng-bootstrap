/**
 * `?raw` imports for the vendored flag SVGs.
 *
 * The WC library's own tsconfig gets this from `vite/client`, but the framework
 * wrapper libraries do not — and they type-check *through* the path mapping into
 * this source, so `flag-loaders.generated.ts` would fail with TS2307 there. The
 * generated file triple-slash-references this declaration so it travels with any
 * program that includes it, rather than every consumer having to add `vite/client`
 * to its own types.
 */
declare module '*.svg?raw' {
  const content: string;
  export default content;
}

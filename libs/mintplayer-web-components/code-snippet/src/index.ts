export * from './mp-code-snippet.element';
export * from './types';
// The escape hatch for a language outside the bundled set, plus the predicate
// a consumer needs to ask whether one is available before rendering.
export { registerLanguage, canHighlight } from './core/highlighter';

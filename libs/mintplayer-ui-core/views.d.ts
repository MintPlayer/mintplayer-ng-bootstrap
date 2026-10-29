// Types for the component compiler's template dialect (PRD #437 D10), seen only
// by tsconfig.views.json: an editor type-checks the *.view.vue files as Vue,
// and these attributes mean something to the compiler, not to Vue.
import 'vue';

declare module 'vue' {
  interface HTMLAttributes {
    /** The element is the component's host (the root bag lands here in Angular and Lit). */
    'mp-host'?: unknown;
    /** The consumer's aria-* / id / tabindex are routed to this node in React and Vue. */
    'mp-attrs'?: unknown;
  }
}

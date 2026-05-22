/**
 * @mintplayer/vue-bootstrap — Vue 3.5 SFC adapters around
 * @mintplayer/web-components.
 *
 * Import the specific sub-entry you need:
 *
 *   import { BsCard, BsCardBody } from '@mintplayer/vue-bootstrap/card';
 *   import { BsScheduler } from '@mintplayer/vue-bootstrap/scheduler';
 *   import { BsDatepicker } from '@mintplayer/vue-bootstrap/datepicker'; // v-model
 *
 * Consumer Vite config must mark the WC tags as custom elements so the
 * compiler doesn't warn about unknown components:
 *
 *   vue({ template: { compilerOptions: { isCustomElement: t =>
 *     t.startsWith('mp-') || t.startsWith('mint-') } } })
 */
export {};

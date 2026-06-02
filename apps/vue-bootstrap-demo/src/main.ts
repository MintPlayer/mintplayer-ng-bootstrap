import { createSSRApp } from 'vue';
import App from './app/App.vue';
import { createAppRouter } from './router';

// Shared app factory used by both entries. `createSSRApp` (not `createApp`) so
// the client hydrates the server-rendered markup instead of discarding it.
// Styles (incl. Bootstrap) are linked as a real stylesheet from index.html
// (`/src/styles.css`, which @imports Bootstrap) so the SSR'd page is styled
// with JavaScript disabled — they are intentionally NOT imported here.
export function createApp(ssr = false) {
  const app = createSSRApp(App);
  const router = createAppRouter(ssr);
  app.use(router);
  return { app, router };
}

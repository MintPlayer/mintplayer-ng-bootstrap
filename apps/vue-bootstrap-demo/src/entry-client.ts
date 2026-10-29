import { createApp } from './main';

// The server already rendered the markup into #root (see entry-server.ts), so
// mounting a createSSRApp hydrates it in place — preserving the SSR'd DOM and
// attaching Vue's listeners. Wait for the router so the matched
// view is resolved before hydration (it was awaited on the server too).
const { app, router } = createApp();
router.isReady().then(() => app.mount('#root'));

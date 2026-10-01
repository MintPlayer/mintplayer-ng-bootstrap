// SSR server for the React demo. Plain ESM so it runs under `node` with no
// transpile step: in dev it delegates TS/JSX + path-alias resolution to Vite
// (`ssrLoadModule`); in prod it loads the `vite build --ssr` bundle.
//
//   dev:  node apps/react-bootstrap-demo/server.js
//   prod: NODE_ENV=production node apps/react-bootstrap-demo/server.js
//
// Declarative Shadow DOM injection for `<mp-shell>` happens inside
// entry-server's `render()` (it has the path alias), so this file never needs
// to import the framework libraries.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 4000;
// Bind all interfaces in production (containers reach the server through
// Docker port-forwarding, which can't see a loopback-only `localhost` bind);
// keep `localhost` in dev so `nx serve` doesn't expose the machine on the LAN.
const host = process.env.HOST || (isProd ? '0.0.0.0' : 'localhost');

// Built layout (prod): dist/apps/react-bootstrap-demo/{browser,server}.
const distDir = path.resolve(__dirname, '../../dist/apps/react-bootstrap-demo');
const clientDir = path.join(distDir, 'browser');
const serverEntry = path.join(distDir, 'server', 'entry-server.mjs');
// Cache the immutable prod index.html in memory — avoids a disk read per request.
let prodTemplate;

// The site default mode, read from index.html's
// <meta name="bs-theme-default-mode" content="..."> so the SSR splice and the
// pre-boot script can never disagree (PRD dark-mode D5b). resolveServerTheme
// validates it; absent or invalid means auto.
const DEFAULT_MODE_META = /<meta\s+name=["']bs-theme-default-mode["']\s+content=["']([^"']*)["']/i;
const readDefaultMode = (template) => DEFAULT_MODE_META.exec(template)?.[1] ?? null;

async function createServer() {
  const app = express();

  /** @type {import('vite').ViteDevServer | undefined} */
  let vite;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      root: __dirname,
      appType: 'custom',
      // Distinct HMR ws port per demo: in middleware mode Vite can't share the
      // Express port for HMR, so all three demos would otherwise collide on the
      // default 24678 when run together (nx run-many).
      server: { middlewareMode: true, hmr: { port: 24678 } },
    });
    // Vite's middlewares include the `server.proxy` rules from vite.config
    // (so `/api` still reaches the .NET API in dev) plus HMR + asset serving.
    app.use(vite.middlewares);
  } else {
    const compression = (await import('compression')).default;
    app.use(compression());
    app.use(
      express.static(clientDir, {
        index: false,
        maxAge: '1y',
        redirect: false,
        // Everything Vite emits is content-hashed, so a year is safe. The theme
        // pre-boot script is not: it keeps a stable URL (index.html loads it by
        // name), so it revalidates on every load and a new release reaches
        // returning visitors (PRD dark-mode D5).
        setHeaders: (res, filePath) => {
          if (path.basename(filePath) === 'bs-theme-preboot.js') res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
  }

  app.use(async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template;
      let entry;

      if (!isProd) {
        template = await fs.readFile(path.join(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        entry = await vite.ssrLoadModule('/src/entry-server.tsx');
      } else {
        template = prodTemplate ??= await fs.readFile(path.join(clientDir, 'index.html'), 'utf-8');
        entry = await import(pathToFileURL(serverEntry).href);
      }

      // The theme helpers come through the SSR entry (it re-exports them from
      // @mintplayer/web-components/theming): the entry is bundled by Vite, so
      // this plain-ESM file needs no path alias in dev or prod.
      const { render, resolveServerTheme, injectThemeAttribute } = entry;
      const appHtml = await render(url);
      // SSR theme splice (PRD dark-mode D5b, FR-6): a valid bs-theme-mode cookie,
      // else the meta default, becomes <html data-bs-theme>; auto renders none
      // and the pre-boot script resolves it from the OS scheme.
      const mode = resolveServerTheme(req.headers.cookie, { defaultMode: readDefaultMode(template) });
      const html = injectThemeAttribute(template.replace('<!--app-html-->', appHtml), mode);
      // The markup depends on the cookie, so no shared cache may serve one
      // visitor's theme to another.
      res.status(200).set({ 'Content-Type': 'text/html', Vary: 'Cookie' }).end(html);
    } catch (error) {
      vite?.ssrFixStacktrace(error);
      next(error);
    }
  });

  return app;
}

// Dev only: take the port back from a leftover of this workspace before binding.
// nx cannot be relied on to have killed the previous one — on Windows killing a
// parent does not kill its children, and nx leaves a continuous task running when
// a target that depends on it fails.
//
// The import is DYNAMIC and inside the guard on purpose. The runtime image copies
// only this file plus `dist/` (see Dockerfile), so a static import of anything
// under `tools/` would throw ERR_MODULE_NOT_FOUND at container start — and there
// is nothing to reclaim in production anyway: the container owns its port,
// `ps`/`lsof` may not even be installed, and killing processes there would be
// actively wrong.
//
// Awaited because the socket must be RELEASED before we bind, not merely its
// holder killed — the OS frees a listening socket asynchronously.
if (!isProd) {
  const { reclaimPortAndWait } = await import('../../tools/scripts/lib/dev-processes.mjs');
  await reclaimPortAndWait(port, { label: 'react-demo' });
}

createServer().then((app) => {
  app.listen(port, host, () => {
    console.log(
      `React SSR server (${isProd ? 'production' : 'development'}) on http://${host}:${port}`,
    );
  });
});

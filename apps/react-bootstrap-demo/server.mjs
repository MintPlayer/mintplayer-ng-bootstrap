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
      express.static(clientDir, { index: false, maxAge: '1y', redirect: false }),
    );
  }

  app.use(async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template;
      let render;

      if (!isProd) {
        template = await fs.readFile(path.join(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
      } else {
        template = await fs.readFile(path.join(clientDir, 'index.html'), 'utf-8');
        render = (await import(pathToFileURL(serverEntry).href)).render;
      }

      const appHtml = await render(url);
      const html = template.replace('<!--app-html-->', appHtml);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      vite?.ssrFixStacktrace(error);
      next(error);
    }
  });

  return app;
}

createServer().then((app) => {
  app.listen(port, host, () => {
    console.log(
      `React SSR server (${isProd ? 'production' : 'development'}) on http://${host}:${port}`,
    );
  });
});

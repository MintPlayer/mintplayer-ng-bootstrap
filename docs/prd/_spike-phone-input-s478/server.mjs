// Throwaway static server for the phone-input S4/S7 spikes. Deleted before merge.
// Also owns the S4.3 SSR route, which renders a Lit element to Declarative
// Shadow DOM via @lit-labs/ssr on every request so the spec can vary the locale
// the *server* uses independently of the browser's.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css',
};

const { renderSsrPage } = await import('./s4-ssr-render.mjs');

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/s4-ssr') {
    const body = await renderSsrPage({
      // The locale the SERVER renders with. `?serverLocale=` absent means the
      // server passes `undefined` to Intl.DisplayNames — its runtime default.
      serverLocale: url.searchParams.get('serverLocale') ?? undefined,
      // The locale the CLIENT element will be told to use on hydration.
      clientLocale: url.searchParams.get('clientLocale') ?? undefined,
      hydrate: url.searchParams.get('hydrate') !== '0',
      dev: url.searchParams.get('dev') === '1',
    });
    res.writeHead(200, { 'content-type': types['.html'] });
    return res.end(body);
  }

  const file = normalize(join(root, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(4604, () => console.log('spike server on http://localhost:4604'));

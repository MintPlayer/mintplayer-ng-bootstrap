import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

// const browserDistFolder = join(__dirname, '../browser');
const browserDistFolder = join(process.cwd(), 'dist/apps/ng-bootstrap-demo/browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 *
 * For LAN-IP requests (e.g. when accessing the dev server from a phone on
 * the same Wi-Fi via `npm run start:network`), rewrite the Host header to
 * `localhost`. Angular's SSR SSRF prevention only matches hosts literally
 * (or via `*.suffix`) and there is no wildcard pattern that covers
 * arbitrary IPv4 addresses, so without this rewrite SSR would reject every
 * request from a non-localhost host with "URL with hostname X is not
 * allowed". Public-domain hosts (e.g. production traffic from
 * bootstrap.mintplayer.com) don't match the LAN pattern and pass through
 * untouched.
 */
const LAN_IP_REGEX = /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;
app.use((req, res, next) => {
  const hostHeader = req.headers.host;
  if (hostHeader) {
    const hostnameOnly = hostHeader.split(':')[0];
    if (LAN_IP_REGEX.test(hostnameOnly)) {
      req.headers.host = 'localhost';
    }
  }
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

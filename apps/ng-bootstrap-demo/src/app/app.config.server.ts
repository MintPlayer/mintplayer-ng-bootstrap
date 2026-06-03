import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { config } from './app.config';
import { serverRoutes } from './app.routes.server';

// Server-only providers, merged on top of the shared browser `config`. Declaring
// `withRoutes` opts the app into explicit render modes (see app.routes.server.ts:
// RenderMode.Server / live Node SSR). Without this the build defaults every route
// to RenderMode.Prerender, whose output omits the hydration transfer state.
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
  ],
};

export const serverAppConfig = mergeApplicationConfig(config, serverConfig);

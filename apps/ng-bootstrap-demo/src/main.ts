// MUST precede the web-component import: teaches Lit to HYDRATE the server-
// rendered Declarative Shadow DOM instead of re-rendering into it. The SSR'd
// <mp-shell> already has a parser-attached DSD shadow; when it upgrades (line
// below), without this shim Lit would append a SECOND copy of the chrome (a
// duplicate top bar/toggle flashing below the sidebar) before Angular's
// destructive bootstrap recreates the element.
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config';
// Register <mp-shell> on the client BEFORE the (destructive, non-hydrating)
// bootstrap re-creates the DOM, so the element upgrades synchronously when
// Angular creates it and never paints in its un-upgraded, shadow-less "stacked"
// state. Client-only: main.server.ts doesn't import this, so customElements /
// DOM globals are never touched on the server. (bs-shell still self-registers
// the WC via afterNextRender for other consumers; the define guard makes this
// idempotent.)
import '@mintplayer/web-components/shell';


bootstrapApplication(AppComponent, config)
  .catch((err) => console.error(err));
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
// Register <mp-shell> on the client. The SSR'd element carries a parser-attached
// Declarative Shadow DOM; on upgrade the component adopts that shadow root and
// repopulates it once (see mp-shell.ts `createRenderRoot`), so it never paints
// the duplicate chrome that a naive re-render would append. Client-only:
// main.server.ts doesn't import this, so customElements / DOM globals are never
// touched on the server. (bs-shell also self-registers the WC via
// afterNextRender for other consumers; the define guard makes this idempotent.)
import '@mintplayer/web-components/shell';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config';


bootstrapApplication(AppComponent, config)
  .catch((err) => console.error(err));

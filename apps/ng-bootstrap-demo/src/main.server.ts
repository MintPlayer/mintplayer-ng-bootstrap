// IMPORTANT: dom-shim must load before any Lit WC module side-effect-registers
// via `customElements.define()`. The Angular SSR pass imports the Angular
// wrappers, which transitively import the WC modules; without the shim,
// `customElements.define` would not exist server-side and registration would
// throw. Importing `@lit-labs/ssr` triggers the shim install automatically
// (the package side-effect-installs the global DOM shim on import).
import '@lit-labs/ssr/lib/install-global-dom-shim.js';

import { bootstrapApplication, BootstrapContext } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { config } from './app/app.config';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, config, context);

export default bootstrap;

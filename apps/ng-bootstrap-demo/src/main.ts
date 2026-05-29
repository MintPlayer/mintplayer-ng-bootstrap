// IMPORTANT: lit-element-hydrate-support must load BEFORE any module that
// imports lit. It patches `LitElement.connectedCallback` so that on first
// connect the element detects an existing shadow root (from declarative
// shadow DOM the server emitted) and runs `hydrate()` rather than `render()`.
// Without this import the WCs would silently re-render and discard the SSR
// shadow content.
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config';

// Declarative Shadow DOM polyfill for older browsers (Safari < 16.4,
// Firefox < 123, Chromium < 111 — roughly 6% of users as of May 2026).
// Dynamic import so the 94% on supporting browsers don't pay the bytes.
// Hits Baseline Widely Available on 2026-08-20 — drop this block after.
if (!Object.prototype.hasOwnProperty.call(HTMLTemplateElement.prototype, 'shadowRoot')) {
  import('@webcomponents/template-shadowroot/template-shadowroot.js').then((m) => {
    m.hydrateShadowRoots(document.body);
  });
}

bootstrapApplication(AppComponent, config)
  .catch((err) => console.error(err));

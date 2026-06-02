import { RenderMode, ServerRoute } from '@angular/ssr';

// Render every route on the server per-request (live Node SSR) instead of the
// build-time default (RenderMode.Prerender / SSG). Prerendered output ships the
// `ngh` hydration annotations but NOT the `<script id="ng-state">` transfer
// state, so the client logs NG0505 and falls back to a destructive re-render —
// which is exactly what made <mp-shell> flash a duplicate top bar on reload.
// Live SSR emits the transfer state, so Angular hydrates the existing DOM.
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Server },
];

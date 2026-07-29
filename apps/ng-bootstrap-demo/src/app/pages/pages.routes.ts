import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  { path: 'overlays', loadChildren: () => import('./overlay/overlay.routes').then(m => m.ROUTES) },
  { path: 'additional-samples', loadChildren: () => import('./additional-samples/additional-samples.routes').then(m => m.ROUTES) },
  { path: 'basic', loadChildren: () => import('./basic/basic.routes').then(m => m.ROUTES) },
  { path: 'advanced', loadChildren: () => import('./advanced/advanced.routes').then(m => m.ROUTES) },
  { path: 'enterprise', loadChildren: () => import('./enterprise/enterprise.routes').then(m => m.ROUTES) },
  { path: 'animations', loadChildren: () => import('./animations/animations.routes').then(m => m.ROUTES) },
  // THROWAWAY — spike 0.1b (a11y plan Phase 0); not in the nav, deleted before merge.
  { path: 'spike/accordion-parity', loadComponent: () => import('./spike-accordion-parity/spike-accordion-parity.component').then(m => m.SpikeAccordionParityComponent) },
  // Wildcard fallback. Keeps Angular SSR from throwing "Cannot match any routes"
  // mid-render — a thrown SSR error leaves the response hanging and stalls
  // Playwright specs on `waitForLoadState('networkidle')`.
  { path: '**', loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent) },
];

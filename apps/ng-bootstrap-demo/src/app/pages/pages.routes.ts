import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: 'overlays', loadChildren: () => import('./overlay/overlay.routes').then(m => m.ROUTES) },
  { path: 'additional-samples', loadChildren: () => import('./additional-samples/additional-samples.routes').then(m => m.ROUTES) },
  { path: 'basic', loadChildren: () => import('./basic/basic.routes').then(m => m.ROUTES) },
  { path: 'advanced', loadChildren: () => import('./advanced/advanced.routes').then(m => m.ROUTES) },
  { path: 'animations', loadChildren: () => import('./animations/animations.routes').then(m => m.ROUTES) },
];

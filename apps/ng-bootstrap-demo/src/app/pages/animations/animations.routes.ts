import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'slide-up-down', loadComponent: () => import('./slide-up-down/slide-up-down.component').then(m => m.SlideUpDownComponent) },
  { path: 'fade-in-out', loadComponent: () => import('./fade-in-out/fade-in-out.component').then(m => m.FadeInOutComponent) },
  { path: 'color-transition', loadComponent: () => import('./color-transition/color-transition.component').then(m => m.ColorTransitionComponent) }
];
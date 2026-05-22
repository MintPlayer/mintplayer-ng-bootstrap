import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'grid', loadComponent: () => import('./grid/grid.component').then(m => m.GridComponent) },
  { path: 'card', loadComponent: () => import('./card/card.component').then(m => m.CardComponent) },
  { path: 'tab-control', loadComponent: () => import('./tab-control/tab-control.component').then(m => m.TabControlComponent) },
  { path: 'accordion', loadComponent: () => import('./accordion/accordion.component').then(m => m.AccordionComponent) },
];

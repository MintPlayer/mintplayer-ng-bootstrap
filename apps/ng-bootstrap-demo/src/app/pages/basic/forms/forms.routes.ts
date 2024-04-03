import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'floating-labels', loadComponent: () => import('./floating-labels/floating-labels.component').then(m => m.FloatingLabelsComponent) },
  { path: 'input-group', loadComponent: () => import('./input-group/input-group.component').then(m => m.InputGroupComponent) },
  { path: 'range', loadComponent: () => import('./range/range.component').then(m => m.RangeComponent) },
  { path: 'select', loadComponent: () => import('./select/select.component').then(m => m.SelectComponent) },
  { path: 'toggle-button', loadComponent: () => import('./toggle-button/toggle-button.component').then(m => m.ToggleButtonComponent) },
];

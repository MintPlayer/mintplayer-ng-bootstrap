import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'trust-html', loadComponent: () => import('./trust-html/trust-html.component').then(m => m.TrustHtmlComponent) },
  { path: 'split-string', loadComponent: () => import('./split-string/split-string.component').then(m => m.SplitStringComponent) },
  { path: 'slugify', loadComponent: () => import('./slugify/slugify.component').then(m => m.SlugifyComponent) },
  { path: 'word-count', loadComponent: () => import('./word-count/word-count.component').then(m => m.WordCountComponent) },
  { path: 'font-color', loadComponent: () => import('./font-color/font-color.component').then(m => m.FontColorComponent) },
  { path: 'linify', loadComponent: () => import('./linify/linify.component').then(m => m.LinifyComponent) },
  { path: 'has-property', loadComponent: () => import('./has-property/has-property.component').then(m => m.HasPropertyComponent) }
];
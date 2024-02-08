import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule) }
];

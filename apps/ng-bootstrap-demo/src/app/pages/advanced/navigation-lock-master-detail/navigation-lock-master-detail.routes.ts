import { Routes } from '@angular/router';
import { NavigationLockMasterDetailComponent } from './navigation-lock-master-detail.component';

export const ROUTES: Routes = [
  {
    path: '',
    component: NavigationLockMasterDetailComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'a' },
      { path: 'a', loadComponent: () => import('./child-a/child-a.component').then(m => m.ChildAComponent) },
      { path: 'b', loadComponent: () => import('./child-b/child-b.component').then(m => m.ChildBComponent) },
    ],
  },
];

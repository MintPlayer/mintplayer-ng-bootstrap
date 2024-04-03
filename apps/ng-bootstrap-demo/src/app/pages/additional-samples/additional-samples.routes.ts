import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'collapse', loadComponent: () => import('./collapse/collapse.component').then(m => m.CollapseComponent) },
  { path: 'focus-trap', loadComponent: () => import('./focus-trap/focus-trap.component').then(m => m.FocusTrapComponent) },
  { path: 'drag-drop', loadComponent: () => import('./drag-drop/drag-drop.component').then(m => m.DragDropComponent) },
  { path: 'qr-code', loadComponent: () => import('./qr-code/qr-code.component').then(m => m.QrCodeComponent) },
  { path: 'swiper', loadComponent: () => import('./swiper/swiper.component').then(m => m.SwiperComponent) },
  { path: 'parentify', loadComponent: () => import('./parentify/parentify.component').then(m => m.ParentifyComponent) }
];

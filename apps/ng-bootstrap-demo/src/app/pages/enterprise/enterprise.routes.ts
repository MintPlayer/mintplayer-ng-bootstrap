import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'datatables', loadComponent: () => import('./datatables/datatables.component').then(m => m.DatatablesComponent) },
  { path: 'file-manager', loadComponent: () => import('./file-manager/file-manager.component').then(m => m.FileManagerDemoComponent) },
  { path: 'scheduler', loadComponent: () => import('./scheduler/scheduler.component').then(m => m.SchedulerComponent) },
  { path: 'timeline', loadComponent: () => import('./timeline/timeline.component').then(m => m.TimelineComponent) },
  { path: 'dock', loadComponent: () => import('./dock/dock.component').then(m => m.DockComponent) },
  { path: 'tile-manager', loadComponent: () => import('./tile-manager/tile-manager.component').then(m => m.TileManagerComponent) },
  { path: 'ribbon', loadComponent: () => import('./ribbon/ribbon.component').then(m => m.RibbonComponent) },
  { path: 'query-builder', loadComponent: () => import('./query-builder/query-builder.component').then(m => m.QueryBuilderDemoComponent) },
  { path: 'otp-input', loadComponent: () => import('./otp-input/otp-input.component').then(m => m.OtpInputDemoComponent) },
];

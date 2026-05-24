import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'checkbox', loadComponent: () => import('./checkbox/checkbox.component').then(m => m.CheckboxComponent) },
  { path: 'datepicker', loadComponent: () => import('./datepicker/datepicker.component').then(m => m.DatepickerComponent) },
  { path: 'datetime-picker', loadComponent: () => import('./datetime-picker/datetime-picker.component').then(m => m.DatetimePickerComponent) },
  { path: 'floating-labels', loadComponent: () => import('./floating-labels/floating-labels.component').then(m => m.FloatingLabelsComponent) },
  { path: 'input-group', loadComponent: () => import('./input-group/input-group.component').then(m => m.InputGroupComponent) },
  { path: 'multi-range', loadComponent: () => import('./multi-range/multi-range.component').then(m => m.MultiRangeComponent) },
  { path: 'radio', loadComponent: () => import('./radio/radio.component').then(m => m.RadioComponent) },
  { path: 'range', loadComponent: () => import('./range/range.component').then(m => m.RangeComponent) },
  { path: 'select', loadComponent: () => import('./select/select.component').then(m => m.SelectComponent) },
  { path: 'timepicker', loadComponent: () => import('./timepicker/timepicker.component').then(m => m.TimepickerComponent) },
];

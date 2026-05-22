import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  { path: '', loadChildren: () => [], pathMatch: 'full', canActivate: [() => false] },
  { path: 'modals', loadComponent: () => import('./modal/modal.component').then(m => m.ModalComponent) },
  { path: 'tooltip', loadComponent: () => import('./tooltip/tooltip.component').then(m => m.TooltipComponent) },
  { path: 'dropdown', loadComponent: () => import('./dropdown/dropdown.component').then(m => m.DropdownComponent) },
  { path: 'context-menu', loadComponent: () => import('./context-menu/context-menu.component').then(m => m.ContextMenuComponent) },
  { path: 'typeahead', loadComponent: () => import('./typeahead/typeahead.component').then(m => m.TypeaheadComponent) },
  { path: 'multiselect-dropdown', loadComponent: () => import('./multiselect-dropdown/multiselect-dropdown.component').then(m => m.MultiselectDropdownComponent) },
  { path: 'offcanvas', loadComponent: () => import('./offcanvas/offcanvas.component').then(m => m.OffcanvasComponent) },
  { path: 'popover', loadComponent: () => import('./popover/popover.component').then(m => m.PopoverComponent) },
  { path: 'toast', loadComponent: () => import('./toast/toast.component').then(m => m.ToastComponent) },
  { path: 'shell', loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent) },
];
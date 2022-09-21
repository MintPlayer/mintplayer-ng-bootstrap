import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full', canActivate: [() => false] },
  { path: 'modals', loadChildren: () => import('./modal/modal.module').then(m => m.ModalModule) },
  { path: 'snackbar', loadChildren: () => import('./snackbar/snackbar.module').then(m => m.SnackbarModule) },
  { path: 'tooltip', loadChildren: () => import('./tooltip/tooltip.module').then(m => m.TooltipModule) },
  { path: 'dropdown', loadChildren: () => import('./dropdown/dropdown.module').then(m => m.DropdownModule) },
  { path: 'context-menu', loadChildren: () => import('./context-menu/context-menu.module').then(m => m.ContextMenuModule) },
  { path: 'typeahead', loadChildren: () => import('./typeahead/typeahead.module').then(m => m.TypeaheadModule) },
  { path: 'multiselect-dropdown', loadChildren: () => import('./multiselect-dropdown/multiselect-dropdown.module').then(m => m.MultiselectDropdownModule) },
  { path: 'offcanvas', loadChildren: () => import('./offcanvas/offcanvas.module').then(m => m.OffcanvasModule) },
  { path: 'popover', loadChildren: () => import('./popover/popover.module').then(m => m.PopoverModule) },
  { path: 'toast', loadChildren: () => import('./toast/toast.module').then(m => m.ToastModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OverlayRoutingModule { }

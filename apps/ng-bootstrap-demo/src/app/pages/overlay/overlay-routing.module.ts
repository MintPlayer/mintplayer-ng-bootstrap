import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverlayComponent } from './overlay.component';

const routes: Routes = [
  { path: '', component: OverlayComponent },
  { path: 'modals', loadChildren: () => import('./modal/modal.module').then(m => m.ModalModule) },
  { path: 'snackbar', loadChildren: () => import('./snackbar/snackbar.module').then(m => m.SnackbarModule) },
  { path: 'tooltip', loadChildren: () => import('./tooltip/tooltip.module').then(m => m.TooltipModule) },
  { path: 'dropdown', loadChildren: () => import('./dropdown/dropdown.module').then(m => m.DropdownModule) },
  { path: 'context-menu', loadChildren: () => import('./context-menu/context-menu.module').then(m => m.ContextMenuModule) },
  { path: 'typeahead', loadChildren: () => import('./typeahead/typeahead.module').then(m => m.TypeaheadModule) },
  { path: 'multiselect-dropdown', loadChildren: () => import('./multiselect-dropdown/multiselect-dropdown.module').then(m => m.MultiselectDropdownModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OverlayRoutingModule { }

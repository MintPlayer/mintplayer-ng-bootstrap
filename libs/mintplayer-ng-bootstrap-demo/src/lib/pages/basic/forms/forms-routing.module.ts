import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full', canActivate: [() => false] },
  { path: 'floating-labels', loadChildren: () => import('./floating-labels/floating-labels.module').then(m => m.FloatingLabelsModule) },
  { path: 'input-group', loadChildren: () => import('./input-group/input-group.module').then(m => m.InputGroupModule) },
  { path: 'range', loadChildren: () => import('./range/range.module').then(m => m.RangeModule) },
  { path: 'select', loadChildren: () => import('./select/select.module').then(m => m.SelectModule) },
  { path: 'toggle-button', loadChildren: () => import('./toggle-button/toggle-button.module').then(m => m.ToggleButtonModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormsRoutingModule { }

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Select2Component } from './select2.component';

const routes: Routes = [{ path: '', component: Select2Component }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Select2RoutingModule { }

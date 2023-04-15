import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TreeviewComponent } from './treeview.component';

const routes: Routes = [{ path: '', component: TreeviewComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TreeviewRoutingModule { }

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabControlComponent } from './tab-control.component';

const routes: Routes = [{ path: '', component: TabControlComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabControlRoutingModule { }

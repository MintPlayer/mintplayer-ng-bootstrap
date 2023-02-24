import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DockComponent } from './dock.component';

const routes: Routes = [{ path: '', component: DockComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DockRoutingModule { }

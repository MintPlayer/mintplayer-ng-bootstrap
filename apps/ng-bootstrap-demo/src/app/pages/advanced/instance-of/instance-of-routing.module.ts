import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InstanceOfComponent } from './instance-of.component';

const routes: Routes = [{ path: '', component: InstanceOfComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InstanceOfRoutingModule { }

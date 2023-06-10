import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AsyncHostBindingComponent } from './async-host-binding.component';

const routes: Routes = [{ path: '', component: AsyncHostBindingComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AsyncHostBindingRoutingModule { }

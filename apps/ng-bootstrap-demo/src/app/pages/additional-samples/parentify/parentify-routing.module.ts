import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ParentifyComponent } from './parentify.component';

const routes: Routes = [{ path: '', component: ParentifyComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ParentifyRoutingModule { }

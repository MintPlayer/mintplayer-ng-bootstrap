import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SplitStringComponent } from './split-string.component';

const routes: Routes = [{ path: '', component: SplitStringComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SplitStringRoutingModule { }

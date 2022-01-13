import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ForDirectiveComponent } from './for-directive.component';

const routes: Routes = [{ path: '', component: ForDirectiveComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ForDirectiveRoutingModule { }

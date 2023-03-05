import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SplitterComponent } from './splitter.component';

const routes: Routes = [{ path: '', component: SplitterComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SplitterRoutingModule { }

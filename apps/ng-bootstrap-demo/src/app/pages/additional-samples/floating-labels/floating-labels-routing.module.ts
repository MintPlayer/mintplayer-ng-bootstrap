import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FloatingLabelsComponent } from './floating-labels.component';

const routes: Routes = [{ path: '', component: FloatingLabelsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FloatingLabelsRoutingModule { }

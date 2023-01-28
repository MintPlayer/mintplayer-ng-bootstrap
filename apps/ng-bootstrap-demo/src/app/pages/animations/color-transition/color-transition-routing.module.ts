import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ColorTransitionComponent } from './color-transition.component';

const routes: Routes = [{ path: '', component: ColorTransitionComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ColorTransitionRoutingModule { }

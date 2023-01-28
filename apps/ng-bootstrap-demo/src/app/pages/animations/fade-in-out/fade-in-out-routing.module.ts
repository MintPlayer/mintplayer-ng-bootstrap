import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FadeInOutComponent } from './fade-in-out.component';

const routes: Routes = [{ path: '', component: FadeInOutComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FadeInOutRoutingModule { }

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ScrollspyComponent } from './scrollspy.component';

const routes: Routes = [{ path: '', component: ScrollspyComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ScrollspyRoutingModule { }

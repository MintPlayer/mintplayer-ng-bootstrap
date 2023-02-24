import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BoxResizeComponent } from './box-resize.component';

const routes: Routes = [{ path: '', component: BoxResizeComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BoxResizeRoutingModule { }

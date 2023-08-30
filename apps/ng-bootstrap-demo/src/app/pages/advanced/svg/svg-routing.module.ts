import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SvgComponent } from './svg.component';

const routes: Routes = [{ path: '', component: SvgComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SvgRoutingModule { }

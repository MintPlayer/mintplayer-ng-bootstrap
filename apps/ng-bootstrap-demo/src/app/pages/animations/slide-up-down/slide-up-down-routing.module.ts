import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SlideUpDownComponent } from './slide-up-down.component';

const routes: Routes = [{ path: '', component: SlideUpDownComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SlideUpDownRoutingModule { }

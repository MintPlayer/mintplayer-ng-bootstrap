import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FocusTrapComponent } from './focus-trap.component';

const routes: Routes = [{ path: '', component: FocusTrapComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FocusTrapRoutingModule { }

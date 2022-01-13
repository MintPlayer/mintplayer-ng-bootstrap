import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ToggleButtonComponent } from './toggle-button.component';

const routes: Routes = [{ path: '', component: ToggleButtonComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ToggleButtonRoutingModule { }

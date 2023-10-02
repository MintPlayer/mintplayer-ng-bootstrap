import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ToggleButtonsComponent } from './toggle-buttons.component';

const routes: Routes = [{ path: '', component: ToggleButtonsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ToggleButtonsRoutingModule { }

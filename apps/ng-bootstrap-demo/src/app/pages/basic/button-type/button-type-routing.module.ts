import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ButtonTypeComponent } from './button-type.component';

const routes: Routes = [{ path: '', component: ButtonTypeComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ButtonTypeRoutingModule { }

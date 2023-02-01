import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrdinalNumberComponent } from './ordinal-number.component';

const routes: Routes = [{ path: '', component: OrdinalNumberComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdinalNumberRoutingModule { }

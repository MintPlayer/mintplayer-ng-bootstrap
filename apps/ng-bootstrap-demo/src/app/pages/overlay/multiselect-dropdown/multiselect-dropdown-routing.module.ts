import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MultiselectDropdownComponent } from './multiselect-dropdown.component';

const routes: Routes = [{ path: '', component: MultiselectDropdownComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MultiselectDropdownRoutingModule { }

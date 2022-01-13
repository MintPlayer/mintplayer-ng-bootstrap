import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TypeaheadComponent } from './typeahead.component';

const routes: Routes = [{ path: '', component: TypeaheadComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TypeaheadRoutingModule { }

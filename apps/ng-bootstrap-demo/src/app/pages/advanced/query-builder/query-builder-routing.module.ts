import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QueryBuilderComponent } from './query-builder.component';

const routes: Routes = [{ path: '', component: QueryBuilderComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QueryBuilderRoutingModule { }

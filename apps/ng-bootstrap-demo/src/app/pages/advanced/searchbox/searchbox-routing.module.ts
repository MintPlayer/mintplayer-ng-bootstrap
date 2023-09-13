import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchboxComponent } from './searchbox.component';

const routes: Routes = [{ path: '', component: SearchboxComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SearchboxRoutingModule { }

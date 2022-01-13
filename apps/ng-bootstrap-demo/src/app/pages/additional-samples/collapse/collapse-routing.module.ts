import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CollapseComponent } from './collapse.component';

const routes: Routes = [{ path: '', component: CollapseComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CollapseRoutingModule { }

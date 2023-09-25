import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LinifyComponent } from './linify.component';

const routes: Routes = [{ path: '', component: LinifyComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LinifyRoutingModule { }

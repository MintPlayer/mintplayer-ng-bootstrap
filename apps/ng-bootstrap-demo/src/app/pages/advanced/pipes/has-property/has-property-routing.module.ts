import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HasPropertyComponent } from './has-property.component';

const routes: Routes = [{ path: '', component: HasPropertyComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HasPropertyRoutingModule { }
